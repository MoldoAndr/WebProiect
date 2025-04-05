# app/core/config.py
from pydantic_settings import BaseSettings
from pydantic import root_validator
import secrets

class Settings(BaseSettings):
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "LLM Studio"
    LLM_MANAGER_URL: str = "http://localhost:5000"
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    
    GOOGLE_MAIL_USER: str | None = None
    GOOGLE_MAIL_APP_PASSWORD: str | None = None

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    MONGO_USER: str = "llmstudio"
    MONGO_PASSWORD: str = "password"
    MONGO_HOST: str = "mongodb"
    MONGO_DB: str = "llm_studio"
    MONGO_URI: str | None = None

    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_CORS_ORIGINS: list[str] = ["*"]
    PRODUCTION: bool = False
    LOG_LEVEL: str = "info"
    DEFAULT_SYSTEM_PROMPT: str = "You are a helpful AI assistant."
    LLM_TIMEOUT: int = 60
    WS_PING_INTERVAL: int = 30

    @root_validator(pre=True)
    def assemble_mongo_uri(cls, values):
        if not values.get("MONGO_URI"):
            user = values.get("MONGO_USER", "llmstudio")
            password = values.get("MONGO_PASSWORD", "password")
            host = values.get("MONGO_HOST", "mongodb")
            db = values.get("MONGO_DB", "llm_studio")
            values["MONGO_URI"] = f"mongodb://{user}:{password}@{host}:27017/{db}?authSource=admin"
        return values

    class Config:
        env_file = ".env"
        case_sensitive = True
        fields = {
            "GOOGLE_MAIL_APP_PASSWORD": {"env": "GOOGLE_MAIL_PASSWORD"},
            "GOOGLE_MAIL_USER": {"env": "GOOGLE_MAIL_USER"},
        }
settings = Settings()