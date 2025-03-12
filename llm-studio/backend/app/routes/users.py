# app/api/routes/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.models.user import UserResponse, UserUpdate
from app.core.security import get_current_user
from app.services.user_service import get_user_by_id, update_user, get_all_users, delete_user

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user = Depends(get_current_user)):
    """Get current authenticated user"""
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user = Depends(get_current_user)
):
    """Update current user information"""
    return await update_user(current_user.id, user_update)

# Admin only routes
@router.get("/", response_model=List[UserResponse])
async def read_users(
    skip: int = 0, 
    limit: int = 100,
    current_user = Depends(get_current_user)
):
    """Get list of users (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return await get_all_users(skip, limit)

@router.get("/{user_id}", response_model=UserResponse)
async def read_user(
    user_id: str,
    current_user = Depends(get_current_user)
):
    """Get user by ID (admin only)"""
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user_admin(
    user_id: str,
    user_update: UserUpdate,
    current_user = Depends(get_current_user)
):
    """Update user (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return await update_user(user_id, user_update)

@router.delete("/{user_id}", response_model=dict)
async def delete_user_by_id(
    user_id: str,
    current_user = Depends(get_current_user)
):
    """Delete user (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    success = await delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"detail": "User successfully deleted"}
