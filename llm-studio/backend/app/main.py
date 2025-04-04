from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.config import settings
from app.core.db import connect_to_mongo, close_mongo_connection
from app.routes import auth, users, conversations
from app.routes import llm_manager
from app.routes import websocket
from app.routes import admin_chat

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    logger.info("Starting application")
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown():
    logger.info("Shutting down application")
    await close_mongo_connection()

app.include_router(auth, prefix=f"{settings.API_V1_STR}/auth", tags=["authentication"])
app.include_router(users, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(conversations, prefix=f"{settings.API_V1_STR}/conversations", tags=["conversations"])
app.include_router(llm_manager.router, prefix=f"{settings.API_V1_STR}/llm-manager", tags=["llm-manager"])
app.include_router(websocket.router, tags=["websocket"])
app.include_router(admin_chat.router, prefix=f"{settings.API_V1_STR}/admin-chat", tags=["admin-chat"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

@app.get("/")
async def root():
    return {
        "message": "Welcome to LLM Studio API",
        "version": "1.0.0",
        "docs": f"{settings.API_V1_STR}/docs"
    }