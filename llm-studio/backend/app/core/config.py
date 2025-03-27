# app/core/config.py
from pydantic_settings import BaseSettings
import os
import secrets

class Settings(BaseSettings):
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "LLM Studio"
    LLM_MANAGER_URL: str = "http://localhost:5000"
    SECRET_KEY: str = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    MONGO_URI: str = os.getenv(
        "MONGO_URI", 
        f"mongodb://{os.getenv('MONGO_USER', 'llmstudio')}:{os.getenv('MONGO_PASSWORD', 'password')}@{os.getenv('MONGO_HOST', 'mongodb')}:27017/{os.getenv('MONGO_DB', 'llm_studio')}?authSource=admin"
    )
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    BACKEND_CORS_ORIGINS: list = [
        "*",
    ]
    PRODUCTION: bool = os.getenv("PRODUCTION", "false").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info").lower()
    DEFAULT_SYSTEM_PROMPT: str = "You are a helpful AI assistant."
    LLM_TIMEOUT: int = int(os.getenv("LLM_TIMEOUT", "60"))
    WS_PING_INTERVAL: int = int(os.getenv("WS_PING_INTERVAL", "30"))
    class Config:
        env_file = ".env"
        case_sensitive = True
settings = Settings()