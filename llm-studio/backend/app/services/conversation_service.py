from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
import time

from app.core.db import get_database
from app.models.conversation import Conversation, ConversationCreate, ConversationUpdate, Message, PromptRequest
from app.services.llm_service import get_llm_by_id, call_llm_api

async def get_conversation(conversation_id: str) -> Optional[Conversation]:
    """Get conversation by ID with messages"""
    db = await get_database()
    
    # Get conversation
    conversation_data = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    if not conversation_data:
        return None
    
    # Convert ObjectId to str
    conversation_data["id"] = str(conversation_data.pop("_id"))
    
    # Get messages for this conversation
    messages = []
    cursor = db.messages.find({"conversation_id": conversation_id}).sort("created_at", 1)
    
    async for message_data in cursor:
        message_data["id"] = str(message_data.pop("_id"))
        messages.append(Message(**message_data))
    
    # Add messages to conversation
    conversation_data["messages"] = messages
    
    return Conversation(**conversation_data)

async def get_user_conversations(user_id: str) -> List[Conversation]:
    """Get all conversations for a user"""
    db = await get_database()
    
    # Get conversations
    cursor = db.conversations.find({"user_id": user_id}).sort("updated_at", -1)
    conversations = []
    
    async for conversation_data in cursor:
        conversation_data["id"] = str(conversation_data.pop("_id"))
        
        # Get messages count instead of full messages for efficiency
        message_count = await db.messages.count_documents({"conversation_id": conversation_data["id"]})
        
        # Get last message for preview
        if message_count > 0:
            last_message = await db.messages.find_one(
                {"conversation_id": conversation_data["id"]},
                sort=[("created_at", -1)]
            )
            if last_message:
                conversation_data["last_message"] = {
                    "role": last_message["role"],
                    "content": last_message["content"][:100] + ("..." if len(last_message["content"]) > 100 else ""),
                    "created_at": last_message["created_at"]
                }
        
        # Create conversation object with empty messages list
        conversation_data["messages"] = []
        conversations.append(Conversation(**conversation_data))
    
    return conversations

async def create_conversation(user_id: str, data: ConversationCreate) -> Conversation:
    """Create a new conversation"""
    db = await get_database()
    
    # Check if LLM exists
    llm = await get_llm_by_id(data.llm_id)
    if not llm:
        raise ValueError(f"LLM with ID {data.llm_id} not found")
    
    # Create conversation
    now = datetime.utcnow()
    conversation_doc = {
        "user_id": user_id,
        "title": data.title,
        "llm_id": data.llm_id,
        "created_at": now,
        "updated_at": now
    }
    
    # Insert into database
    result = await db.conversations.insert_one(conversation_doc)
    conversation_id = str(result.inserted_id)
    
    # Return created conversation
    conversation_doc["id"] = conversation_id
    conversation_doc["messages"] = []
    return Conversation(**conversation_doc)

async def update_conversation(conversation_id: str, data: ConversationUpdate) -> Optional[Conversation]:
    """Update conversation information"""
    db = await get_database()
    
    # Prepare update data
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # Update conversation
    if update_data:
        await db.conversations.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$set": update_data}
        )
    
    # Return updated conversation
    return await get_conversation(conversation_id)

async def delete_conversation(conversation_id: str) -> bool:
    """Delete a conversation and its messages"""
    db = await get_database()
    
    # Delete conversation
    result = await db.conversations.delete_one({"_id": ObjectId(conversation_id)})
    if result.deleted_count == 0:
        return False
    
    # Delete all messages in the conversation
    await db.messages.delete_many({"conversation_id": conversation_id})
    
    return True

async def add_message(conversation_id: str, role: str, content: str) -> Message:
    """Add a message to a conversation"""
    db = await get_database()
    
    # Create message document
    message_doc = {
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
        "created_at": datetime.utcnow()
    }
    
    # Insert into database
    result = await db.messages.insert_one(message_doc)
    message_id = str(result.inserted_id)
    
    # Update conversation's updated_at timestamp
    await db.conversations.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": {"updated_at": datetime.utcnow()}}
    )
    
    # Return created message
    message_doc["id"] = message_id
    return Message(**message_doc)

async def process_prompt(user_id: str, prompt_request: PromptRequest) -> Dict[str, Any]:
    """Process a prompt and get response from LLM"""
    conversation_id = prompt_request.conversation_id
    
    # Get or create conversation
    if conversation_id:
        conversation = await get_conversation(conversation_id)
        if not conversation:
            raise ValueError(f"Conversation with ID {conversation_id} not found")
        
        # Check if user owns this conversation
        if conversation.user_id != user_id:
            raise ValueError("You don't have access to this conversation")
    else:
        # Create new conversation
        title = prompt_request.prompt[:30] + "..." if len(prompt_request.prompt) > 30 else prompt_request.prompt
        conversation = await create_conversation(
            user_id, 
            ConversationCreate(
                title=title,
                llm_id=prompt_request.llm_id
            )
        )
        conversation_id = conversation.id
    
    # Get LLM
    llm = await get_llm_by_id(prompt_request.llm_id)
    if not llm:
        raise ValueError(f"LLM with ID {prompt_request.llm_id} not found")
    
    # Add user message
    await add_message(conversation_id, "user", prompt_request.prompt)
    
    # Get response from LLM
    start_time = time.time()
    response_text = await call_llm_api(llm, prompt_request.prompt, prompt_request.system_prompt)
    processing_time = time.time() - start_time
    
    # Add assistant message
    await add_message(conversation_id, "assistant", response_text)
    
    # Return response
    return {
        "response": response_text,
        "conversation_id": conversation_id,
        "processing_time": processing_time
    }
