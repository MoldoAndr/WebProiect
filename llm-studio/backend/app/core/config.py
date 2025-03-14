from pydantic_settings import BaseSettings
import os
import secrets

class Settings(BaseSettings):
    # API
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "LLM Studio"
    
    # Security - simplified but still secure
    SECRET_KEY: str = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # MongoDB - simplified connection
    MONGO_URI: str = os.getenv(
        "MONGO_URI", 
        f"mongodb://{os.getenv('MONGO_USER', 'llmstudio')}:{os.getenv('MONGO_PASSWORD', 'password')}@{os.getenv('MONGO_HOST', 'mongodb')}:27017/{os.getenv('MONGO_DB', 'llm_studio')}?authSource=admin"
    )
    
    # CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    BACKEND_CORS_ORIGINS: list = [
        FRONTEND_URL,
        "http://localhost",
        "https://localhost",
    ]
    
    # Environment
    PRODUCTION: bool = os.getenv("PRODUCTION", "false").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info").lower()
    
    # LLM settings
    DEFAULT_SYSTEM_PROMPT: str = "You are a helpful AI assistant."

    class Config:
        env_file = ".env"
        case_sensitive = True

# Create settings instance to export
settings = Settings()
