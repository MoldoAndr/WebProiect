# app/models/admin_chat.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    CLOSED = "closed"

class MessageBase(BaseModel):
    content: str

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    id: str
    ticket_id: str
    user_id: str
    is_admin: bool
    admin_id: Optional[str] = None
    admin_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class TicketBase(BaseModel):
    title: str

class TicketCreate(TicketBase):
    pass

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[TicketStatus] = None

class Ticket(TicketBase):
    id: str
    user_id: str
    status: TicketStatus
    created_at: datetime
    updated_at: datetime
    messages: List[Message] = []
    
    class Config:
        from_attributes = True

class TicketResponse(Ticket):
    pass