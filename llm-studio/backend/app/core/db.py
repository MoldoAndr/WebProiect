from motor.motor_asyncio import AsyncIOMotorClient
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db = Database()

async def connect_to_mongo():
    """Connect to MongoDB - simplified connection"""
    logger.info("Connecting to MongoDB...")
    
    try:
        # Connect to MongoDB with single connection string
        db.client = AsyncIOMotorClient(settings.MONGO_URI)
        db.db = db.client.get_database()
        
        # Simple connection test
        await db.client.admin.command('ping')
        logger.info("Connected to MongoDB")
    except Exception as e:
        logger.error(f"Could not connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Close MongoDB connection"""
    if db.client:
        db.client.close()
        logger.info("MongoDB connection closed")

async def get_database():
    """Get database instance"""
    return db.db
