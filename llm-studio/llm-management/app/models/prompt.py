"""
Models for LLM prompts and responses.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class PromptRequest(BaseModel):
    """
    Request model for sending a prompt to an LLM.
    """
    prompt: str
    conversation_id: Optional[str] = None
    system_prompt: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None

class PromptResponse(BaseModel):
    """
    Response model for a prompt sent to an LLM.
    """
    response: str
    conversation_id: str
    processing_time: Optional[float] = None
    tokens: Optional[Dict[str, int]] = None
