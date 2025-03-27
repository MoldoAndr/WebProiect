# app/services/llm_manager_service.py
import httpx
import logging
import asyncio
from typing import Optional, Dict, List, Any, AsyncIterator
from app.core.config import settings

logger = logging.getLogger(__name__)

class LLMManagerService:
    """Service to interact with the new LLMManager API with streaming support"""
    
    def __init__(self):
        self.base_url = "http://llm-api:5000"
        logger.info(f"LLMManager service initialized with base URL: {self.base_url}")
            
    async def get_models(self) -> Dict[str, Any]:
        """Get all available models from LLMManager with robust error handling"""
        logger.info(f"Fetching models from {self.base_url}/api/models")
        
        max_retries = 1
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(f"{self.base_url}/api/models")
                    response.raise_for_status()
                    models = response.json()
                    for model in models:
                        if 'id' in model:
                            model['id'] = model['id'].split(' ')[0]
                    logger.info(f"Successfully fetched {len(models)} models")
                    return models
            except httpx.ConnectError as e:
                logger.error(f"Connection error on attempt {attempt+1}/{max_retries}: {str(e)}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)  # Wait before retrying
            except httpx.TimeoutException as e:
                logger.error(f"Timeout error on attempt {attempt+1}/{max_retries}: {str(e)}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)
            except Exception as e:
                logger.error(f"Unexpected error fetching models on attempt {attempt+1}/{max_retries}: {str(e)}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)
        
        logger.error("All attempts to fetch models failed, returning empty model list")
        return {}
        
    async def create_conversation(self, model_id: str, conversation_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a new conversation with a specific model"""
        data = {
            "model_id": model_id,
            "conversation_id": conversation_id
        }
        logger.info(f"Sending create conversation request: {data}")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{self.base_url}/api/conversation", json=data)
            response.raise_for_status()
            return response.json()
    
    async def get_conversation(self, conversation_id: str) -> Dict[str, Any]:
        """Get conversation history"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{self.base_url}/api/conversation/{conversation_id}")
            response.raise_for_status()
            return response.json()
    
    async def reset_conversation(self, conversation_id: str) -> Dict[str, Any]:
        """Reset a conversation's history"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{self.base_url}/api/conversation/{conversation_id}/reset")
            response.raise_for_status()
            return response.json()
    
    async def send_message(self, conversation_id: str, message: str) -> Dict[str, Any]:
        """Send a message to a conversation and get the complete response"""
        data = {
            "conversation_id": conversation_id,
            "message": message
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(f"{self.base_url}/api/chat", json=data)
            response.raise_for_status()
            return response.json()
    
    async def stream_message(self, conversation_id: str, message: str) -> AsyncIterator[str]:
        """Send a message to a conversation and stream the response
        
        This method utilizes chunked encoding to stream responses from the LLM.
        It's used for WebSocket-based streaming to the frontend.
        """
        data = {
            "conversation_id": conversation_id,
            "message": message
        }
        
        try:
            # Note: We don't set a timeout for streaming connections
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream("POST", f"{self.base_url}/api/chat", json=data) as response:
                    response.raise_for_status()
                    
                    # Buffer for collecting partial JSON chunks
                    buffer = ""
                    
                    async for chunk in response.aiter_text():
                        if chunk.strip():
                            buffer += chunk
                            
                            try:
                                if buffer.endswith("}"):
                                    import json
                                    data = json.loads(buffer)
                                    buffer = ""
                                    
                                    # Extract the content from the response
                                    if "error" in data:
                                        logger.error(f"Error in stream: {data['error']}")
                                        yield f"Error: {data['error']}"
                                        return
                                    
                                    content = data.get("response", 
                                              data.get("text",
                                              data.get("content", "")))
                                    
                                    if content:
                                        yield content
                                else:
                                    # For non-JSON responses or incomplete chunks
                                    # Check if it's a complete sentence or has a natural break
                                    for end_char in ['.', '!', '?', '\n']:
                                        if end_char in buffer:
                                            parts = buffer.split(end_char, 1)
                                            complete_part = parts[0] + end_char
                                            buffer = parts[1]
                                            yield complete_part
                            except json.JSONDecodeError:
                                # Not valid JSON yet, continue collecting
                                pass
                            except Exception as e:
                                logger.error(f"Error processing stream chunk: {e}")
                                if buffer:
                                    yield buffer
                                    buffer = ""
                    
                    # Send any remaining buffer content
                    if buffer:
                        yield buffer
                        
        except asyncio.TimeoutError:
            logger.error("Timeout streaming response")
            yield "Error: Request timed out"
        except Exception as e:
            logger.error(f"Error streaming response: {e}")
            yield f"Error: {str(e)}"
    
    async def add_model(self, model_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add a new LLM model to the LLMManager"""
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(f"{self.base_url}/api/add-llm", json=model_data)
            response.raise_for_status()
            return response.json()
    
    async def delete_model(self, model_id: str) -> Dict[str, Any]:
        """Delete an LLM model"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Use the proper endpoint format for the new LLMManager
            response = await client.delete(f"{self.base_url}/api/delete-llm/{model_id}")
            response.raise_for_status()
            return response.json()
    
    async def analyze_models(self, model_path: str) -> Dict[str, Any]:
        """Analyze a model file to check compatibility"""
        data = {"model_path": model_path}
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{self.base_url}/api/analyze-model", json=data)
            response.raise_for_status()
            return response.json()
    
    async def initialize_models(self, models_config: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Initialize models from configuration
        
        This is a new method to match the LLMManager's initialize endpoint
        """
        data = {"models": models_config}
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(f"{self.base_url}/api/initialize", json=data)
            response.raise_for_status()
            return response.json()
    
    async def health_check(self) -> Dict[str, Any]:
        """Health check for the LLM Manager"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{self.base_url}/health")
            response.raise_for_status()
            return response.json()

llm_manager_service = LLMManagerService()