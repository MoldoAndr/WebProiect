from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class LLMBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    description: str
    api_endpoint: str
    parameters: Dict[str, Any] = {}

class LLMCreate(LLMBase):
    pass

class LLMUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    api_endpoint: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    status: Optional[str] = None

class LLM(LLMBase):
    id: str
    status: str = "active"
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
