from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
from app.db.mongodb import get_database
from app.models.llm import LLM, LLMCreate, LLMUpdate

async def get_llm_by_id(llm_id: str) -> Optional[LLM]:
    """
    Get an LLM by its ID
    
    Args:
        llm_id: The ID of the LLM
        
    Returns:
        The LLM if found, None otherwise
    """
    db = await get_database()
    llm_data = await db.llms.find_one({"_id": ObjectId(llm_id)})
    
    if not llm_data:
        return None
    
    # Convert ObjectId to str
    llm_data["id"] = str(llm_data.pop("_id"))
    
    return LLM(**llm_data)

async def get_all_llms(status: Optional[str] = None) -> List[LLM]:
    """
    Get all LLMs, optionally filtered by status
    
    Args:
        status: Optional status filter
        
    Returns:
        List of LLMs
    """
    db = await get_database()
    
    # Build query
    query = {}
    if status:
        query["status"] = status
    
    # Get LLMs
    cursor = db.llms.find(query)
    llms = []
    
    async for llm_data in cursor:
        # Convert ObjectId to str
        llm_data["id"] = str(llm_data.pop("_id"))
        llms.append(LLM(**llm_data))
    
    return llms

async def create_llm(data: LLMCreate) -> LLM:
    """
    Create a new LLM
    
    Args:
        data: The LLM data
        
    Returns:
        The created LLM
    """
    db = await get_database()
    
    # Check if LLM with same name already exists
    existing = await db.llms.find_one({"name": data.name})
    if existing:
        raise ValueError(f"LLM with name '{data.name}' already exists")
    
    # Prepare LLM data
    now = datetime.utcnow()
    llm_data = {
        **data.dict(),
        "status": "active",
        "created_at": now,
        "updated_at": now
    }
    
    # Insert LLM
    result = await db.llms.insert_one(llm_data)
    llm_id = str(result.inserted_id)
    
    # Return the created LLM
    llm_data["id"] = llm_id
    return LLM(**llm_data)

async def update_llm(llm_id: str, data: LLMUpdate) -> Optional[LLM]:
    """
    Update an existing LLM
    
    Args:
        llm_id: The ID of the LLM to update
        data: The updated LLM data
        
    Returns:
        The updated LLM if found, None otherwise
    """
    db = await get_database()
    
    # Check if LLM exists
    existing = await get_llm_by_id(llm_id)
    if not existing:
        return None
    
    # Check if name is being changed and if new name is already taken
    if data.name and data.name != existing.name:
        name_check = await db.llms.find_one({"name": data.name})
        if name_check:
            raise ValueError(f"LLM with name '{data.name}' already exists")
    
    # Prepare update data excluding None values
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # Update LLM
    result = await db.llms.update_one(
        {"_id": ObjectId(llm_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        return None
    
    # Return the updated LLM
    return await get_llm_by_id(llm_id)

async def delete_llm(llm_id: str) -> bool:
    """
    Delete an LLM
    
    Args:
        llm_id: The ID of the LLM to delete
        
    Returns:
        True if deleted, False if not found
    """
    db = await get_database()
    
    # Delete LLM
    result = await db.llms.delete_one({"_id": ObjectId(llm_id)})
    
    return result.deleted_count > 0

async def get_llm_usage_stats(llm_id: str) -> Dict[str, Any]:
    """
    Get usage statistics for an LLM
    
    Args:
        llm_id: The ID of the LLM
        
    Returns:
        Dictionary with usage statistics
    """
    db = await get_database()
    
    # Check if LLM exists
    existing = await get_llm_by_id(llm_id)
    if not existing:
        raise ValueError(f"LLM with ID {llm_id} not found")
    
    # Count conversations that used this LLM
    conversation_count = await db.conversations.count_documents({"llm_id": llm_id})
    
    # Count unique users that used this LLM
    pipeline = [
        {"$match": {"llm_id": llm_id}},
        {"$group": {"_id": "$user_id"}},
        {"$count": "user_count"}
    ]
    user_count_result = await db.conversations.aggregate(pipeline).to_list(length=1)
    user_count = user_count_result[0]["user_count"] if user_count_result else 0
    
    # Count total tokens (would need to retrieve from message metadata)
    # This is a simplified approach, assuming token info is stored in message metadata
    pipeline = [
        {"$match": {"role": "assistant", "metadata.tokens": {"$exists": True}}},
        {"$group": {"_id": None, "total_tokens": {"$sum": "$metadata.tokens.total"}}}
    ]
    token_result = await db.messages.aggregate(pipeline).to_list(length=1)
    total_tokens = token_result[0]["total_tokens"] if token_result else 0
    
    # Return statistics
    return {
        "conversation_count": conversation_count,
        "unique_users": user_count,
        "total_tokens": total_tokens,
        "llm_name": existing.name
    }
