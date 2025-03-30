import httpx
import time
import logging
from typing import Optional, Dict
import json

from app.models.prompt import PromptRequest, PromptResponse
from app.models.llm import LLM
from app.services.llm_service import get_llm_by_id
from app.services.conversation_service import add_message_to_conversation, get_conversation
from app.core.config import settings

logger = logging.getLogger(__name__)

async def send_prompt(prompt_request: PromptRequest) -> PromptResponse:
    """Send a prompt to an LLM and save the response"""
    start_time = time.time()
    
    llm = await get_llm(prompt_request.llm_id)
    if not llm:
        raise ValueError(f"LLM with ID {prompt_request.llm_id} not found")
    
    conversation = await get_conversation(prompt_request.conversation_id)
    if not conversation:
        raise ValueError(f"Conversation with ID {prompt_request.conversation_id} not found")
    
    await add_message_to_conversation(
        conversation_id=prompt_request.conversation_id,
        role="user",
        content=prompt_request.prompt
    )
    
    api_request = {
        "prompt": prompt_request.prompt,
        "system_prompt": prompt_request.system_prompt or settings.DEFAULT_SYSTEM_PROMPT,
        "parameters": prompt_request.parameters or {}
    }
    
    try:
        llm_response = await call_llm_api(llm, api_request)
        
        response_message = await add_message_to_conversation(
            conversation_id=prompt_request.conversation_id,
            role="assistant",
            content=llm_response,
            metadata={"processing_time": time.time() - start_time}
        )
        
        if len(conversation.messages) == 0:
            title_from_prompt = ' '.join(prompt_request.prompt.split()[:5]) + "..."
            from app.models.conversation import ConversationUpdate
            from app.services.conversation_service import update_conversation
            await update_conversation(
                prompt_request.conversation_id,
                ConversationUpdate(title=title_from_prompt)
            )
        
        tokens = {
            "prompt": len(prompt_request.prompt.split()) * 1.3,
            "response": len(llm_response.split()) * 1.3
        }
        
        return PromptResponse(
            response=llm_response,
            conversation_id=prompt_request.conversation_id,
            processing_time=time.time() - start_time,
            tokens=tokens
        )
    
    except Exception as e:
        logger.error(f"Error calling LLM API: {str(e)}")
        await add_message_to_conversation(
            conversation_id=prompt_request.conversation_id,
            role="system",
            content=f"Error: {str(e)}",
            metadata={"error": True}
        )
        raise

async def call_llm_api(llm: LLM, request_data: Dict) -> str:
    """Call the LLM API based on the LLM configuration"""
    
    if settings.PRODUCTION is False:
        await asyncio.sleep(1)
        
        prompt = request_data.get("prompt", "")
        return f"This is a simulated response from {llm.name}. In a real application, this would be an actual response from the LLM API based on your message: \"{prompt}\""
    
    try:
        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT) as client:
            headers = {
                "Content-Type": "application/json"
            }
            
            
            response = await client.post(
                llm.api_endpoint,
                headers=headers,
                json=request_data,
                timeout=settings.LLM_TIMEOUT
            )
            
            response.raise_for_status()
            
            data = response.json()
            
            text = data.get("response") or data.get("text") or data.get("output") or ""
            
            return text
    
    except httpx.RequestError as e:
        logger.error(f"Request error when calling LLM API: {str(e)}")
        raise ValueError(f"Error communicating with LLM API: {str(e)}")
    
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error when calling LLM API: {e.response.status_code} - {e.response.text}")
        raise ValueError(f"API error: {e.response.status_code} - {e.response.text}")
    
    except Exception as e:
        logger.error(f"Unexpected error when calling LLM API: {str(e)}")
        raise ValueError(f"Unexpected error: {str(e)}")

import asyncio
