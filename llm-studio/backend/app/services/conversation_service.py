from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
import time
import logging

from app.core.db import get_database
from app.models.conversation import Conversation, ConversationCreate, ConversationUpdate, Message
from app.services.llm_service import get_llm_by_id
from app.services.llm_manager_service import llm_manager_service

logger = logging.getLogger(__name__)

async def get_conversation(conversation_id: str) -> Optional[Conversation]:
    """Get conversation by ID with messages"""
    db = await get_database()
    
    try:
        object_id = ObjectId(conversation_id)
    except:
        logger.error(f"Invalid ObjectId format: {conversation_id}")
        return None
    logger.error("Searching for elements in the database with the ID of conversation...")
    conversation_data = await db.conversations.find_one({"_id": object_id})
    if not conversation_data:
        return None
    
    conversation_data["id"] = str(conversation_data.pop("_id"))
    
    messages = []
    cursor = db.messages.find({"conversation_id": conversation_id}).sort("created_at", 1)
    
    async for message_data in cursor:
        content["id"] = str(message_data.pop("_id"))
        messages.append(Message(**message_data))
    
    conversation_data["messages"] = messages
    
    return Conversation(**conversation_data)




async def get_user_conversations(user_id: str) -> List[Conversation]:
    """Get all conversations for a user, including all their messages."""
    db = await get_database()

    # Query conversations belonging to the user, sorted by updated_at descending.
    cursor = db.conversations.find({"user_id": user_id}).sort("updated_at", -1)
    conversations = []

    async for conv in cursor:
        # Convert the conversation _id to a string.
        conv["id"] = str(conv.pop("_id"))
        
        # Fetch all messages belonging to this conversation.
        # Here we assume messages store "conversation_id" as a string.
        messages_cursor = db.messages.find({"conversation_id": conv["id"]}).sort("created_at", 1)
        messages = []
        async for msg in messages_cursor:
            # Convert message _id to a string.
            msg["id"] = str(msg.pop("_id"))
            # Optionally, ensure conversation_id is a string too.
            if "conversation_id" in msg and isinstance(msg["conversation_id"], ObjectId):
                msg["conversation_id"] = str(msg["conversation_id"])
            messages.append(msg)
        
        conv["messages"] = messages
        
        # Optionally, compute a 'last_message' summary.
        if messages:
            last_message = messages[-1]  # Since we sort ascending, the last is the most recent.
            conv["last_message"] = {
                "role": last_message.get("role"),
                "content": last_message.get("content", "")[:100] + ("..." if len(last_message.get("content", "")) > 100 else ""),
                "created_at": last_message.get("created_at")
            }
        else:
            conv["last_message"] = None
        
        # Create a Conversation model instance from the dictionary.
        conversations.append(Conversation(**conv))
    
    return conversations


async def create_conversation(user_id: str, data: ConversationCreate) -> Conversation:
    """Create a new conversation"""
    db = await get_database()
    
    llm = await get_llm_by_id(data.llm_id)
    if not llm:
        raise ValueError(f"LLM with ID {data.llm_id} not found")
    
    now = datetime.utcnow()
    conversation_doc = {
        "user_id": user_id,
        "title": data.title,
        "llm_id": data.llm_id,
        "created_at": now,
        "updated_at": now
    }
    
    result = await db.conversations.insert_one(conversation_doc)
    conversation_id = str(result.inserted_id)
    
    try:
        await llm_manager_service.create_conversation(data.llm_id, conversation_id)
        logger.info(f"Created LLMManager conversation: {conversation_id} with model {data.llm_id}")
    except Exception as e:
        logger.error(f"Failed to create LLMManager conversation: {e}")
    
    conversation_doc["id"] = conversation_id
    conversation_doc["messages"] = []
    return Conversation(**conversation_doc)

async def update_conversation(conversation_id: str, data: ConversationUpdate) -> Optional[Conversation]:
    """Update conversation information"""
    db = await get_database()
    
    try:
        object_id = ObjectId(conversation_id)
    except:
        logger.error(f"Invalid ObjectId format: {conversation_id}")
        return None
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    if update_data:
        result = await db.conversations.update_one(
            {"_id": object_id},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            return None
    
    return await get_conversation(conversation_id)

async def delete_conversation(conversation_id: str) -> bool:
    """Delete a conversation and its messages"""
    db = await get_database()
    
    try:
        object_id = ObjectId(conversation_id)
    except:
        logger.error(f"Invalid ObjectId format: {conversation_id}")
        return False
    
    result = await db.conversations.delete_one({"_id": object_id})
    if result.deleted_count == 0:
        return False
    
    await db.messages.delete_many({"conversation_id": conversation_id})
    
    try:
        await llm_manager_service.reset_conversation(conversation_id)
    except Exception as e:
        logger.warning(f"Could not reset LLMManager conversation {conversation_id}: {e}")
    
    return True

async def add_message(conversation_id: str, role: str, content: str, metadata: Dict[str, Any] = None) -> Message:
    """Add a message to a conversation"""
    db = await get_database()
    
    try:
        print("adding message...")
        object_id = ObjectId(conversation_id)
        conversation = await db.conversations.find_one({"_id": object_id})
        if not conversation:
            raise ValueError(f"Conversation {conversation_id} not found")
    except Exception as e:
        logger.error(f"Error validating conversation: {e}")
        raise ValueError(f"Conversation validation error: {str(e)}")
    
    message_doc = {
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
        "created_at": datetime.utcnow(),
        "metadata": metadata or {}
    }
    
    result = await db.messages.insert_one(message_doc)
    message_id = str(result.inserted_id)
    
    await db.conversations.update_one(
        {"_id": object_id},
        {"$set": {"updated_at": datetime.utcnow()}}
    )
    
    message_doc["id"] = message_id
    return Message(**message_doc)

async def process_prompt(user_id: str, conversation_id: str, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
    """Process a prompt and get response from LLM using LLMManager"""
    try:
        conversation = await get_conversation(conversation_id)
        if not conversation:
            raise ValueError(f"Conversation with ID {conversation_id} not found")
        
        if conversation.user_id != user_id:
            raise ValueError("You don't have access to this conversation")
        print("in process_prompt adding message...")
        await add_message(conversation_id, "user", prompt)
        
        start_time = time.time()
        
        try:
            response_data = await llm_manager_service.send_message(conversation_id, prompt)
            response_text = response_data.get("response", "")
            
            processing_time = time.time() - start_time
            
            await add_message(conversation_id, "assistant", response_text, {
                "processing_time": processing_time
            })
            
            db = await get_database()
            messages = await db.messages.count_documents({"conversation_id": conversation_id})
            if messages <= 2:
                title_from_prompt = ' '.join(prompt.split()[:5]) + "..."
                await update_conversation(
                    conversation_id,
                    ConversationUpdate(title=title_from_prompt)
                )
            
            return {
                "response": response_text,
                "conversation_id": conversation_id,
                "processing_time": processing_time
            }
        
        except Exception as e:
            logger.error(f"Error calling LLMManager: {str(e)}")
            
            error_message = f"Error: {str(e)}"
            await add_message(conversation_id, "system", error_message, {"error": True})
            
            return {
                "response": error_message,
                "conversation_id": conversation_id,
                "error": True
            }
    except ValueError as e:
        logger.error(f"Value error in process_prompt: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in process_prompt: {str(e)}")
        raise ValueError(f"Error processing prompt: {str(e)}")