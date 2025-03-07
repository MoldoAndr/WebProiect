from pydantic_settings import BaseSettings
import os
from typing import List, Optional


class Settings(BaseSettings):
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "LLM Studio"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "development_secret_key_change_in_production")
    REFRESH_SECRET_KEY: str = os.getenv("REFRESH_SECRET_KEY", "development_refresh_key_change_in_production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 days
    
    # MongoDB
    MONGO_USER: str = os.getenv("MONGO_USER", "llmstudio")
    MONGO_PASSWORD: str = os.getenv("MONGO_PASSWORD", "password")
    MONGO_HOST: str = os.getenv("MONGO_HOST", "mongodb")
    MONGO_DB: str = os.getenv("MONGO_DB", "llm_studio")
    MONGO_PORT: int = int(os.getenv("MONGO_PORT", "27017"))
    
    # MongoDB connection string
    @property
    def MONGO_CONNECTION_STRING(self) -> str:
        return f"mongodb://{self.MONGO_USER}:{self.MONGO_PASSWORD}@{self.MONGO_HOST}:{self.MONGO_PORT}/{self.MONGO_DB}"
    
    # CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    BACKEND_CORS_ORIGINS: List[str] = [FRONTEND_URL]
    
    # Environment
    PRODUCTION: bool = os.getenv("PRODUCTION", "false").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info").lower()
    
    # LLM settings
    DEFAULT_SYSTEM_PROMPT: str = os.getenv("DEFAULT_SYSTEM_PROMPT", "You are a helpful AI assistant.")
    LLM_TIMEOUT: int = int(os.getenv("LLM_TIMEOUT", "60"))
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
