import json
import uuid
import logging
from typing import Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.db import get_database
from app.core.websocket import connection_manager
from app.services.llm_manager_service import llm_manager_service
from app.models.conversation import ConversationCreate
from app.services.conversation_service import create_conversation
from datetime import datetime
from bson import ObjectId
from app.core.security import decode_token

logger = logging.getLogger(__name__)
router = APIRouter()

async def send_error_and_close(websocket: WebSocket, error_message: str) -> None:
    """Helper to send an error JSON message and close the WebSocket."""
    await websocket.send_json({"type": "error", "error": error_message})
    await websocket.close()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    logger.info("Incoming WebSocket connection request.")

    token = websocket.query_params.get("token")
    if not token:
        logger.warning("No token provided. Closing connection.")
        await websocket.close(code=4401)
        return

    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            logger.warning("Invalid token data: 'sub' field missing.")
            await send_error_and_close(websocket, "Invalid token data")
            return

        # Attach user_id to the WebSocket state for future use
        websocket.state.user_id = user_id
        logger.info(f"Token validated for user_id={user_id}")
    except Exception:
        logger.exception("Exception during token validation.")
        await send_error_and_close(websocket, "Authentication failed, please refresh token")
        return

    client_id = str(uuid.uuid4())
    logger.info(f"Assigning client_id={client_id} for user_id={user_id}")
    await connection_manager.connect(websocket, client_id, user_id)
    logger.info(f"WebSocket connected: client_id={client_id}, user_id={user_id}")

    try:
        while True:
            raw_text = await websocket.receive_text()
            logger.info(f"Received raw message: {raw_text}")

            try:
                message = json.loads(raw_text)
            except json.JSONDecodeError:
                logger.error("Received invalid JSON")
                await send_error_and_close(websocket, "Invalid JSON format")
                continue

            message_type = message.get("type")
            logger.info(f"Received message type: {message_type}")

            if message_type == "prompt":
                logger.info("Dispatching to handle_prompt_message")
                await handle_prompt_message(client_id, user_id, message, websocket)
            elif message_type == "conversation_create":
                logger.info("Dispatching to handle_conversation_create")
                await handle_conversation_create(client_id, user_id, message, websocket)
            elif message_type != "ping":
                logger.warning(f"Unknown message type: {message_type}")
                await websocket.send_json({
                    "type": "error",
                    "error": f"Unknown message type: {message_type}"
                })
    except WebSocketDisconnect as e:
        logger.info(
            f"WebSocket disconnected: client_id={client_id}, user_id={user_id}, "
            f"code={e.code}, reason='{e.reason}'"
        )
        connection_manager.disconnect(client_id)
    except Exception:
        logger.exception(f"Error in WebSocket loop for client_id={client_id}")
        await websocket.close()
    finally:
        logger.info(f"Cleaning up WebSocket connection: client_id={client_id}")

async def handle_conversation_create(client_id: str, user_id: str, message: Dict[str, Any], websocket: WebSocket):
    """Handle conversation creation with database synchronization and detailed logging."""
    logger.info(f"[Conversation Create] Received request from client_id={client_id}, user_id={user_id}. Message: {message}")
    
    model_id = message.get("model_id")
    if not model_id:
        error_msg = "Missing model_id"
        logger.error(f"[Conversation Create] {error_msg} for client_id={client_id}, user_id={user_id}")
        await websocket.send_json({"type": "error", "error": error_msg})
        return

    try:
        # Create the conversation in our database.
        conversation_data = ConversationCreate(
            title=f"New conversation with {model_id}",
            llm_id=model_id
        )
        logger.info(f"[Conversation Create] Creating database conversation for user_id={user_id} using model_id={model_id}")
        db_conversation = await create_conversation(user_id, conversation_data)
        logger.info(f"[Conversation Create] Database conversation created with id={db_conversation.id} and title='{db_conversation.title}'")
        
        # Synchronize with LLMManager.
        # The LLMManager service now reuses the provided conversation_id.
        logger.info(f"[Conversation Create] Synchronizing conversation in LLMManager for model_id={model_id} with conversation_id={db_conversation.id}")
        await llm_manager_service.create_conversation(model_id, db_conversation.id)
        logger.info(f"[Conversation Create] Successfully synchronized conversation in LLMManager for conversation_id={db_conversation.id}")
        
        success_response = {
            "type": "conversation_created",
            "conversation_id": db_conversation.id,
            "title": db_conversation.title,
            "llm_id": model_id
        }
        logger.info(f"[Conversation Create] Sending success response: {success_response}")
        await websocket.send_json(success_response)
        
    except Exception as e:
        logger.error(f"[Conversation Create] Error creating conversation for user_id={user_id} with model_id={model_id}: {e}", exc_info=True)
        await websocket.send_json({"type": "error", "error": f"Error creating conversation: {str(e)}"})

