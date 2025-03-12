# app/services/user_service.py
from typing import Optional, Dict, Any, List
from bson import ObjectId
from datetime import datetime

from app.db.mongodb import get_database
from app.models.user import User, UserCreate, UserUpdate
from app.utils.password import get_password_hash

async def get_user_by_id(user_id: str) -> Optional[User]:
    """Get a user by ID from the database"""
    db = await get_database()
    try:
        user_data = await db.users.find_one({"_id": ObjectId(user_id)})
    except:
        return None
    
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

async def get_user_by_email(email: str) -> Optional[User]:
    """Get a user by email from the database"""
    db = await get_database()
    user_data = await db.users.find_one({"email": email})
    
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
        "role": "user",  # Default role
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    # Insert user
    result = await db.users.insert_one(user_doc)
    
    # Return created user
    return await get_user_by_id(str(result.inserted_id))

async def update_user(user_id: str, user_update: UserUpdate) -> Optional[User]:
    """Update an existing user"""
    db = await get_database()
    
    # Get current user data to check for changes
    current_user = await get_user_by_id(user_id)
    if not current_user:
        return None
    
    # Prepare update document
    update_data = user_update.model_dump(exclude_unset=True)
    
    # If password is provided, hash it
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    
    # Add updated_at timestamp
    update_data["updated_at"] = datetime.utcnow()
    
    # Update the user
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
    async for user_doc in cursor:
        # Convert ObjectId to str
        user_doc["id"] = str(user_doc.pop("_id"))
        users.append(User(**user_doc))
    
    return users

async def delete_user(user_id: str) -> bool:
    """Delete a user by ID"""
    db = await get_database()
    try:
        result = await db.users.delete_one({"_id": ObjectId(user_id)})
        return result.deleted_count > 0
    except:
        return False
