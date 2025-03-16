from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.config import settings
from app.core.db import connect_to_mongo, close_mongo_connection
from app.routes import auth, users, llms, conversations

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
    allow_origins=["*"],
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

# Include API routes
app.include_router(auth, prefix=f"{settings.API_V1_STR}/auth", tags=["authentication"])
app.include_router(users, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(llms, prefix=f"{settings.API_V1_STR}/llms", tags=["llms"])
app.include_router(conversations, prefix=f"{settings.API_V1_STR}/conversations", tags=["conversations"])

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to LLM Studio API",
        "version": "1.0.0",
        "docs": f"{settings.API_V1_STR}/docs"
    }
