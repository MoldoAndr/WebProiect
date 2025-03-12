# app/services/llm_service.py
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from app.db.mongodb import get_database
from app.models.llm import LLM, LLMCreate, LLMUpdate

async def get_llm(llm_id: str) -> Optional[LLM]:
    """Get an LLM by ID"""
    db = await get_database()
    try:
        llm_data = await db.llms.find_one({"_id": ObjectId(llm_id)})
    except:
        return None
    
    if not llm_data:
        return None
    
    # Convert ObjectId to str
    llm_data["id"] = str(llm_data.pop("_id"))
    
    return LLM(**llm_data)

async def get_all_llms(skip: int = 0, limit: int = 100, status: Optional[str] = None) -> List[LLM]:
    """Get all LLMs with optional filtering by status"""
    db = await get_database()
    
    # Build the query
    query = {}
    if status:
        query["status"] = status
    
    cursor = db.llms.find(query).skip(skip).limit(limit)
    
    llms = []
    async for llm_doc in cursor:
        # Convert ObjectId to str
        llm_doc["id"] = str(llm_doc.pop("_id"))
        llms.append(LLM(**llm_doc))
    
    return llms

async def create_llm(llm_data: LLMCreate) -> LLM:
    """Create a new LLM"""
    db = await get_database()
    
    # Check if an LLM with the same name already exists
    existing = await db.llms.find_one({"name": llm_data.name})
    if existing:
        raise ValueError(f"LLM with name '{llm_data.name}' already exists")
    
    now = datetime.utcnow()
    llm_doc = {
        "name": llm_data.name,
        "description": llm_data.description,
        "image": llm_data.image,
        "api_endpoint": llm_data.api_endpoint,
        "parameters": llm_data.parameters,
        "status": "active",  # Default status
        "error_message": None,
        "created_at": now,
        "updated_at": now
    }
    
    # Add container-related fields if provided
    if llm_data.environment:
        llm_doc["environment"] = llm_data.environment
    if llm_data.memory_limit:
        llm_doc["memory_limit"] = llm_data.memory
