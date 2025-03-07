from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class LLMBase(BaseModel):
    name: str
    description: str
    image: str
    api_endpoint: str
    parameters: Dict[str, Any] = {}
    
class LLMCreate(LLMBase):
    environment: Optional[Dict[str, str]] = None
    memory_limit: Optional[int] = None
    cpu_limit: Optional[int] = None

class LLMUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    api_endpoint: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    environment: Optional[Dict[str, str]] = None
    memory_limit: Optional[int] = None
    cpu_limit: Optional[int] = None
    status: Optional[str] = None

class LLM(LLMBase):
    id: str
    container_id: Optional[str] = None
    host_port: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class LLMResponse(LLM):
    pass
