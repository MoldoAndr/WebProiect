from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Message schema
class Message(BaseModel):
    id: str
    conversation_id: str
    role: str  # user, assistant, system
    content: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Base conversation schema
class ConversationBase(BaseModel):
    title: str
    llm_id: str

# Conversation creation schema
class ConversationCreate(ConversationBase):
    pass

# Conversation update schema
class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    llm_id: Optional[str] = None

# Conversation schema
class Conversation(ConversationBase):
    id: str
    user_id: str
    messages: List[Message] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Schema for prompt request
class PromptRequest(BaseModel):
    conversation_id: Optional[str] = None
    prompt: str
    llm_id: str
    system_prompt: Optional[str] = None

# Schema for prompt response
class PromptResponse(BaseModel):
    response: str
    conversation_id: str
    processing_time: Optional[float] = None
