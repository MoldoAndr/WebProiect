from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.models.user import User, UserUpdate, UserResponse
from app.core.security import get_current_user, check_admin_access
from app.services.user_service import get_user_by_id, update_user, get_all_users, delete_user, update_user_role

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_current_user_info(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update current user information"""
    if "role" in user_data.dict(exclude_unset=True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role"
        )
    
    updated_user = await update_user(current_user.id, user_data)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return updated_user

@router.get("", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    admin_user: User = Depends(check_admin_access)
):
    """Get all users (admin only)"""
    return await get_all_users(skip, limit)

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    admin_user: User = Depends(check_admin_access)
):
    """Get user by ID (admin only)"""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user_info(
    user_id: str,
    user_data: UserUpdate,
    admin_user: User = Depends(check_admin_access)
):
    """Update user information (admin only)"""
    if user_id == admin_user.id and user_data.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account"
        )
    
    updated_user = await update_user(user_id, user_data)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return updated_user

@router.delete("/{user_id}")
async def delete_user_account(
    user_id: str,
    admin_user: User = Depends(check_admin_access)
):
    """Delete user (admin only)"""
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )
    
    success = await delete_user(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"detail": "User deleted successfully"}

@router.put("/{user_id}/role", response_model=UserResponse)
async def change_user_role(
    user_id: str,
    role: str,
    admin_user: User = Depends(check_admin_access)
):
    """Change user role (admin only)"""
    if role not in ["user", "admin", "technician"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be one of: user, admin, technician"
        )
    
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role"
        )
    
    updated_user = await update_user_role(user_id, role)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return updated_user
