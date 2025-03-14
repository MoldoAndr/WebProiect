// MongoDB initialization script
db = db.getSiblingDB('llm_studio');

// Create collections
db.createCollection('users');
db.createCollection('llms');
db.createCollection('conversations');
db.createCollection('messages');

// Create indexes
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.conversations.createIndex({ "user_id": 1 });
db.messages.createIndex({ "conversation_id": 1 });

// Create initial admin user
db.users.insertOne({
    username: "admin",
    email: "admin@llmstudio.com",
    hashed_password: "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", // "password"
    full_name: "Admin User",
    role: "admin",
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
});

// Create initial user
db.users.insertOne({
    username: "user",
    email: "user@llmstudio.com",
    hashed_password: "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", // "password"
    full_name: "Regular User",
    role: "user",
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
});

// Create initial LLM definitions
db.llms.insertMany([
    {
        name: "GPT-3.5",
        description: "OpenAI's GPT-3.5 model",
        api_endpoint: "https://api.openai.com/v1/chat/completions",
        parameters: {
            max_tokens: 2048,
            temperature: 0.7
        },
        status: "active",
        created_at: new Date(),
        updated_at: new Date()
    },
    {
        name: "GPT-4",
        description: "OpenAI's GPT-4 model - more powerful",
        api_endpoint: "https://api.openai.com/v1/chat/completions",
        parameters: {
            max_tokens: 4096,
            temperature: 0.7
        },
        status: "active",
        created_at: new Date(),
        updated_at: new Date()
    },
    {
        name: "Claude 3",
        description: "Anthropic's Claude 3 model",
        api_endpoint: "https://api.anthropic.com/v1/complete",
        parameters: {
            max_tokens_to_sample: 4096,
            temperature: 0.7
        },
        status: "active",
        created_at: new Date(),
        updated_at: new Date()
    }
]);

print("MongoDB initialization completed successfully");
