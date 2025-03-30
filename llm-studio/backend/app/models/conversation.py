from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class Message(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    created_at: datetime
    metadata: Dict[str, Any] = {}
    
    class Config:
        from_attributes = True

class ConversationBase(BaseModel):
    title: str
    llm_id: str

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
    
    class Config:
        from_attributes = True

class PromptRequest(BaseModel):
    conversation_id: Optional[str] = None
    prompt: str
    llm_id: str
    system_prompt: Optional[str] = None

class PromptResponse(BaseModel):
    response: str
    conversation_id: str
    processing_time: Optional[float] = None