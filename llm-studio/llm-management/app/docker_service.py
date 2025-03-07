"""
Docker service module for managing LLM containers.
This service provides an interface for creating, starting, stopping,
and managing LLM containers through the Docker API.
"""

import os
import logging
import docker
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

class DockerService:
    """Service for managing LLM containers via Docker API."""
    
    def __init__(self):
        """Initialize the Docker client."""
        try:
            self.client = docker.from_env()
            logger.info("Docker client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Docker client: {str(e)}")
            raise

    def list_llm_containers(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        List all LLM containers with optional filtering.
        
        Args:
            filters: Dictionary of filters to apply
            
        Returns:
            List of container information dictionaries
        """
        base_filters = {"label": "llm-studio.type=llm"}
        if filters:
            base_filters.update(filters)
            
        try:
            containers = self.client.containers.list(all=True, filters=base_filters)
            return [self._container_to_dict(container) for container in containers]
        except Exception as e:
            logger.error(f"Error listing LLM containers: {str(e)}")
            raise

    def get_llm_container(self, container_id: str) -> Dict[str, Any]:
        """
        Get information about a specific LLM container.
        
        Args:
            container_id: ID or name of the container
            
        Returns:
            Container information dictionary
        """
        try:
            container = self.client.containers.get(container_id)
            return self._container_to_dict(container)
        except docker.errors.NotFound:
            logger.error(f"Container {container_id} not found")
            raise
        except Exception as e:
            logger.error(f"Error getting LLM container {container_id}: {str(e)}")
            raise

    def start_llm_container(self, container_id: str) -> Dict[str, Any]:
        """
        Start an LLM container.
        
        Args:
            container_id: ID or name of the container
            
        Returns:
            Updated container information
        """
        try:
            container = self.client.containers.get(container_id)
            container.start()
            return self._container_to_dict(container)
        except Exception as e:
            logger.error(f"Error starting LLM container {container_id}: {str(e)}")
            raise

    def stop_llm_container(self, container_id: str) -> Dict[str, Any]:
        """
        Stop an LLM container.
        
        Args:
            container_id: ID or name of the container
            
        Returns:
            Updated container information
        """
        try:
            container = self.client.containers.get(container_id)
            container.stop(timeout=30)
            return self._container_to_dict(container)
        except Exception as e:
            logger.error(f"Error stopping LLM container {container_id}: {str(e)}")
            raise

    def create_llm_container(self, image: str, name: str, env_vars: Dict[str, str], 
                            ports: Dict[str, int], volumes: Dict[str, Dict[str, str]], 
                            resource_limits: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new LLM container.
        
        Args:
            image: Docker image to use
            name: Name for the container
            env_vars: Environment variables
            ports: Port mappings
            volumes: Volume mappings
            resource_limits: CPU/Memory limits
            
        Returns:
            Information about the created container
        """
        try:
            # Setup container options with resource constraints
            host_config = self.client.api.create_host_config(
                mem_limit=resource_limits.get('memory', '4g'),
                cpus=resource_limits.get('cpus', 1.0),
                port_bindings=ports,
                binds=[f"{host_path}:{container_path}" for host_path, container_path in volumes.items()] if volumes else None,
                restart_policy={"Name": "unless-stopped"}
            )
            
            # Add labels to identify this as an LLM container
            labels = {
                "llm-studio.type": "llm",
                "llm-studio.name": name,
                "llm-studio.created": "true"
            }
            
            # Create the container
            container = self.client.containers.create(
                image=image,
                name=name,
                environment=env_vars,
                ports=ports,
                volumes=volumes,
                labels=labels,
                host_config=host_config
            )
            
            return self._container_to_dict(container)
        except Exception as e:
            logger.error(f"Error creating LLM container {name}: {str(e)}")
            raise

    def remove_llm_container(self, container_id: str, force: bool = False) -> bool:
        """
        Remove an LLM container.
        
        Args:
            container_id: ID or name of the container
            force: Force removal of a running container
            
        Returns:
            True if successfully removed
        """
        try:
            container = self.client.containers.get(container_id)
            container.remove(force=force)
            return True
        except Exception as e:
            logger.error(f"Error removing LLM container {container_id}: {str(e)}")
            raise

    def _container_to_dict(self, container) -> Dict[str, Any]:
        """
        Convert a Docker container object to a dictionary.
        
        Args:
            container: Docker container object
            
        Returns:
            Dictionary with container information
        """
        # Refresh container to get current state
        container.reload()
        
        # Extract basic information
        info = {
            "id": container.id,
            "short_id": container.short_id,
            "name": container.name,
            "status": container.status,
            "image": container.image.tags[0] if container.image.tags else container.image.id,
            "created": container.attrs["Created"],
            "ports": container.ports,
            "labels": container.labels,
        }
        
        # Add network information if available
        if container.attrs.get("NetworkSettings", {}).get("Networks"):
            networks = container.attrs["NetworkSettings"]["Networks"]
            info["networks"] = [{
                "name": net_name,
                "ip_address": net_info.get("IPAddress", ""),
                "gateway": net_info.get("Gateway", ""),
            } for net_name, net_info in networks.items()]
        
        return info

# Create a singleton instance
docker_service = DockerService()
