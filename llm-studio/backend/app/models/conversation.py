from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class Message(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    created_at: datetime
    metadata: Optional[dict] = None

class ConversationBase(BaseModel):
    llm_id: str
    title: str

class ConversationCreate(ConversationBase):
    pass

class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    llm_id: Optional[str] = None

class Conversation(ConversationBase):
    id: str
    user_id: str
    messages: List[Message] = []
    created_at: datetime
    updated_at: datetime

class ConversationResponse(Conversation):
    pass
