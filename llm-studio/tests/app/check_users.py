# check_users.py
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_db_users():
    """Check users in the MongoDB database"""
    
    try:
        # MongoDB connection string - update if needed
        mongo_url = "mongodb://llmstudio:change_this_password_in_production@localhost:27017/llm_studio?authSource=admin"
        
        client = AsyncIOMotorClient(mongo_url)
        db = client.get_database("llm_studio")
        
        # List all users
        print("\n=== MongoDB Users ===")
        users = await db.users.find().to_list(length=100)
        
        if not users:
            print("No users found in the database!")
        else:
            print(f"Found {len(users)} users:")
            
            for user in users:
                # Print user details (excluding hashed_password)
                user_data = {
                    "id": str(user.get("_id")),
                    "username": user.get("username"),
                    "email": user.get("email"),
                    "role": user.get("role"),
                    "is_active": user.get("is_active")
                }
                print(json.dumps(user_data, indent=2))
        
        return True
    except Exception as e:
        print(f"Error connecting to MongoDB: {str(e)}")
        return False

if __name__ == "__main__":
    import json
    loop = asyncio.get_event_loop()
    loop.run_until_complete(check_db_users())
