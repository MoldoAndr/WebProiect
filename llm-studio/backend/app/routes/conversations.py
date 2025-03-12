from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional

from app.models.conversation import Conversation, ConversationCreate, ConversationUpdate, ConversationResponse
from app.models.prompt import PromptRequest, PromptResponse
from app.services.conversation_service import (
    create_conversation, 
    get_conversation, 
    update_conversation,
    delete_conversation,
    get_user_conversations
)
from app.services.prompt_service import send_prompt
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/conversations", response_model=ConversationResponse)
async def create_new_conversation(
    data: ConversationCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new conversation"""
    try:
        conversation = await create_conversation(current_user.id, data)
        return conversation
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(
    current_user: User = Depends(get_current_user)
):
    """Get all conversations for the current user"""
    try:
        conversations = await get_user_conversations(current_user.id)
        return conversations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_single_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific conversation"""
    try:
        conversation = await get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Verify user has access to this conversation
        if conversation.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access forbidden")
        
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_existing_conversation(
    conversation_id: str,
    data: ConversationUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a conversation"""
    try:
        # Check if conversation exists and belongs to user
        conversation = await get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if conversation.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access forbidden")
        
        updated = await update_conversation(conversation_id, data)
        if not updated:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a conversation"""
    try:
        # Check if conversation exists and belongs to user
        conversation = await get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if conversation.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access forbidden")
        
        result = await delete_conversation(conversation_id)
        if not result:
            raise HTTPException(status_code=404, detail="Conversation not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/conversations/prompt", response_model=PromptResponse)
async def send_prompt_to_llm(
    prompt_request: PromptRequest,
    current_user: User = Depends(get_current_user)
):
    """Send a prompt to an LLM"""
    try:
        response = await send_prompt(current_user.id, prompt_request)
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
