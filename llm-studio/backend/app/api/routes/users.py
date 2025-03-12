from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.models.user import User, UserCreate, UserUpdate, UserResponse
from app.services.user_service import (
    create_user, 
    get_user_by_id, 
    get_all_users, 
    update_user,
    delete_user,
    get_user_by_username,
    update_user_role
)
from app.core.security import get_current_user, get_admin_user

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def read_users(
    skip: int = 0, 
    limit: int = 100,
    current_user: User = Depends(get_admin_user)
):
    """
    Get all users. Admin only.
    """
    users = await get_all_users(skip=skip, limit=limit)
    return users

@router.get("/me", response_model=UserResponse)
async def read_user_me(current_user: User = Depends(get_current_user)):
    """
    Get current user.
    """
    return current_user

@router.get("/{user_id}", response_model=UserResponse)
async def read_user(
    user_id: str,
    current_user: User = Depends(get_admin_user)
):
    """
    Get a specific user by ID. Admin only.
    """
    user = await get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user_details(
    user_id: str,
    user_data: UserUpdate,
    current_user: User = Depends(get_admin_user)
):
    """
    Update a user. Admin only.
    """
    updated_user = await update_user(user_id, user_data)
    if updated_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return updated_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_by_id(
    user_id: str,
    current_user: User = Depends(get_admin_user)
):
    """
    Delete a user. Admin only.
    """
    # Prevent self-deletion
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )
    
    success = await delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    
    return None

@router.put("/{user_id}/role", response_model=UserResponse)
async def update_user_role_endpoint(
    user_id: str,
    role: str,
    current_user: User = Depends(get_admin_user)
):
    """
    Update a user's role. Admin only.
    """
    if role not in ["user", "admin", "technician"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be one of: user, admin, technician"
        )
    
    # Prevent changing own role
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role"
        )
    
    updated_user = await update_user_role(user_id, role)
    if updated_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    return updated_user
