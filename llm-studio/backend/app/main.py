from fastapi import FastAPI, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.core.config import settings
from app.core.security import get_current_user, rate_limit
from app.api.routes import auth, users,  llms
from app.routes import conversations
import time

# Setup logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="LLM Studio API",
    description="API for LLM Studio web application",
    version="1.0.0",
    docs_url="/api/docs" if not settings.PRODUCTION else None,
    redoc_url="/api/redoc" if not settings.PRODUCTION else None,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Rate limiting middleware
@app.middleware("http")
async def rate_limiting_middleware(request: Request, call_next):
    await rate_limit(request)
    return await call_next(request)

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
    return {"status": "healthy", "version": "1.0.0"}

# Include routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["Users"])
app.include_router(conversations.router, prefix=f"{settings.API_V1_STR}/conversations", tags=["Conversations"])
app.include_router(llms.router, prefix=f"{settings.API_V1_STR}/llms", tags=["LLMs"])

# Root redirect to API docs
@app.get("/")
async def root_redirect():
    return {"message": "Welcome to LLM Studio API. Visit /api/docs for API documentation."}