async def handle_prompt_message(client_id: str, user_id: str, message: Dict[str, Any], websocket: WebSocket):
    """Handle a prompt message for an LLM with database synchronization"""
    conversation_id = message.get("conversation_id")
    prompt = message.get("prompt")
    
    if not conversation_id or not prompt:
        logger.warning(f"Missing conversation_id or prompt from user {user_id}. Message: {message}")
        await websocket.send_json({"type": "error", "error": "Missing conversation_id or prompt"})
        return

    logger.info(f"Received prompt from user {user_id} for conversation {conversation_id}.")
    await websocket.send_json({"type": "acknowledgment", "status": "processing", "conversation_id": conversation_id})
    logger.debug(f"Sent acknowledgment for conversation {conversation_id}.")

    try:
        db = await get_database()
        logger.debug(f"Connected to database for conversation {conversation_id}.")

        logger.info(f"Fetching conversation {conversation_id} from database for user {user_id}.")
        conv = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
        if not conv or conv["user_id"] != user_id:
            logger.warning(f"Access denied for user {user_id} on conversation {conversation_id}.")
            await websocket.send_json({"type": "error", "error": "You don't have access to this conversation"})
            return
        
        message_doc = {
            "conversation_id": conversation_id,
            "role": "user",
            "content": prompt,
            "created_at": datetime.utcnow(),
            "metadata": {}
        }
        logger.info(f"Inserting user message into conversation {conversation_id}.")
        await db.messages.insert_one(message_doc)
        
        logger.debug(f"Updating conversation {conversation_id} timestamp (first update).")
        await db.conversations.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$set": {"updated_at": datetime.utcnow()}}
        )
        
        streaming_content = ""
        logger.info(f"Starting streaming response for conversation {conversation_id}.")
        async for chunk in llm_manager_service.stream_message(conversation_id, prompt):
            streaming_content += chunk
            logger.debug(f"Received chunk of length {len(chunk)} for conversation {conversation_id}.")
            await websocket.send_json({
                "type": "stream",
                "conversation_id": conversation_id,
                "content": chunk
            })
            
        assistant_message = {
            "conversation_id": conversation_id,
            "role": "assistant",
            "content": streaming_content,
            "created_at": datetime.utcnow(),
            "metadata": {}
        }
        logger.info(f"Inserting assistant response into conversation {conversation_id}.")
        await db.messages.insert_one(assistant_message)
        
        logger.debug(f"Updating conversation {conversation_id} timestamp (second update).")
        await db.conversations.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$set": {"updated_at": datetime.utcnow()}}
        )
        
        logger.info(f"Streaming complete for conversation {conversation_id}. Sending completion message.")
        await websocket.send_json({"type": "complete", "conversation_id": conversation_id})
        
    except Exception as e:
        logger.error(f"Error processing prompt for conversation {conversation_id}: {e}")
        await websocket.send_json({"type": "error", "error": f"Error processing prompt: {str(e)}"})
