# test_database.py
import pytest
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from test_config import TEST_ENV

@pytest.fixture(scope="module")
async def db_client():
    """Create a database client for testing"""
    mongo_url = f"mongodb://{TEST_ENV['MONGO_USER']}:{TEST_ENV['MONGO_PASSWORD']}@{TEST_ENV['MONGO_HOST']}:27017/{TEST_ENV['MONGO_DB']}?authSource=admin"
    client = AsyncIOMotorClient(mongo_url)
    yield client
    await client.close()

@pytest.fixture(scope="module")
async def test_db(db_client):
    """Get test database"""
    db = db_client[TEST_ENV["MONGO_DB"]]
    yield db
    # Clean up test data
    for collection in await db.list_collection_names():
        if collection.startswith("test_"):
            await db.drop_collection(collection)

@pytest.mark.asyncio
async def test_db_connection(test_db):
    """Test database connection"""
    result = await test_db.command("ping")
    assert result["ok"] == 1.0

@pytest.mark.asyncio
async def test_user_collection(test_db):
    """Test user collection operations"""
    # Create a test user
    test_user = {
        "username": f"test_user_{pytest.get_unique_id()}",
        "email": f"test_{pytest.get_unique_id()}@example.com",
        "hashed_password": "hashed_test_password",
        "role": "user",
        "is_active": True
    }
    
    result = await test_db.users.insert_one(test_user)
    assert result.acknowledged
    
    # Find the created user
    user = await test_db.users.find_one({"_id": result.inserted_id})
    assert user is not None
    assert user["username"] == test_user["username"]
    
    # Update the user
    update_result = await test_db.users.update_one(
        {"_id": result.inserted_id},
        {"$set": {"role": "technician"}}
    )
    assert update_result.modified_count == 1
    
    # Verify update
    updated_user = await test_db.users.find_one({"_id": result.inserted_id})
    assert updated_user["role"] == "technician"
    
    # Delete the user
    delete_result = await test_db.users.delete_one({"_id": result.inserted_id})
    assert delete_result.deleted_count == 1

@pytest.mark.asyncio
async def test_conversation_collection(test_db):
    """Test conversation collection operations"""
    # Create test conversation
    test_conversation = {
        "user_id": "test_user_id",
        "llm_id": "test_llm_id",
        "title": "Test Conversation",
        "messages": []
    }
    
    result = await test_db.conversations.insert_one(test_conversation)
    assert result.acknowledged
    
    # Add message to conversation
    test_message = {
        "conversation_id": str(result.inserted_id),
        "role": "user",
        "content": "Hello, world!",
    }
    
    message_result = await test_db.messages.insert_one(test_message)
    assert message_result.acknowledged
    
    # Find messages for conversation
    messages = await test_db.messages.find(
        {"conversation_id": str(result.inserted_id)}
    ).to_list(length=10)
    
    assert len(messages) == 1
    assert messages[0]["content"] == "Hello, world!"
    
    # Delete conversation and messages
    await test_db.conversations.delete_one({"_id": result.inserted_id})
    await test_db.messages.delete_many({"conversation_id": str(result.inserted_id)})
