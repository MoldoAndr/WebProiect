from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from typing import List, Optional
from pydantic import BaseModel

from app.models.user import User
from app.models.conversation import Conversation, ConversationCreate, ConversationUpdate
from app.models.prompt import PromptRequest, PromptResponse
from app.core.security import get_current_user, get_current_user_ws
from app.core.websocket import connection_manager
from app.services.conversation_service import (
    get_conversation,
    get_user_conversations,
    create_conversation,
    update_conversation,
    delete_conversation,
    process_prompt
)

router = APIRouter()

@router.get("", response_model=List[Conversation])
async def get_conversations(current_user: User = Depends(get_current_user)):
    """Get all conversations for the current user"""
    return await get_user_conversations(current_user.id)

@router.post("", response_model=Conversation)
async def create_new_conversation(
    data: ConversationCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new conversation"""
    try:
        return await create_conversation(current_user.id, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{conversation_id}", response_model=Conversation)
async def get_conversation_by_id(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get conversation by ID"""
    conversation = await get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Check if user owns this conversation
    if conversation.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this conversation"
        )
    
    return conversation

@router.put("/{conversation_id}", response_model=Conversation)
async def update_conversation_info(
    conversation_id: str,
    data: ConversationUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update conversation information"""
    # Check if conversation exists and user owns it
    conversation = await get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    if conversation.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this conversation"
        )
    
    # Update conversation
    updated_conversation = await update_conversation(conversation_id, data)
    if not updated_conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return updated_conversation

@router.delete("/{conversation_id}")
async def delete_conversation_by_id(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete conversation"""
    # Check if conversation exists and user owns it
    conversation = await get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    if conversation.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this conversation"
        )
    
    # Delete conversation
    success = await delete_conversation(conversation_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return {"detail": "Conversation deleted successfully"}

class PromptData(BaseModel):
    """Model for prompt requests"""
    conversation_id: str
    prompt: str
    system_prompt: Optional[str] = None

@router.post("/prompt", response_model=PromptResponse)
async def send_prompt_to_llm(
    prompt_data: PromptData,
    current_user: User = Depends(get_current_user)
):
    """Send a prompt to an LLM using LLMManager"""
    try:
        response = await process_prompt(
            current_user.id, 
            prompt_data.conversation_id, 
            prompt_data.prompt,
            prompt_data.system_prompt
        )
        
        return PromptResponse(
            response=response["response"],
            conversation_id=response["conversation_id"],
            processing_time=response.get("processing_time")
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing prompt: {str(e)}"
        )