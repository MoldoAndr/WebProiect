from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class PromptRequest(BaseModel):
    llm_id: str
    prompt: str
    conversation_id: Optional[str] = None
    system_prompt: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None

class PromptResponse(BaseModel):
    response: str
    conversation_id: str
    processing_time: Optional[float] = None
    tokens: Optional[Dict[str, int]] = None
