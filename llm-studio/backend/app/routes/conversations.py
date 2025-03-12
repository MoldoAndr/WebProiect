# app/api/routes/conversations.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional

from app.models.conversation import Conversation, ConversationCreate, ConversationUpdate, ConversationResponse
from app.models.prompt import PromptRequest, PromptResponse
from app.core.security import get_current_user
from app.services.conversation_service import (
    create_conversation, 
    get_conversations_by_user, 
    get_conversation, 
    update_conversation,
    delete_conversation
)
from app.services.prompt_service import send_prompt

router = APIRouter()

@router.post("/", response_model=ConversationResponse)
async def create_new_conversation(
    conversation_data: ConversationCreate,
    current_user = Depends(get_current_user)
):
    """Create a new conversation"""
    return await create_conversation(current_user.id, conversation_data)

@router.get("/", response_model=List[ConversationResponse])
async def list_conversations(
    current_user = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
):
    """Get user's conversations with pagination"""
    return await get_conversations_by_user(current_user.id, skip, limit)

@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation_by_id(
    conversation_id: str,
    current_user = Depends(get_current_user)
):
    """Get a specific conversation by ID"""
    conversation = await get_conversation(conversation_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Check if user owns this conversation
    if conversation.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    
    return conversation

@router.put("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation_by_id(
    conversation_id: str,
    conversation_update: ConversationUpdate,
    current_user = Depends(get_current_user)
):
    """Update a conversation"""
    # Check if conversation exists and user owns it
    conversation = await get_conversation(conversation_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if conversation.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    
    # Update the conversation
    return await update_conversation(conversation_id, conversation_update)

@router.delete("/{conversation_id}")
async def delete_conversation_by_id(
    conversation_id: str,
    current_user = Depends(get_current_user)
):
    """Delete a conversation"""
    # Check if conversation exists and user owns it
    conversation = await get_conversation(conversation_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if conversation.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    
    # Delete the conversation
    success = await delete_conversation(conversation_id)
    if success:
        return {"message": "Conversation successfully deleted"}
    else:
        raise HTTPException(status_code=500, detail="Failed to delete conversation")

@router.post("/{conversation_id}/prompt", response_model=PromptResponse)
async def send_prompt_to_llm(
    conversation_id: str,
    prompt_request: PromptRequest,
    current_user = Depends(get_current_user)
):
    """Send a prompt to an LLM within a conversation"""
    # Check if conversation exists and user owns it
    conversation = await get_conversation(conversation_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if conversation.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    
    # Set the conversation ID in the prompt request
    prompt_request.conversation_id = conversation_id
    
    # Send the prompt to the LLM
    return await send_prompt(prompt_request)
