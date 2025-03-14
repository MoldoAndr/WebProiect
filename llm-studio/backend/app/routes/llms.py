from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.models.user import User
from app.models.llm import LLM, LLMCreate, LLMUpdate
from app.core.security import get_current_user, check_technician_access
from app.services.llm_service import get_llm_by_id, get_all_llms, create_llm, update_llm, delete_llm

router = APIRouter()

@router.get("", response_model=List[LLM])
async def get_llms(
    active_only: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Get all available LLMs"""
    return await get_all_llms(active_only)

@router.get("/{llm_id}", response_model=LLM)
async def get_llm(
    llm_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get LLM by ID"""
    llm = await get_llm_by_id(llm_id)
    if not llm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LLM not found"
        )
    
    return llm

# Technician/Admin routes
@router.post("", response_model=LLM)
async def create_new_llm(
    llm_data: LLMCreate,
    current_user: User = Depends(check_technician_access)
):
    """Create a new LLM (technician or admin only)"""
    try:
        return await create_llm(llm_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{llm_id}", response_model=LLM)
async def update_llm_info(
    llm_id: str,
    llm_data: LLMUpdate,
    current_user: User = Depends(check_technician_access)
):
    """Update LLM information (technician or admin only)"""
    updated_llm = await update_llm(llm_id, llm_data)
    if not updated_llm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LLM not found"
        )
    
    return updated_llm

@router.delete("/{llm_id}")
async def delete_llm_model(
    llm_id: str,
    current_user: User = Depends(check_technician_access)
):
    """Delete LLM (technician or admin only)"""
    success = await delete_llm(llm_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LLM not found"
        )
    
    return {"detail": "LLM deleted successfully"}
