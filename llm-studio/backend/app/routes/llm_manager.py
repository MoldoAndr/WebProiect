# app/routes/llm_manager.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, Dict, List, Any
import logging
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel
from app.core.db import get_database
from app.models.user import User
from app.core.security import get_current_user, check_technician_access, check_admin_access
from app.services.llm_manager_service import llm_manager_service
from app.models.conversation import ConversationCreate
from app.services.conversation_service import create_conversation, get_conversation

logger = logging.getLogger(__name__)
router = APIRouter()

# ----- Request/Response Models for Model Management -----

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


class ModifyModelRequest(BaseModel):
    temperature: Optional[float] = None
    context_window: Optional[int] = None
    n_threads: Optional[int] = None
    n_gpu_layers: Optional[int] = None

class ModifyModelResponse(BaseModel):
    success: bool
    model_id: str
    message: str
    changes: Dict[str, Any]
    errors: Dict[str, str]
    updated_model_info: Dict[str, Any]
# ----- Model Management Endpoints -----

@router.get("/models")
async def get_models():
    """Get all available LLM models"""
    try:
        return await llm_manager_service.get_models()
    except Exception as e:
        logger.error(f"Failed to get models: {str(e)}")
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
        logger.error(f"Failed to initialize models: {str(e)}")
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
        logger.error(f"Failed to add model: {str(e)}")
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
        logger.error(f"Failed to delete model: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete model: {str(e)}"
        )

@router.put("/models/{model_id}", response_model=ModifyModelResponse)
async def modify_model(
    model_id: str,
    modify_data: ModifyModelRequest,
    current_user: User = Depends(check_technician_access)
):
    """Modify parameters of an existing LLM model (technician or admin only)"""
    try:
        # Check if any parameters are provided to modify
        if not any([modify_data.temperature, modify_data.context_window, 
                   modify_data.n_threads, modify_data.n_gpu_layers]):
            model_info = await llm_manager_service.get_model_info(model_id)
            return ModifyModelResponse(
                success=True,
                model_id=model_id,
                message="No parameters provided to modify. Returning current model info.",
                changes={},
                errors={},
                updated_model_info=model_info
            )

        # Modify the model parameters via the service
        result = await llm_manager_service.modify_model_parameters(
            model_id=model_id,
            temperature=modify_data.temperature,
            context_window=modify_data.context_window,
            n_threads=modify_data.n_threads,
            n_gpu_layers=modify_data.n_gpu_layers
        )

        changes = result.get("changes", {})
        errors = result.get("errors", {})
        updated_model_info = await llm_manager_service.get_model_info(model_id)

        if errors and not changes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update model parameters"
            )
        elif errors:
            return ModifyModelResponse(
                success=bool(changes),
                model_id=model_id,
                message="Model parameters partially updated",
                changes=changes,
                errors=errors,
                updated_model_info=updated_model_info
            )
        
        return ModifyModelResponse(
            success=True,
            model_id=model_id,
            message="Model parameters updated successfully",
            changes=changes,
            errors={},
            updated_model_info=updated_model_info
        )
    except ValueError as ve:
        logger.error(f"Model not found or invalid parameters for {model_id}: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model '{model_id}' not found"
        )
    except Exception as e:
        logger.error(f"Failed to modify model {model_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to modify model: {str(e)}"
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
        logger.error(f"Failed to analyze model: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze model: {str(e)}"
        )



# ----- Conversation Management Endpoints -----

@router.post("/conversation")
async def create_conversation_endpoint(data: dict):
    model_id = data.get("model_id")
    provided_conversation_id = data.get("conversation_id")
    
    if not model_id:
        raise HTTPException(status_code=400, detail="Missing model_id")
    
    # If a conversation_id is provided, reuse it; otherwise, generate a new one.
    if provided_conversation_id:
        conversation_id = provided_conversation_id
        logger.info(f"Using provided conversation_id: {conversation_id}")
    else:
        conversation_id = str(ObjectId())
        logger.info(f"Generated new conversation_id: {conversation_id}")
    
    conversation_record = {
        "conversation_id": conversation_id,
        "model_id": model_id,
        "created_at": datetime.utcnow(),
        # Additional fields as needed...
    }
    
    # Insert conversation_record into LLM Manager's storage (database or in-memory store).
    # For example: await storage.insert(conversation_record)
    logger.info(f"Created conversation in LLMManager: {conversation_record}")
    
    return {"conversation_id": conversation_id, "model_id": model_id}

@router.get("/conversation/{conversation_id}")
async def get_conversation_endpoint(
    conversation_id: str, 
    current_user: User = Depends(get_current_user)
):
    """Get conversation history"""
    try:
        db_conversation = await get_conversation(conversation_id)
        if not db_conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation {conversation_id} not found"
            )
        # Check user authorization.
        if db_conversation.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this conversation"
            )
        
        # Optionally, you can also fetch LLMManager conversation history:
        # llm_history = await llm_manager_service.get_conversation(conversation_id)
        return db_conversation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversation: {str(e)}"
        )

