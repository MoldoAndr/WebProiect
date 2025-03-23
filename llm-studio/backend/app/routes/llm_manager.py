# app/routes/llm_manager.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, Dict, List, Any

from app.models.user import User
from app.core.security import get_current_user, check_technician_access
from app.services.llm_manager_service import llm_manager_service

router = APIRouter()

@router.get("/models")
async def get_models(current_user: User = Depends(get_current_user)):
    """Get all available LLM models"""
    try:
        return await llm_manager_service.get_models()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get models: {str(e)}"
        )

@router.post("/conversation")
async def create_conversation(
    model_id: str, 
    conversation_id: Optional[str] = None, 
    current_user: User = Depends(get_current_user)
):
    """Create a new conversation with a specific model"""
    try:
        return await llm_manager_service.create_conversation(model_id, conversation_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create conversation: {str(e)}"
        )

@router.get("/conversation/{conversation_id}")
async def get_conversation(
    conversation_id: str, 
    current_user: User = Depends(get_current_user)
):
    """Get conversation history"""
    try:
        return await llm_manager_service.get_conversation(conversation_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversation: {str(e)}"
        )

@router.post("/chat")
async def send_message(
    conversation_id: str, 
    message: str, 
    current_user: User = Depends(get_current_user)
):
    """Send a message to a conversation"""
    try:
        return await llm_manager_service.send_message(conversation_id, message)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
        )

# Technician/Admin-only routes
@router.post("/models")
async def add_model(
    model_data: Dict[str, Any], 
    current_user: User = Depends(check_technician_access)
):
    """Add a new LLM model (technician or admin only)"""
    try:
        return await llm_manager_service.add_model(model_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add model: {str(e)}"
        )

@router.delete("/models/{model_id}")
async def delete_model(
    model_id: str, 
    current_user: User = Depends(check_technician_access)
):
    """Delete an LLM model (technician or admin only)"""
    try:
        return await llm_manager_service.delete_model(model_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete model: {str(e)}"
        )
