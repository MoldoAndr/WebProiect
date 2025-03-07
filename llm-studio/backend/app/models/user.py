from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

class User(UserBase):
    id: str
    hashed_password: str
    role: Literal["user", "admin", "technician"] = "user"
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