@router.post("/conversation/{conversation_id}/reset")
async def reset_conversation_endpoint(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """Reset a conversation's history"""
    try:
        db_conversation = await get_conversation(conversation_id)
        if not db_conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation {conversation_id} not found"
            )
        if db_conversation.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this conversation"
            )
        
        # Reset conversation in LLMManager.
        await llm_manager_service.reset_conversation(conversation_id)
        
        # Delete messages from the local database.
        db = await get_database()
        await db.messages.delete_many({"conversation_id": conversation_id})
        
        # Update conversation timestamp.
        await db.conversations.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$set": {"updated_at": datetime.utcnow()}}
        )
        return {"success": True, "conversation_id": conversation_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to reset conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset conversation: {str(e)}"
        )

@router.post("/chat")
async def send_message_endpoint(
    conversation_id: str, 
    message: str, 
    current_user: User = Depends(get_current_user)
):
    """Send a message to a conversation"""
    try:
        from app.services.conversation_service import process_prompt
        response = await process_prompt(current_user.id, conversation_id, message)
        return response
    except ValueError as e:
        logger.error(f"Value error in send_message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error in send_message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
        )


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

class StatsResponse(BaseModel):
    total_admin_messages: int
    total_conversations: int
    total_messages: int
    avg_messages_per_conversation: float
    avg_conversations_per_user: float
    avg_tickets_per_user: float

@router.get("/stats", response_model=StatsResponse)
async def get_system_stats(current_user: User = Depends(check_admin_access)):
    """Get system-wide statistics for admin dashboard"""
    try:
        db = await get_database()
        total_admin_messages = await db.admin_messages.count_documents({})
        total_conversations = await db.conversations.count_documents({})
        total_messages = await db.messages.count_documents({})
        if total_conversations > 0:
            avg_messages_per_conversation = total_messages / total_conversations
        else:
            avg_messages_per_conversation = 0.0
        total_users = await db.users.count_documents({})
        if total_users > 0:
            avg_conversations_per_user = total_conversations / total_users
        else:
            avg_conversations_per_user = 0.0
        total_tickets = await db.tickets.count_documents({})
        if total_users > 0:
            avg_tickets_per_user = total_tickets / total_users
        else:
            avg_tickets_per_user = 0.0
        stats = {
            "total_admin_messages": total_admin_messages,
            "total_conversations": total_conversations,
            "total_messages": total_messages,
            "avg_messages_per_conversation": round(avg_messages_per_conversation, 2),
            "avg_conversations_per_user": round(avg_conversations_per_user, 2),
            "avg_tickets_per_user": round(avg_tickets_per_user, 2)
        }
        
        logger.info(f"Retrieved system stats: {stats}")
        return stats
    
    except Exception as e:
        logger.error(f"Failed to retrieve system stats: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve system stats: {str(e)}"
        )