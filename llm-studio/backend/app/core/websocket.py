# app/routes/websocket.py
import json
import uuid
import logging
from typing import Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from app.core.security import decode_token, get_current_user_ws
from app.core.websocket import connection_manager
from app.services.llm_manager_service import llm_manager_service

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for realtime LLM responses"""
    try:
        # Authenticate the user
        user = await get_current_user_ws(websocket)
        user_id = user.id
        
        # Generate a unique client ID
        client_id = str(uuid.uuid4())
        
        # Accept the connection
        await connection_manager.connect(websocket, client_id, user_id)
        
        try:
            while True:
                # Receive a message from the client
                message_text = await websocket.receive_text()
                
                try:
                    # Parse the message
                    message = json.loads(message_text)
                    message_type = message.get("type", "")
                    
                    if message_type == "ping":
                        # Handle ping messages
                        await websocket.send_json({"type": "pong"})
                        
                    elif message_type == "prompt":
                        # Handle LLM prompt request
                        await handle_prompt_message(client_id, user_id, message, websocket)
                        
                    elif message_type == "conversation_create":
                        # Handle conversation creation
                        await handle_conversation_create(client_id, user_id, message, websocket)
                        
                    else:
                        logger.warning(f"Unknown message type: {message_type}")
                        await websocket.send_json({
                            "type": "error",
                            "error": "Unknown message type"
                        })
                        
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON received: {message_text[:100]}")
                    await websocket.send_json({
                        "type": "error",
                        "error": "Invalid JSON"
                    })
                    
        except WebSocketDisconnect:
            connection_manager.disconnect(client_id)
            
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass

async def handle_prompt_message(client_id: str, user_id: str, message: Dict[str, Any], websocket: WebSocket):
    """Handle a prompt message for an LLM using the new LLMManager"""
    conversation_id = message.get("conversation_id")
    prompt = message.get("prompt")
    
    if not conversation_id or not prompt:
        await websocket.send_json({
            "type": "error",
            "error": "Missing conversation_id or prompt"
        })
        return
    
    # Send an acknowledgment
    await websocket.send_json({
        "type": "acknowledgment",
        "status": "processing",
        "conversation_id": conversation_id
    })
    
    try:
        # Get a streaming response from the LLMManager
        async for chunk in llm_manager_service.stream_message(conversation_id, prompt):
            await websocket.send_json({
                "type": "stream",
                "conversation_id": conversation_id,
                "content": chunk
            })
            
        # Send completion message
        await websocket.send_json({
            "type": "complete",
            "conversation_id": conversation_id
        })
        
    except Exception as e:
        logger.error(f"Error processing prompt: {e}")
        await websocket.send_json({
            "type": "error",
            "error": f"Error processing prompt: {str(e)}"
        })

async def handle_conversation_create(client_id: str, user_id: str, message: Dict[str, Any], websocket: WebSocket):
    """Handle conversation creation through LLMManager"""
    model_id = message.get("model_id")
    conversation_id = message.get("conversation_id")
    
    if not model_id:
        await websocket.send_json({
            "type": "error",
            "error": "Missing model_id"
        })
        return
    
    try:
        # Create a conversation using the LLMManager service
        result = await llm_manager_service.create_conversation(model_id, conversation_id)
        
        # Send success response
        await websocket.send_json({
            "type": "conversation_created",
            "conversation_id": result["conversation_id"]
        })
        
    except Exception as e:
        logger.error(f"Error creating conversation: {e}")
        await websocket.send_json({
            "type": "error",
            "error": f"Error creating conversation: {str(e)}"
        })