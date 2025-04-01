import asyncio
import logging
from app.core.db import connect_to_mongo, close_mongo_connection
from app.services.llm_manager_service import llm_manager_service

logger = logging.getLogger(__name__)

async def sync_llms():
    try:
        await connect_to_mongo()
        await llm_manager_service.start_worker()
        result = await llm_manager_service.sync_llms_to_database()
        logger.info(f"LLM synchronization complete: {result}")
    finally:
        await close_mongo_connection()

async def run_conversation_sync_task():
    try:
        await connect_to_mongo()
        result = await llm_manager_service.sync_all_conversations_with_llm_manager()
        logger.info(f"Global Conversation synchronization task complete: {result}")
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(sync_llms())
    asyncio.run(run_conversation_sync_task())