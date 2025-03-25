# app/routes/llm_manager.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import Optional, Dict, List, Any
import json

from app.models.user import User
from app.core.security import get_current_user, check_technician_access
from app.services.llm_manager_service import llm_manager_service
from pydantic import BaseModel

# Define request/response models
class ModelConfigRequest(BaseModel):
    id: str
    type: str = "llama"
    path: str
    context_window: int = 2048
    n_threads: int = 4
    n_gpu_layers: int = 0
    temperature: float = 0.7

class AddModelRequest(BaseModel):
    model_id: str
    model_type: str = "llama"
    model_url: Optional[str] = None
    file_name: Optional[str] = None
    context_window: int = 2048
    n_threads: int = 4
    n_gpu_layers: int = 0
    temperature: float = 0.7
    keep_file_on_error: bool = False
    auto_correct_type: bool = True
    download_only: bool = False

router = APIRouter()

# ----- Model Management Endpoints -----

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
        
@router.post("/initialize")
async def initialize_models(
    models_config: List[ModelConfigRequest], 
    current_user: User = Depends(check_technician_access)
):
    """Initialize models from configuration (technician or admin only)"""
    try:
        config_data = [model.dict() for model in models_config]
        return await llm_manager_service.initialize_models(config_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize models: {str(e)}"
        )
        
@router.post("/models")
async def add_model(
    model_data: AddModelRequest,
    current_user: User = Depends(check_technician_access)
):
    """Add a new LLM model (technician or admin only)"""
    try:
        return await llm_manager_service.add_model(model_data.dict())
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
        
@router.post("/analyze-model")
async def analyze_model(
    model_path: str,
    current_user: User = Depends(check_technician_access)
):
    """Analyze a model file to check compatibility (technician or admin only)"""
    try:
        return await llm_manager_service.analyze_model(model_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze model: {str(e)}"
        )

# ----- Conversation Management Endpoints -----

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

@router.post("/conversation/{conversation_id}/reset")
async def reset_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """Reset a conversation's history"""
    try:
        return await llm_manager_service.reset_conversation(conversation_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset conversation: {str(e)}"
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

# ----- Health Check Endpoint -----

@router.get("/health")
async def health_check():
    """Health check for the LLM Manager service"""
    try:
        return await llm_manager_service.health_check()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM Manager service is not healthy: {str(e)}"
        )