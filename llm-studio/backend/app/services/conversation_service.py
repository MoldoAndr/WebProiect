from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from app.db.mongodb import get_database
from app.models.conversation import Message, Conversation, ConversationCreate, ConversationUpdate

async def get_conversation(conversation_id: str) -> Optional[Conversation]:
    """
    Retrieve a conversation by its ID
    
    Args:
        conversation_id: The ID of the conversation to retrieve
        
    Returns:
        The conversation if found, None otherwise
    """
    db = await get_database()
    conversation_data = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    
    if not conversation_data:
        return None
    
    # Convert ObjectId to str for the conversation
    conversation_data["id"] = str(conversation_data.pop("_id"))
    
    # Get the messages for this conversation
    messages_cursor = db.messages.find({"conversation_id": conversation_id}).sort("created_at", 1)
    messages = []
    
    async for message_data in messages_cursor:
        # Convert ObjectId to str for each message
        message_data["id"] = str(message_data.pop("_id"))
        messages.append(Message(**message_data))
    
    # Add messages to conversation data
    conversation_data["messages"] = messages
    
    return Conversation(**conversation_data)

async def add_message_to_conversation(
    conversation_id: str, 
    role: str, 
    content: str,
    metadata: Optional[dict] = None
) -> Message:
    """
    Add a new message to an existing conversation
    
    Args:
        conversation_id: The ID of the conversation
        role: The role of the message sender (user, assistant)
        content: The message content
        metadata: Optional metadata for the message
        
    Returns:
        The created message
    """
    db = await get_database()
    
    # Check if conversation exists
    conversation = await get_conversation(conversation_id)
    if not conversation:
        raise ValueError(f"Conversation with ID {conversation_id} not found")
    
    # Create message
    message_data = {
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
        "created_at": datetime.utcnow(),
        "metadata": metadata or {}
    }
    
    # Insert message into database
    result = await db.messages.insert_one(message_data)
    message_id = str(result.inserted_id)
    
    # Update conversation's updated_at timestamp
    await db.conversations.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": {"updated_at": datetime.utcnow()}}
    )
    
    # Return the created message
    message_data["id"] = message_id
    return Message(**message_data)

async def create_conversation(user_id: str, data: ConversationCreate) -> Conversation:
    """
    Create a new conversation
    
    Args:
        user_id: The ID of the user creating the conversation
        data: The conversation data
        
    Returns:
        The created conversation
    """
    db = await get_database()
    
    now = datetime.utcnow()
    conversation_data = {
        "user_id": user_id,
        "llm_id": data.llm_id,
        "title": data.title,
        "messages": [],
        "created_at": now,
        "updated_at": now
    }
    
    result = await db.conversations.insert_one(conversation_data)
    conversation_id = str(result.inserted_id)
    
    # Return the created conversation
    conversation_data["id"] = conversation_id
    return Conversation(**conversation_data)

async def update_conversation(conversation_id: str, data: ConversationUpdate) -> Optional[Conversation]:
    """
    Update an existing conversation
    
    Args:
        conversation_id: The ID of the conversation to update
        data: The updated conversation data
        
    Returns:
        The updated conversation if found, None otherwise
    """
    db = await get_database()
    
    # Prepare update data excluding None values
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # Update conversation
    result = await db.conversations.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        return None
    
    # Return the updated conversation
    return await get_conversation(conversation_id)

async def get_user_conversations(user_id: str) -> List[Conversation]:
    """
    Get all conversations for a user
    
    Args:
        user_id: The ID of the user
        
    Returns:
        List of conversations
    """
    db = await get_database()
    
    # Get conversations
    cursor = db.conversations.find({"user_id": user_id}).sort("updated_at", -1)
    conversations = []
    
    async for conversation_data in cursor:
        # Convert ObjectId to str
        conversation_data["id"] = str(conversation_data.pop("_id"))
        
        # Get messages for this conversation
        messages_cursor = db.messages.find({"conversation_id": conversation_data["id"]}).sort("created_at", 1)
        messages = []
        
        async for message_data in messages_cursor:
            message_data["id"] = str(message_data.pop("_id"))
            messages.append(Message(**message_data))
        
        conversation_data["messages"] = messages
        conversations.append(Conversation(**conversation_data))
    
    return conversations

async def delete_conversation(conversation_id: str) -> bool:
    """
    Delete a conversation and its messages
    
    Args:
        conversation_id: The ID of the conversation to delete
        
    Returns:
        True if deleted, False if not found
    """
    db = await get_database()
    
    # Delete conversation
    result = await db.conversations.delete_one({"_id": ObjectId(conversation_id)})
    
    if result.deleted_count == 0:
        return False
    
    # Delete related messages
    await db.messages.delete_many({"conversation_id": conversation_id})
    
    return True
