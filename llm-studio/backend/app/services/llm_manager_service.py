# app/services/llm_manager_service.py
import httpx
import logging
import asyncio
from typing import Optional, Dict, List, Any, AsyncIterator
from app.core.config import settings

logger = logging.getLogger(__name__)

class LLMManagerService:
    """Service to interact with the LLM Manager API with added streaming support"""
    
    def __init__(self):
        self.base_url = settings.LLM_MANAGER_URL
        
    async def get_models(self) -> Dict[str, Any]:
        """Get all available models"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{self.base_url}/api/models")
            response.raise_for_status()
            return response.json()
    
    async def create_conversation(self, model_id: str, conversation_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a new conversation with a specific model"""
        data = {
            "model_id": model_id,
            "conversation_id": conversation_id
        }
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
            "message": message,
            "stream": False
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(f"{self.base_url}/api/chat", json=data)
            response.raise_for_status()
            return response.json()
    
    async def stream_message(self, conversation_id: str, message: str) -> AsyncIterator[str]:
        """Send a message to a conversation and stream the response"""
        data = {
            "conversation_id": conversation_id,
            "message": message,
            "stream": True
        }
        
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream("POST", f"{self.base_url}/api/chat", json=data) as response:
                    response.raise_for_status()
                    
                    # Buffer for collecting partial chunks
                    buffer = ""
                    
                    async for chunk in response.aiter_text():
                        # Process incoming stream chunks
                        if chunk.strip():
                            buffer += chunk
                            
                            # Check if we have a complete JSON object
                            if buffer.strip().endswith("}"):
                                try:
                                    import json
                                    data = json.loads(buffer)
                                    buffer = ""
                                    
                                    if "error" in data:
                                        logger.error(f"Error in stream: {data['error']}")
                                        yield f"Error: {data['error']}"
                                        return
                                    
                                    if "text" in data or "content" in data:
                                        content = data.get("text", data.get("content", ""))
                                        yield content
                                except json.JSONDecodeError:
                                    # Incomplete JSON, continue collecting
                                    pass
        except asyncio.TimeoutError:
            logger.error("Timeout streaming response")
            yield "Error: Request timed out"
        except Exception as e:
            logger.error(f"Error streaming response: {e}")
            yield f"Error: {str(e)}"
    
    async def add_model(self, model_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add a new LLM model"""
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(f"{self.base_url}/api/add-llm", json=model_data)
            response.raise_for_status()
            return response.json()
    
    async def delete_model(self, model_id: str) -> Dict[str, Any]:
        """Delete an LLM model"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(f"{self.base_url}/api/delete-llm/{model_id}")
            response.raise_for_status()
            return response.json()
    
    async def analyze_model(self, model_path: str) -> Dict[str, Any]:
        """Analyze a model file"""
        data = {"model_path": model_path}
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{self.base_url}/api/analyze-model", json=data)
            response.raise_for_status()
            return response.json()
    
    async def health_check(self) -> Dict[str, Any]:
        """Health check for the LLM Manager"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{self.base_url}/health")
            response.raise_for_status()
            return response.json()

# Create a singleton instance
llm_manager_service = LLMManagerService()
