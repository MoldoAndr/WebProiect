# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.config import settings
from app.core.db import connect_to_mongo, close_mongo_connection
from app.routes import auth, users, llms, conversations
# Make sure we import the websocket module
from app.routes import websocket

# Setup logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup and shutdown events
@app.on_event("startup")
async def startup():
    logger.info("Starting application")
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown():
    logger.info("Shutting down application")
    await close_mongo_connection()

# Include standard API routes
app.include_router(auth, prefix="/auth", tags=["authentication"])
app.include_router(users, prefix="/users", tags=["users"])
app.include_router(llms, prefix="/llms", tags=["llms"])
app.include_router(conversations, prefix="/conversations", tags=["conversations"])

# Include WebSocket routes - Add at the root level, not under any prefix
# This is important! WebSocket routes must be at root level, not under /api
app.include_router(websocket.router, tags=["websocket"])

# Include the same routes with the /api prefix for backward compatibility
app.include_router(auth, prefix="/api/auth", tags=["authentication"])
app.include_router(users, prefix="/api/users", tags=["users"])
app.include_router(llms, prefix="/api/llms", tags=["llms"])
app.include_router(conversations, prefix="/api/conversations", tags=["conversations"])

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to LLM Studio API",
        "version": "1.0.0",
        "docs": f"{settings.API_V1_STR}/docs"
    }
