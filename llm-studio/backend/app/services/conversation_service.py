from typing import Optional, List, Dict, Any
from bson import ObjectId
from app.db.mongodb import get_database
from app.models.conversation import Conversation, ConversationCreate, ConversationUpdate, Message
from datetime import datetime

async def create_conversation(conversation_data: ConversationCreate, user_id: str) -> Conversation:
    """Create a new conversation"""
    db = await get_database()
    
    # Prepare conversation document
    now = datetime.utcnow()
    conversation_doc = {
        "title": conversation_data.title,
        "llm_id": conversation_data.llm_id,
        "user_id": user_id,
        "messages": [],
        "created_at": now,
        "updated_at": now
    }
    
    # Insert conversation
    result = await db.conversations.insert_one(conversation_doc)
    
    # Return created conversation
    return await get_conversation_by_id(str(result.inserted_id))

async def get_conversation_by_id(conversation_id: str) -> Optional[Conversation]:
    """Get a conversation by ID"""
    db = await get_database()
    conversation_data = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    
    if not conversation_data:
        return None
    
    # Convert ObjectId to str
    conversation_data["id"] = str(conversation_data.pop("_id"))
    
    # Convert message ObjectIds to str
    for message in conversation_data.get("messages", []):
        if "_id" in message:
            message["id"] = str(message.pop("_id"))
    
    return Conversation(**conversation_data)

async def get_user_conversations(user_id: str, skip: int = 0, limit: int = 100) -> List[Conversation]:
    """Get all conversations for a user"""
    db = await get_database()
    cursor = db.conversations.find({"user_id": user_id}).sort("updated_at", -1).skip(skip).limit(limit)
    conversations = []
    
    async for conversation_data in cursor:
        # Convert ObjectId to str
        conversation_data["id"] = str(conversation_data.pop("_id"))
        
        # Convert message ObjectIds to str
        for message in conversation_data.get("messages", []):
            if "_id" in message:
                message["id"] = str(message.pop("_id"))
        
        conversations.append(Conversation(**conversation_data))
    
    return conversations

async def update_conversation(conversation_id: str, conversation_data: ConversationUpdate) -> Optional[Conversation]:
    """Update a conversation"""
    db = await get_database()
    
    # Prepare update document
    update_data = {}
    if conversation_data.title is not None:
        update_data["title"] = conversation_data.title
    if conversation_data.llm_id is not None:
        update_data["llm_id"] = conversation_data.llm_id
    
    # Update timestamp
    update_data["updated_at"] = datetime.utcnow()
    
    if not update_data:
        return await get_conversation_by_id(conversation_id)
    
    # Update conversation
    result = await db.conversations.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        return None
    
    # Return updated conversation
    return await get_conversation_by_id(conversation_id)

async def delete_conversation(conversation_id: str) -> bool:
    """Delete a conversation"""
    db = await get_database()
    
    # Delete conversation
    result = await db.conversations.delete_one({"_id": ObjectId(conversation_id)})
    
    return result.deleted_count > 0

async def add_message(conversation_id: str, role: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> Optional[Conversation]:
    """Add a message to a conversation"""
    db = await get_database()
    
    # Create message
    now = datetime.utcnow()
    message = {
        "_id": ObjectId(),
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
        "created_at": now,
        "metadata": metadata or {}
    }
    
    # Add message to conversation
    result = await db.conversations.update_one(
        {"_id": ObjectId(conversation_id)},
        {
            "$push": {"messages": message},
            "$set": {"updated_at": now}
        }
    )
    
    if result.modified_count == 0:
        return None
    
    # Return updated conversation
    return await get_conversation_by_id(conversation_id)

async def get_user_conversation_count(user_id: str) -> int:
    """Get the count of conversations for a user"""
    db = await get_database()
    count = await db.conversations.count_documents({"user_id": user_id})
    return count

async def get_user_message_count(user_id: str) -> int:
    """Get the count of messages for a user across all conversations"""
    db = await get_database()
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$project": {"message_count": {"$size": {"$ifNull": ["$messages", []]}}}},
        {"$group": {"_id": None, "total": {"$sum": "$message_count"}}}
    ]
    
    result = await db.conversations.aggregate(pipeline).to_list(length=1)
    
    if not result:
        return 0
    
    return result[0]["total"]
