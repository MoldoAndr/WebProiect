# app/core/websocket.py
import logging
from typing import Dict, List, Any, Callable, Awaitable
from fastapi import WebSocket, WebSocketDisconnect, status
from app.core.security import decode_token

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manage WebSocket connections"""
    
    def __init__(self):
        # Store active connections: {client_id: {user_id: str, websocket: WebSocket}}
        self.active_connections: Dict[str, Dict[str, Any]] = {}
        
    async def connect(self, websocket: WebSocket, client_id: str, user_id: str):
        """Accept a WebSocket connection and store it"""
        await websocket.accept()
        self.active_connections[client_id] = {
            "user_id": user_id,
            "websocket": websocket
        }
        logger.info(f"Client {client_id} connected (user: {user_id})")
        
    def disconnect(self, client_id: str):
        """Remove a WebSocket connection"""
        if client_id in self.active_connections:
            user_id = self.active_connections[client_id]["user_id"]
            del self.active_connections[client_id]
            logger.info(f"Client {client_id} disconnected (user: {user_id})")
    
    async def send_message(self, client_id: str, message: Any):
        """Send a message to a specific client"""
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]["websocket"]
            if isinstance(message, str):
                await websocket.send_text(message)
            else:
                await websocket.send_json(message)
            
    async def broadcast(self, message: Any, user_id: str = None):
        """Broadcast a message to all connections or filtered by user_id"""
        disconnected = []
        
        for client_id, connection in self.active_connections.items():
            if user_id and connection["user_id"] != user_id:
                continue
                
            websocket = connection["websocket"]
            try:
                if isinstance(message, str):
                    await websocket.send_text(message)
                else:
                    await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to client {client_id}: {e}")
                disconnected.append(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected:
            self.disconnect(client_id)

# Create a singleton instance
connection_manager = ConnectionManager()
