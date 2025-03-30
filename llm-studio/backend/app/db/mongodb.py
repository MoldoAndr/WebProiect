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
    logger.info("Connecting to MongoDB...")
    
    mongo_user = os.environ.get("MONGO_USER", "llmstudio")
    mongo_password = os.environ.get("MONGO_PASSWORD", "change_this_password_in_production")
    mongo_host = os.environ.get("MONGO_HOST", "mongodb")
    mongo_db = os.environ.get("MONGO_DB", "llm_studio")
    
    mongo_url = f"mongodb://{mongo_user}:{mongo_password}@{mongo_host}:27017/{mongo_db}?authSource=admin"
    
    try:
        db.client = AsyncIOMotorClient(mongo_url)
        
        await db.client.admin.command('ping')
        
        db.db = db.client.get_database(mongo_db)
        logger.info("Connected to MongoDB")
    except ConnectionFailure as e:
        logger.error(f"Could not connect to MongoDB: {e}")
        raise
    except OperationFailure as e:
        logger.error(f"Authentication failed: {e}")
        raise

async def close_mongo_connection():
    """Close MongoDB connection"""
    logger.info("Closing MongoDB connection...")
    if db.client:
        db.client.close()
        logger.info("MongoDB connection closed")

async def get_database():
    """Get database instance"""
    return db.db
