from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from app.core.db import get_database
from app.models.user import User, UserCreate, UserUpdate
from app.core.security import get_password_hash

async def get_user_by_id(user_id: str) -> Optional[User]:
    """Get user by ID"""
    db = await get_database()
    user_data = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user_data:
        return None
    
    # Convert ObjectId to str
    user_data["id"] = str(user_data.pop("_id"))
    return User(**user_data)

async def get_user_by_username(username: str) -> Optional[User]:
    """Get user by username"""
    db = await get_database()
    user_data = await db.users.find_one({"username": username})
    
    if not user_data:
        return None
    
    # Convert ObjectId to str
    user_data["id"] = str(user_data.pop("_id"))
    return User(**user_data)

async def create_user(user_data: UserCreate) -> User:
    """Create a new user"""
    db = await get_database()
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user document
    now = datetime.utcnow()
    user_doc = {
        "username": user_data.username,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "hashed_password": hashed_password,
        "role": "user",  # Default role
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    # Insert into database
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Return created user
    user_doc["id"] = user_id
    return User(**user_doc)

async def update_user(user_id: str, user_data: UserUpdate) -> Optional[User]:
    """Update user information"""
    db = await get_database()
    
    # Prepare update data
    update_data = {k: v for k, v in user_data.dict().items() if v is not None}
    
    # Hash password if provided
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    
    # Update timestamp
    update_data["updated_at"] = datetime.utcnow()
    
    # Update user
    if update_data:
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
    
    # Return updated user
    return await get_user_by_id(user_id)

async def get_all_users(skip: int = 0, limit: int = 100) -> List[User]:
    """Get all users with pagination"""
    db = await get_database()
    cursor = db.users.find().skip(skip).limit(limit)
    users = []
    
    async for user_data in cursor:
        user_data["id"] = str(user_data.pop("_id"))
        users.append(User(**user_data))
    
    return users

async def delete_user(user_id: str) -> bool:
    """Delete a user"""
    db = await get_database()
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    return result.deleted_count > 0

async def update_user_role(user_id: str, role: str) -> Optional[User]:
    """Update user role"""
    db = await get_database()
    
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "role": role,
            "updated_at": datetime.utcnow()
        }}
    )
    
    return await get_user_by_id(user_id)

async def get_user_by_email(email: str) -> Optional[User]:
    """Get user by email"""
    db = await get_database()
    user_data = await db.users.find_one({"email": email})

    if not user_data:
        return None

    # Convert ObjectId to str
    user_data["id"] = str(user_data.pop("_id"))
    return User(**user_data)
