import httpx
import logging
import asyncio
from typing import Optional, Dict, List, Any, AsyncIterator, Tuple
from datetime import datetime
from app.core.config import settings

logger = logging.getLogger(__name__)

class LLMManagerService:
    """Service to interact with the new LLMManager API with streaming support, plus a request queue
    to ensure only one prompt is processed at a time."""
    
    def __init__(self):
        self.base_url = "http://llm-api:5000"
        logger.info(f"LLMManager service initialized with base URL: {self.base_url}")
        
        self.request_queue: asyncio.Queue[Tuple[str, str, asyncio.Future, str]] = asyncio.Queue()
        self._worker_task = asyncio.create_task(self._process_queue())
    
    async def _process_queue(self):
        """Background worker that processes requests from the queue sequentially."""
        while True:
            conversation_id, message, future, mode = await self.request_queue.get()
            try:
                if mode == 'send':
                    logger.info(f"Processing send request for conversation {conversation_id}")
                    result = await self.send_message(conversation_id, message)
                elif mode == 'stream':
                    logger.info(f"Processing stream request for conversation {conversation_id}")
                    chunks = []
                    async for chunk in self.stream_message(conversation_id, message):
                        chunks.append(chunk)
                    result = ''.join(chunks)
                else:
                    raise ValueError("Unknown mode in request queue")
                future.set_result(result)
            except Exception as e:
                logger.error(f"Error processing queued request: {e}", exc_info=True)
                future.set_exception(e)
            finally:
                self.request_queue.task_done()
    
    async def queue_send_message(self, conversation_id: str, message: str) -> Dict[str, Any]:
        """Enqueue a send_message request so that only one is processed at a time."""
        loop = asyncio.get_running_loop()
        future = loop.create_future()
        await self.request_queue.put((conversation_id, message, future, 'send'))
        return await future

    async def queue_stream_message(self, conversation_id: str, message: str) -> str:
        """Enqueue a stream_message request and return the complete response as a string."""
        loop = asyncio.get_running_loop()
        future = loop.create_future()
        await self.request_queue.put((conversation_id, message, future, 'stream'))
        return await future

    async def get_models(self) -> Dict[str, Any]:
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
                    await asyncio.sleep(1)
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
        if conversation_id is not None:
            try:
                # Convert the hex string to an integer (base 16)
                conv_int = int(conversation_id, 16)
                # Subtract 1
                adjusted_conv_int = conv_int - 1
                # Format back to a 24-character hex string (lowercase)
                adjusted_conversation_id = format(adjusted_conv_int, '024x')
            except Exception as e:
                raise ValueError("Invalid conversation_id format, must be a valid 24-character hex string") from e
        else:
            adjusted_conversation_id = None

        data = {
            "model_id": model_id,
            "conversation_id": adjusted_conversation_id
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{self.base_url}/api/conversation", json=data)
            response.raise_for_status()
            return response.json()

    
    async def get_conversation(self, conversation_id: str) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{self.base_url}/api/conversation/{conversation_id}")
            response.raise_for_status()
            return response.json()
    
    async def reset_conversation(self, conversation_id: str) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{self.base_url}/api/conversation/{conversation_id}/reset")
            response.raise_for_status()
            return response.json()
    
    async def send_message(self, conversation_id: str, message: str) -> Dict[str, Any]:
        data = {
            "conversation_id": conversation_id,
            "message": message
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(f"{self.base_url}/api/chat", json=data)
            response.raise_for_status()
            return response.json()
        
    async def stream_message(self, conversation_id: str, message: str) -> AsyncIterator[str]:
        import json
        data = {"conversation_id": conversation_id, "message": message}
        print(data)
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream("POST", f"{self.base_url}/api/chat", json=data) as response:
                    response.raise_for_status()
                    async for chunk in response.aiter_text():
                        chunk = chunk.strip()
                        if not chunk:
                            continue
                        try:
                            json_data = json.loads(chunk)
                            if "error" in json_data:
                                logger.error(f"Error in stream: {json_data['error']}")
                                yield f"Error: {json_data['error']}"
                                return
                            content = json_data.get("response") or json_data.get("text") or json_data.get("content", "")
                            yield content
                        except json.JSONDecodeError:
                            yield chunk
        except asyncio.TimeoutError:
            logger.error("Timeout streaming response")
            yield "Error: Request timed out"
        except Exception as e:
            logger.error(f"Error streaming response: {e}")
            yield f"Error: {str(e)}"

    async def add_model(self, model_data: Dict[str, Any]) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(f"{self.base_url}/api/add-llm", json=model_data)
            response.raise_for_status()
            return response.json()
    
    async def delete_model(self, model_id: str) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(f"{self.base_url}/api/delete-llm/{model_id}")
            response.raise_for_status()
            return response.json()
    
    async def analyze_models(self, model_path: str) -> Dict[str, Any]:
        data = {"model_path": model_path}
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{self.base_url}/api/analyze-model", json=data)
            response.raise_for_status()
            return response.json()
    
    async def initialize_models(self, models_config: List[Dict[str, Any]]) -> Dict[str, Any]:
        data = {"models": models_config}
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(f"{self.base_url}/api/initialize", json=data)
            response.raise_for_status()
            return response.json()
    
    async def health_check(self) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{self.base_url}/health")
            response.raise_for_status()
            return response.json()

    async def sync_llms_to_database(self) -> Dict[str, Any]:
        try:
            llm_models = await self.get_models()
            from app.core.db import get_database
            db = await get_database()
            for llm_id, llm_data in llm_models.items():
                await db.llms.update_one(
                    {"_id": llm_id},
                    {"$set": {
                        "_id": llm_id,
                        "name": llm_data.get("id", llm_id),
                        "type": llm_data.get("type", "unknown"),
                        "description": f"{llm_data.get('type', 'LLM')} model ({llm_data.get('size_mb', 0)/1024:.1f} GB)",
                        "token_limit": llm_data.get("context_window", 2048),
                        "api_endpoint": "internal://llm-manager",
                        "parameters": {
                            "max_tokens": llm_data.get("context_window", 2048),
                            "temperature": llm_data.get("temperature", 0.7)
                        },
                        "status": "active",
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }},
                    upsert=True
                )
            return {"success": True, "llms_synchronized": len(llm_models)}
        except Exception as e:
            logger.error(f"Failed to sync LLMs to database: {e}")
            return {"success": False, "error": str(e)}

llm_manager_service = LLMManagerService()
