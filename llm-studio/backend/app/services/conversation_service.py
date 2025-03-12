# app/services/conversation_service.py
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from app.db.mongodb import get_database
from app.models.conversation import Conversation, ConversationCreate, ConversationUpdate, Message

async def create_conversation(user_id: str, data: ConversationCreate) -> Conversation:
    """Create a new conversation for a user"""
    db = await get_database()
    
    now = datetime.utcnow()
    conversation_doc = {
        "user_id": user_id,
        "llm_id": data.llm_id,
        "title": data.title,
        "messages": [],
        "created_at": now,
        "updated_at": now
    }
    
    result = await db.conversations.insert_one(conversation_doc)
    
    return await get_conversation(str(result.inserted_id))

async def get_conversation(conversation_id: str) -> Optional[Conversation]:
    """Get a conversation by ID"""
    db = await get_database()
    try:
        conversation_data = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    except:
        return None
    
    if not conversation_data:
        return None
    
    # Convert ObjectId to str
    conversation_data["id"] = str(conversation_data.pop("_id"))
    
    # Get messages for this conversation
    messages = []
    cursor = db.messages.find({"conversation_id": conversation_id}).sort("created_at", 1)
    
    async for message_doc in cursor:
        # Convert ObjectId to str
        message_doc["id"] = str(message_doc.pop("_id"))
        messages.append(Message(**message_doc))
    
    conversation_data["messages"] = messages
    
    return Conversation(**conversation_data)

async def get_conversations_by_user(user_id: str, skip: int = 0, limit: int = 100) -> List[Conversation]:
    """Get all conversations for a user with pagination"""
    db = await get_database()
    
    cursor = db.conversations.find({"user_id": user_id}).sort("updated_at", -1).skip(skip).limit(limit)
    
    conversations = []
    async for conversation_doc in cursor:
        # Convert ObjectId to str
        conversation_doc["id"] = str(conversation_doc.pop("_id"))
        
        # We don't need to load messages here to keep the list response light
        conversation_doc["messages"] = []
        
        conversations.append(Conversation(**conversation_doc))
    
    return conversations

async def update_conversation(conversation_id: str, data: ConversationUpdate) -> Optional[Conversation]:
    """Update a conversation"""
    db = await get_database()
    
    # Prepare update document
    update_data = data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    # Update the conversation
    await db.conversations.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": update_data}
    )
    
    return await get_conversation(conversation_id)

async def delete_conversation(conversation_id: str) -> bool:
    """Delete a conversation and all its messages"""
    db = await get_database()
    
    try:
        # Delete all messages in the conversation
        await db.messages.delete_many({"conversation_id": conversation_id})
        
        # Delete the conversation
        result = await db.conversations.delete_one({"_id": ObjectId(conversation_id)})
        
        return result.deleted_count > 0
    except:
        return False

async def add_message_to_conversation(
    conversation_id: str, 
    role: str, 
    content: str,
    metadata: Optional[dict] = None
) -> Message:
    """Add a new message to a conversation"""
    db = await get_database()
    
    now = datetime.utcnow()
    message_doc = {
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
        "created_at": now,
        "metadata": metadata or {}
    }
    
    # Insert the message
    result = await db.messages.insert_one(message_doc)
    
    # Update conversation's updated_at timestamp
    await db.conversations.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": {"updated_at": now}}
    )
    
    # Return the created message
    message_doc["id"] = str(result.inserted_id)
    return Message(**message_doc)
