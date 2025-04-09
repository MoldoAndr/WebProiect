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
    update_user_role,
    change_password
)
from app.core.security import get_current_user, get_admin_user

router = APIRouter()

@router.delete("/me/history")
async def delete_user_history(current_user: User = Depends(get_current_user)):
    """Delete current user's conversation history"""
    db = await get_database()
    await db.conversations.delete_many({"user_id": ObjectId(current_user.id)})  # Assuming a conversations collection
    return {"detail": "Conversation history deleted successfully"}

@router.get("/me/export")
async def export_user_data(current_user: User = Depends(get_current_user)):
    """Export current user's data"""
    db = await get_database()
    user_data = await db.users.find_one({"_id": ObjectId(current_user.id)})
    conversations = await db.conversations.find({"user_id": ObjectId(current_user.id)}).to_list(None)
    export_data = {
        "user": user_data,
        "conversations": conversations
    }
    return JSONResponse(content=export_data)

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

@router.post("/change-password", response_model=dict)
async def change_user_password(
    old_password: str = Body(...),
    new_password: str = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Change current user's password"""
    updated_user = await change_password(current_user.id, old_password, new_password)
    return {"detail": "Password updated successfully"}

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
