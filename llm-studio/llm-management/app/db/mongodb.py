"""
MongoDB connection module for LLM management service.
"""
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure, OperationFailure
import logging
import os

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db = Database()

async def connect_to_mongo():
    """Connect to MongoDB"""
    logger.info("Connecting to MongoDB from LLM Management service...")
    
    # Get MongoDB credentials from environment variables
    mongo_user = os.environ.get("MONGO_USER", "llmstudio")
    mongo_password = os.environ.get("MONGO_PASSWORD", "change_this_password_in_production")
    mongo_host = os.environ.get("MONGO_HOST", "mongodb")
    mongo_db = os.environ.get("MONGO_DB", "llm_studio")
    
    # Build connection string with proper authentication source
    mongo_url = f"mongodb://{mongo_user}:{mongo_password}@{mongo_host}:27017/{mongo_db}?authSource=admin"
    
    try:
        # Connect to MongoDB
        db.client = AsyncIOMotorClient(mongo_url)
        
        # Verify connection by sending a ping
        await db.client.admin.command('ping')
        
        db.db = db.client.get_database(mongo_db)
        logger.info("Connected to MongoDB from LLM Management service")
    except ConnectionFailure as e:
        logger.error(f"Could not connect to MongoDB: {e}")
        raise
    except OperationFailure as e:
        logger.error(f"Authentication failed: {e}")
        raise

async def close_mongo_connection():
    """Close MongoDB connection"""
    logger.info("Closing MongoDB connection from LLM Management service...")
    if db.client:
        db.client.close()
        logger.info("MongoDB connection closed from LLM Management service")

async def get_database():
    """Get database instance"""
    return db.db
