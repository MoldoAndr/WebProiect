# app/services/user_service.py
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId
from fastapi import HTTPException, status
from app.core.db import get_database
from app.models.user import User, UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password
# Import the in-memory reset code functions:
from app.services.reset_code_cache import set_reset_code_in_memory, get_reset_code, clear_reset_code

async def get_user_by_id(user_id: str) -> Optional[User]:
    db = await get_database()
    user_data = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user_data:
        return None
    user_data["id"] = str(user_data.pop("_id"))
    return User(**user_data)

async def get_user_by_username(username: str) -> Optional[User]:
    db = await get_database()
    user_data = await db.users.find_one({"username": username})
    if not user_data:
        return None
    user_data["id"] = str(user_data.pop("_id"))
    return User(**user_data)

async def create_user(user_data: UserCreate) -> User:
    db = await get_database()
    hashed_password = get_password_hash(user_data.password)
    now = datetime.utcnow()
    user_doc = {
        "username": user_data.username,
        "email": user_data.email,
        "hashed_password": hashed_password,
        "full_name": "",
        "role": user_data.role,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    user_doc["id"] = user_id
    return User(**user_doc)

async def update_user(user_id: str, user_data: UserUpdate) -> Optional[User]:
    db = await get_database()
    update_data = {k: v for k, v in user_data.dict().items() if v is not None}
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    update_data["updated_at"] = datetime.utcnow()
    if update_data:
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    return await get_user_by_id(user_id)

async def get_all_users(skip: int = 0, limit: int = 100) -> List[User]:
    db = await get_database()
    cursor = db.users.find().skip(skip).limit(limit)
    users = []
    async for user_data in cursor:
        user_data["id"] = str(user_data.pop("_id"))
        users.append(User(**user_data))
    return users

async def delete_user(user_id: str) -> bool:
    db = await get_database()
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    return result.deleted_count > 0

async def update_user_role(user_id: str, role: str) -> Optional[User]:
    db = await get_database()
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": role, "updated_at": datetime.utcnow()}}
    )
    return await get_user_by_id(user_id)

async def get_user_by_email(email: str) -> Optional[User]:
    db = await get_database()
    user_data = await db.users.find_one({"email": email})
    if not user_data:
        return None
    user_data["id"] = str(user_data.pop("_id"))
    return User(**user_data)

async def change_password(user_id: str, old_password: str, new_password: str) -> Optional[User]:
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(old_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Old password is incorrect")
    user_update = UserUpdate(password=new_password)
    return await update_user(user_id, user_update)

# In-memory reset code functions:

async def set_reset_code(user_id: str) -> str:
    """
    Generate an 8-digit reset code and store it in memory.
    """
    return set_reset_code_in_memory(user_id)

async def reset_password_with_code(email: str, code: str, new_password: str) -> Optional[dict]:
    """
    Verify the provided reset code (from memory) for the given email and, if valid,
    update the user's password. The reset code is then cleared.
    """
    user = await get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    stored_code = get_reset_code(user.id)
    if not stored_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No reset code found or code has expired. Please request a new code."
        )
    
    if stored_code != code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset code")
    
    updated_user = await update_user(user.id, UserUpdate(password=new_password))
    if not updated_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to reset password")
    
    clear_reset_code(user.id)
    return {"message": "Password has been reset successfully"}
