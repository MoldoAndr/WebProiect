from motor.motor_asyncio import AsyncIOMotorClient
import logging
from app.core.config import settings
import ssl

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db = Database()

async def connect_to_mongo():
    """Connect to MongoDB with enhanced security"""
    logger.info("Connecting to MongoDB...")
    
    try:
        conn_options = {
            "serverSelectionTimeoutMS": 5000,
            "connectTimeoutMS": 10000,
            "retryWrites": True,
            "retryReads": True
        }
        
        if settings.PRODUCTION:
            conn_options.update({
                "ssl": True,
                "ssl_cert_reqs": ssl.CERT_REQUIRED
            })
        
        db.client = AsyncIOMotorClient(settings.MONGO_URI, **conn_options)
        db.db = db.client.get_database()
        
        await db.client.admin.command('ping')
        logger.info("Connected to MongoDB successfully")
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
