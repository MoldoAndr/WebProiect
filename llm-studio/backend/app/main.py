# app/main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.core.security import get_current_user
from app.api.routes import auth, users, conversations, llms

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="LLM Studio API",
    description="API for LLM Studio web application",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Set to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    logger.info("Starting application")
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    logger.info("Shutting down application")
    await close_mongo_connection()

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
app.include_router(llms.router, prefix="/api/llms", tags=["llms"])
