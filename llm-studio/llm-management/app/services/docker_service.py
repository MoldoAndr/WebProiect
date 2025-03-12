"""
Docker service module for managing LLM containers.
This service provides an interface for creating, starting, stopping,
and managing LLM containers through the Docker API.
"""

import os
import logging
import aiodocker
import json
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
from bson import ObjectId

from app.db.mongodb import get_database
from app.models.llm import LLM, LLMCreate, LLMUpdate
from app.models.prompt import PromptResponse

logger = logging.getLogger(__name__)

class DockerService:
    """Service for managing LLM containers via aiodocker API."""
    
    def __init__(self):
        """Initialize the Docker client."""
        self.docker = None
        self.is_initialized = False

    async def init_docker_client(self):
        """Initialize the Docker client."""
        if not self.is_initialized:
            try:
                self.docker = aiodocker.Docker()
                self.is_initialized = True
                logger.info("Docker client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Docker client: {str(e)}")
                raise

    async def close_docker_client(self):
        """Close the Docker client."""
        if self.docker:
            await self.docker.close()
            self.is_initialized = False
            logger.info("Docker client closed")

    async def get_all_llms(self) -> List[LLM]:
        """
        Get all LLMs from the database.
        
        Returns:
            List of LLM objects
        """
        db = await get_database()
        if not db:
            logger.error("Database connection not available")
            return []

        llms = []
        async for llm_data in db.llms.find():
            # Convert ObjectId to string
            llm_data["id"] = str(llm_data.pop("_id"))
            llms.append(LLM(**llm_data))
        
        return llms

    async def get_llm_by_id(self, llm_id: str) -> Optional[LLM]:
        """
        Get a specific LLM by ID from the database.
        
        Args:
            llm_id: The ID of the LLM to retrieve
            
        Returns:
            LLM object if found, None otherwise
        """
        db = await get_database()
        if not db:
            logger.error("Database connection not available")
            return None

        try:
            llm_data = await db.llms.find_one({"_id": ObjectId(llm_id)})
            if not llm_data:
                return None
            
            # Convert ObjectId to string
            llm_data["id"] = str(llm_data.pop("_id"))
            return LLM(**llm_data)
        except Exception as e:
            logger.error(f"Error retrieving LLM with ID {llm_id}: {str(e)}")
            return None

    async def create_llm(self, llm_in: LLMCreate) -> LLM:
        """
        Create a new LLM entry in the database and optionally start a container.
        
        Args:
            llm_in: LLM creation data
            
        Returns:
            The created LLM object
        """
        db = await get_database()
        if not db:
            logger.error("Database connection not available")
            raise Exception("Database connection not available")

        # Check if LLM with this name already exists
        existing_llm = await db.llms.find_one({"name": llm_in.name})
        if existing_llm:
            raise Exception(f"LLM with name '{llm_in.name}' already exists")

        # Prepare container configuration
        container_config = {
            "Image": llm_in.image,
            "Env": [f"{k}={v}" for k, v in (llm_in.environment or {}).items()],
            "ExposedPorts": {"8000/tcp": {}},
            "HostConfig": {
                "PortBindings": {"8000/tcp": [{"HostPort": "0"}]},  # Let Docker assign a port
                "RestartPolicy": {"Name": "unless-stopped"},
            },
            "Labels": {
                "llm-studio.type": "llm",
                "llm-studio.name": llm_in.name,
            }
        }

        # Add resource limits if specified
        if llm_in.memory_limit:
            container_config["HostConfig"]["Memory"] = llm_in.memory_limit
        if llm_in.cpu_limit:
            container_config["HostConfig"]["NanoCpus"] = int(llm_in.cpu_limit * 1e9)

        container_id = None
        host_port = None

        try:
            # Create and start the container
            container = await self.docker.containers.create(config=container_config, name=f"llm-{llm_in.name.lower()}")
            container_id = container.id
            await container.start()
            
            # Get the assigned host port
            container_info = await container.show()
            if container_info["NetworkSettings"]["Ports"]["8000/tcp"]:
                host_port = container_info["NetworkSettings"]["Ports"]["8000/tcp"][0]["HostPort"]

        except Exception as e:
            logger.error(f"Error creating/starting container: {str(e)}")
            if container_id:
                try:
                    container = await self.docker.containers.get(container_id)
                    await container.delete(force=True)
                except:
                    pass
            # Continue with database entry even if container fails

        # Create database entry
        now = datetime.utcnow()
        llm_data = {
            "name": llm_in.name,
            "description": llm_in.description,
            "image": llm_in.image,
            "api_endpoint": llm_in.api_endpoint,
            "parameters": llm_in.parameters or {},
            "container_id": container_id,
            "host_port": host_port,
            "status": "active" if container_id else "error",
            "error_message": None if container_id else "Failed to start container",
            "created_at": now,
            "updated_at": now
        }

        result = await db.llms.insert_one(llm_data)
        llm_id = result.inserted_id
        
        # Return the created LLM
        llm_data["id"] = str(llm_id)
        return LLM(**llm_data)

    async def update_llm(self, llm_id: str, llm_in: LLMUpdate) -> Optional[LLM]:
        """
        Update an existing LLM.
        
        Args:
            llm_id: The ID of the LLM to update
            llm_in: LLM update data
            
        Returns:
            The updated LLM if found, None otherwise
        """
        db = await get_database()
        if not db:
            logger.error("Database connection not available")
            return None

        # Check if LLM exists
        llm = await self.get_llm_by_id(llm_id)
        if not llm:
            return None

        # Prepare update data
        update_data = {k: v for k, v in llm_in.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()

        # If status is being updated, handle container accordingly
        if "status" in update_data:
            status = update_data["status"]
            if llm.container_id:
                try:
                    container = await self.docker.containers.get(llm.container_id)
                    
                    if status == "active" and llm.status != "active":
                        # Start container if not already running
                        container_info = await container.show()
                        if container_info["State"]["Status"] != "running":
                            await container.start()
                    
                    elif status == "inactive" and llm.status != "inactive":
                        # Stop container if running
                        container_info = await container.show()
                        if container_info["State"]["Status"] == "running":
                            await container.stop()
                
                except Exception as e:
                    logger.error(f"Error updating container status: {str(e)}")
                    # Continue with database update even if container operation fails

        # Update database entry
        result = await db.llms.update_one(
            {"_id": ObjectId(llm_id)},
            {"$set": update_data}
        )

        if result.modified_count == 0:
            logger.warning(f"No changes made to LLM with ID {llm_id}")
        
        # Return the updated LLM
        return await self.get_llm_by_id(llm_id)

    async def delete_llm(self, llm_id: str) -> bool:
        """
        Delete an LLM and its container if it exists.
        
        Args:
            llm_id: The ID of the LLM to delete
            
        Returns:
            True if deleted, False if not found
        """
        db = await get_database()
        if not db:
            logger.error("Database connection not available")
            return False

        # Check if LLM exists
        llm = await self.get_llm_by_id(llm_id)
        if not llm:
            return False

        # Remove container if it exists
        if llm.container_id:
            try:
                container = await self.docker.containers.get(llm.container_id)
                await container.stop()
                await container.delete(force=True)
                logger.info(f"Deleted container for LLM {llm.name}")
            except Exception as e:
                logger.error(f"Error deleting container: {str(e)}")
                # Continue with database deletion even if container deletion fails

        # Delete from database
        result = await db.llms.delete_one({"_id": ObjectId(llm_id)})
        
        return result.deleted_count > 0

    async def send_prompt_to_llm(self, 
                                llm_id: str, 
                                prompt: str, 
                                conversation_id: Optional[str] = None,
                                system_prompt: Optional[str] = None,
                                parameters: Optional[Dict[str, Any]] = None) -> PromptResponse:
        """
        Send a prompt to an LLM and get the response.
        
        Args:
            llm_id: The ID of the LLM to use
            prompt: The prompt text
            conversation_id: Optional conversation ID for context
            system_prompt: Optional system prompt
            parameters: Optional model parameters
            
        Returns:
            The LLM's response
        """
        # Get LLM information
        llm = await self.get_llm_by_id(llm_id)
        if not llm:
            raise Exception(f"LLM with ID {llm_id} not found")
        
        if llm.status != "active":
            raise Exception(f"LLM {llm.name} is not active")
        
        # Create a basic mock response for testing until real implementation is complete
        # In production, this would make an API call to the LLM container
        start_time = time.time()
        
        # Simulate processing time
        await aiodocker.utils.sleep(1)
        
        # Create a mock response
        mock_response = f"This is a mock response from {llm.name} for prompt: '{prompt[:50]}...' "
        if conversation_id:
            mock_response += f"(conversation: {conversation_id})"
        
        processing_time = time.time() - start_time
        
        # Create response object
        response = PromptResponse(
            response=mock_response,
            conversation_id=conversation_id or "new_conversation_id",
            processing_time=processing_time,
            tokens={
                "prompt": len(prompt) // 4,  # Rough approximation
                "completion": len(mock_response) // 4,
                "total": (len(prompt) + len(mock_response)) // 4
            }
        )
        
        return response

    async def init_docker_client(self):
        """Initialize Docker client."""
        try:
            self.docker = aiodocker.Docker()
            logger.info("Docker client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Docker client: {str(e)}")
            raise

    async def close_docker_client(self):
        """Close Docker client."""
        if self.docker:
            await self.docker.close()
            logger.info("Docker client closed")

# Create a singleton instance
docker_service = DockerService()
