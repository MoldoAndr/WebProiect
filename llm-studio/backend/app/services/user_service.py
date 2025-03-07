from typing import Optional, Dict, Any
from bson import ObjectId
from app.db.mongodb import get_database
from app.models.user import User, UserCreate
from app.utils.password import get_password_hash
from datetime import datetime

async def get_user_by_id(user_id: str) -> Optional[User]:
    """Get a user by ID from the database"""
    db = await get_database()
    user_data = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user_data:
        return None
    
    # Convert ObjectId to str
    user_data["id"] = str(user_data.pop("_id"))
    
    return User(**user_data)

async def get_user_by_username(username: str) -> Optional[User]:
    """Get a user by username from the database"""
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
    
    # Hash the password
    hashed_password = get_password_hash(user_data.password)
    
    # Prepare user document
    now = datetime.utcnow()
    user_doc = {
        "username": user_data.username,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "hashed_password": hashed_password,
        "role": "user",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    # Insert user
    result = await db.users.insert_one(user_doc)
    
    # Return created user
    return await get_user_by_id(str(result.inserted_id))
