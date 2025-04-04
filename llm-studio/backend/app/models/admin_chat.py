# app/models/admin_chat.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
from bson import ObjectId # If you use ObjectId directly in models

# Helper for ObjectId serialization if needed
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)
    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    CLOSED = "closed"

class MessageBase(BaseModel):
    content: str

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    id: str = Field(..., alias="_id") # Or use PyObjectId if you prefer ObjectId type
    ticket_id: str
    user_id: str # ID of the user who sent the message OR the user associated with the ticket if admin sent
    is_admin: bool = False
    admin_id: Optional[str] = None # ID of the admin if is_admin is True
    admin_name: Optional[str] = None # Name of the admin if is_admin is True
    created_at: datetime

    class Config:
        orm_mode = True # Allow creating from ORM objects/dicts
        allow_population_by_field_name = True # Allow using "_id" to populate "id"
        json_encoders = {ObjectId: str} # Ensure ObjectIds are serialized to strings

class TicketBase(BaseModel):
    title: str

class TicketCreate(TicketBase):
    initial_message: Optional[str] = None # Match frontend service parameter

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[TicketStatus] = None

class Ticket(TicketBase):
    id: str = Field(..., alias="_id") # Or use PyObjectId
    user_id: str
    status: TicketStatus
    created_at: datetime
    updated_at: datetime
    messages: List[Message] = [] # Include messages in the full ticket model

    class Config:
        orm_mode = True
        allow_population_by_field_name = True
        json_encoders = {ObjectId: str}