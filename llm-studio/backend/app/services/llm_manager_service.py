# app/services/llm_manager_service.py
import httpx
import logging
from typing import Optional, Dict, List, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class LLMManagerService:
    """Service to interact with the LLM Manager API"""
    
    def __init__(self):
        self.base_url = settings.LLM_MANAGER_URL
        
    async def get_models(self) -> Dict[str, Any]:
        """Get all available models"""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/api/models")
            response.raise_for_status()
            return response.json()
    
    async def create_conversation(self, model_id: str, conversation_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a new conversation with a specific model"""
        data = {
            "model_id": model_id,
            "conversation_id": conversation_id
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/api/conversation", json=data)
            response.raise_for_status()
            return response.json()
    
    async def get_conversation(self, conversation_id: str) -> Dict[str, Any]:
        """Get conversation history"""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/api/conversation/{conversation_id}")
            response.raise_for_status()
            return response.json()
    
    async def reset_conversation(self, conversation_id: str) -> Dict[str, Any]:
        """Reset a conversation's history"""
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/api/conversation/{conversation_id}/reset")
            response.raise_for_status()
            return response.json()
    
    async def send_message(self, conversation_id: str, message: str) -> Dict[str, Any]:
        """Send a message to a conversation"""
        data = {
            "conversation_id": conversation_id,
            "message": message
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/api/chat", json=data)
            response.raise_for_status()
            return response.json()
    
    async def add_model(self, model_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add a new LLM model"""
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/api/add-llm", json=model_data)
            response.raise_for_status()
            return response.json()
    
    async def delete_model(self, model_id: str) -> Dict[str, Any]:
        """Delete an LLM model"""
        async with httpx.AsyncClient() as client:
            response = await client.delete(f"{self.base_url}/api/delete-llm/{model_id}")
            response.raise_for_status()
            return response.json()
    
    async def analyze_model(self, model_path: str) -> Dict[str, Any]:
        """Analyze a model file"""
        data = {"model_path": model_path}
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/api/analyze-model", json=data)
            response.raise_for_status()
            return response.json()
    
    async def health_check(self) -> Dict[str, Any]:
        """Health check for the LLM Manager"""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/health")
            response.raise_for_status()
            return response.json()

llm_manager_service = LLMManagerService()
