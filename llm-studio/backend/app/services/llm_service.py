from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
import httpx
import time
import logging
import asyncio
from app.core.db import get_database
from app.models.llm import LLM, LLMCreate, LLMUpdate
from app.core.config import settings

logger = logging.getLogger(__name__)

async def get_llm_by_id(llm_id: str) -> Optional[LLM]:
    """Get LLM by ID"""
    db = await get_database()
    
    try:
        llm_data = await db.llms.find_one({"_id": llm_id})
        
        if not llm_data and len(llm_id) == 24 and all(c in '0123456789abcdef' for c in llm_id.lower()):
            llm_data = await db.llms.find_one({"_id": ObjectId(llm_id)})
    except Exception as e:
        logger.error(f"Error retrieving LLM: {e}")
        return None
    
    if not llm_data:
        return None
    
    if isinstance(llm_data.get("_id"), ObjectId):
        llm_data["id"] = str(llm_data.pop("_id"))
    else:
        llm_data["id"] = llm_data.pop("_id")
    
    return LLM(**llm_data)
async def get_all_llms(active_only: bool = False) -> List[LLM]:
    """Get all LLMs"""
    db = await get_database()
    
    filter_query = {"status": "active"} if active_only else {}
    
    cursor = db.llms.find(filter_query)
    llms = []
    
    async for llm_data in cursor:
        llm_data["id"] = str(llm_data.pop("_id"))
        llms.append(LLM(**llm_data))
    
    return llms

async def create_llm(llm_data: LLMCreate) -> LLM:
    """Create a new LLM"""
    db = await get_database()
    
    existing = await db.llms.find_one({"name": llm_data.name})
    if existing:
        raise ValueError(f"LLM with name '{llm_data.name}' already exists")
    
    now = datetime.utcnow()
    llm_doc = {
        **llm_data.dict(),
        "status": "active",
        "created_at": now,
        "updated_at": now
    }
    
    result = await db.llms.insert_one(llm_doc)
    llm_id = str(result.inserted_id)
    
    llm_doc["id"] = llm_id
    return LLM(**llm_doc)

async def update_llm(llm_id: str, llm_data: LLMUpdate) -> Optional[LLM]:
    """Update LLM information"""
    db = await get_database()
    
    existing = await get_llm_by_id(llm_id)
    if not existing:
        return None
    
    update_data = {k: v for k, v in llm_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    if update_data:
        await db.llms.update_one(
            {"_id": ObjectId(llm_id)},
            {"$set": update_data}
        )
    
    return await get_llm_by_id(llm_id)

async def delete_llm(llm_id: str) -> bool:
    """Delete an LLM"""
    db = await get_database()
    result = await db.llms.delete_one({"_id": ObjectId(llm_id)})
    return result.deleted_count > 0

async def call_llm_api(llm: LLM, prompt: str, system_prompt: Optional[str] = None) -> str:
    """Call LLM API to get a response"""
    start_time = time.time()
    
    try:
        request_data = {
            "prompt": prompt,
            "system_prompt": system_prompt or settings.DEFAULT_SYSTEM_PROMPT
        }
        
        if llm.parameters:
            request_data.update(llm.parameters)
        
        if not settings.PRODUCTION:
            await asyncio.sleep(1)
            return f"This is a simulated response from {llm.name}. In a real application, this would be an actual response from the LLM API based on your prompt: '{prompt[:50]}...'"
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                llm.api_endpoint,
                json=request_data
            )
            
            response.raise_for_status()
            data = response.json()
            
            return data.get("response", data.get("text", data.get("output", "")))
            
    except Exception as e:
        logger.error(f"Error calling LLM API: {str(e)}")
        return f"Error: Failed to get response from LLM. {str(e)}"

