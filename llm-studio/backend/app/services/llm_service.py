from typing import Optional, List, Dict, Any
from bson import ObjectId
from app.db.mongodb import get_database
from app.models.llm import LLM, LLMCreate, LLMUpdate
from datetime import datetime
import httpx
import json
import time

async def create_llm(llm_data: LLMCreate) -> LLM:
    """Create a new LLM"""
    db = await get_database()
    
    # Prepare LLM document
    now = datetime.utcnow()
    llm_doc = {
        "name": llm_data.name,
        "description": llm_data.description,
        "image": llm_data.image,
        "api_endpoint": llm_data.api_endpoint,
        "parameters": llm_data.parameters,
        "status": "inactive",
        "created_at": now,
        "updated_at": now
    }
    
    # Add optional fields
    if llm_data.environment:
        llm_doc["environment"] = llm_data.environment
    if llm_data.memory_limit:
        llm_doc["memory_limit"] = llm_data.memory_limit
    if llm_data.cpu_limit:
        llm_doc["cpu_limit"] = llm_data.cpu_limit
    
    # Insert LLM
    result = await db.llms.insert_one(llm_doc)
    
    # Return created LLM
    return await get_llm_by_id(str(result.inserted_id))

async def get_llm_by_id(llm_id: str) -> Optional[LLM]:
    """Get an LLM by ID"""
    db = await get_database()
    llm_data = await db.llms.find_one({"_id": ObjectId(llm_id)})
    
    if not llm_data:
        return None
    
    # Convert ObjectId to str
    llm_data["id"] = str(llm_data.pop("_id"))
    
    return LLM(**llm_data)

async def get_all_llms(skip: int = 0, limit: int = 100) -> List[LLM]:
    """Get all LLMs"""
    db = await get_database()
    cursor = db.llms.find().skip(skip).limit(limit)
    llms = []
    
    async for llm_data in cursor:
        # Convert ObjectId to str
        llm_data["id"] = str(llm_data.pop("_id"))
        llms.append(LLM(**llm_data))
    
    return llms

async def update_llm(llm_id: str, llm_data: LLMUpdate) -> Optional[LLM]:
    """Update an LLM"""
    db = await get_database()
    
    # Prepare update document
    update_data = {}
    if llm_data.name is not None:
        update_data["name"] = llm_data.name
    if llm_data.description is not None:
        update_data["description"] = llm_data.description
    if llm_data.image is not None:
        update_data["image"] = llm_data.image
    if llm_data.api_endpoint is not None:
        update_data["api_endpoint"] = llm_data.api_endpoint
    if llm_data.parameters is not None:
        update_data["parameters"] = llm_data.parameters
    if llm_data.environment is not None:
        update_data["environment"] = llm_data.environment
    if llm_data.memory_limit is not None:
        update_data["memory_limit"] = llm_data.memory_limit
    if llm_data.cpu_limit is not None:
        update_data["cpu_limit"] = llm_data.cpu_limit
    if llm_data.status is not None:
        update_data["status"] = llm_data.status
    
    # Update timestamp
    update_data["updated_at"] = datetime.utcnow()
    
    if not update_data:
        return await get_llm_by_id(llm_id)
    
    # Update LLM
    result = await db.llms.update_one(
        {"_id": ObjectId(llm_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        return None
    
    # Return updated LLM
    return await get_llm_by_id(llm_id)

async def delete_llm(llm_id: str) -> bool:
    """Delete an LLM"""
    db = await get_database()
    
    # Delete LLM
    result = await db.llms.delete_one({"_id": ObjectId(llm_id)})
    
    return result.deleted_count > 0

async def send_prompt_to_llm(llm_id: str, prompt: str, system_prompt: Optional[str] = None, parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Send a prompt to an LLM and get a response"""
    # Get LLM
    llm = await get_llm_by_id(llm_id)
    if not llm:
        raise ValueError(f"LLM with ID {llm_id} not found")
    
    if llm.status != "active":
        raise ValueError(f"LLM {llm.name} is not active")
    
    # Merge default parameters with provided parameters
    merged_parameters = llm.parameters.copy()
    if parameters:
        merged_parameters.update(parameters)
    
    # Create request payload
    payload = {
        "prompt": prompt,
        "parameters": merged_parameters
    }
    
    if system_prompt:
        payload["system_prompt"] = system_prompt
    
    # Track processing time
    start_time = time.time()
    
    # Send request to LLM
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                llm.api_endpoint,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            # Parse response
            response_data = response.json()
            
            # Calculate processing time
            processing_time = time.time() - start_time
            
            # Create result
            result = {
                "response": response_data.get("text", response_data.get("response", "")),
                "processing_time": processing_time,
                "tokens": response_data.get("usage", {})
            }
            
            return result
            
    except httpx.HTTPStatusError as e:
        raise ValueError(f"HTTP error occurred while contacting LLM: {e}")
    except httpx.RequestError as e:
        raise ValueError(f"Error occurred while sending request to LLM: {e}")
    except (json.JSONDecodeError, KeyError) as e:
        raise ValueError(f"Error parsing response from LLM: {e}")

async def get_active_llms() -> List[LLM]:
    """Get all active LLMs"""
    db = await get_database()
    cursor = db.llms.find({"status": "active"})
    llms = []
    
    async for llm_data in cursor:
        # Convert ObjectId to str
        llm_data["id"] = str(llm_data.pop("_id"))
        llms.append(LLM(**llm_data))
    
    return llms

async def activate_llm(llm_id: str) -> Optional[LLM]:
    """Activate an LLM"""
    return await update_llm(llm_id, LLMUpdate(status="active"))

async def deactivate_llm(llm_id: str) -> Optional[LLM]:
    """Deactivate an LLM"""
    return await update_llm(llm_id, LLMUpdate(status="inactive"))
