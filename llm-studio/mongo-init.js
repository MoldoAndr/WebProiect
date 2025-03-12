// mongo-init.js
db = db.getSiblingDB('llm_studio');

// Create collections
db.createCollection('users');
db.createCollection('llms');
db.createCollection('conversations');
db.createCollection('messages');
db.createCollection('analytics');

// Create indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.llms.createIndex({ "name": 1 }, { unique: true });
db.conversations.createIndex({ "user_id": 1 });
db.messages.createIndex({ "conversation_id": 1 });
db.messages.createIndex({ "created_at": 1 });

// Create initial admin user
db.users.insertOne({
    username: "admin",
    email: "admin@llmstudio.com",
    hashed_password: "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", // "password"
    full_name: "System Administrator",
    role: "admin",
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
});

// Create initial technician user
db.users.insertOne({
    username: "technician",
    email: "technician@llmstudio.com",
    hashed_password: "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", // "password"
    full_name: "System Technician",
    role: "technician",
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
});

// Create initial regular user
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
        name: "GPT-3.5-Turbo",
        description: "OpenAI's GPT-3.5 Turbo model",
        image: "openai/gpt-3.5-turbo:latest",
        api_endpoint: "https://api.openai.com/v1/chat/completions",
        parameters: {
            max_tokens: 2048,
            temperature: 0.7,
            top_p: 1.0,
            presence_penalty: 0,
            frequency_penalty: 0
        },
        status: "active",
        created_at: new Date(),
        updated_at: new Date()
    },
    {
        name: "GPT-4",
        description: "OpenAI's GPT-4 model",
        image: "openai/gpt-4:latest",
        api_endpoint: "https://api.openai.com/v1/chat/completions",
        parameters: {
            max_tokens: 4096,
            temperature: 0.7,
            top_p: 1.0,
            presence_penalty: 0,
            frequency_penalty: 0
        },
        status: "active",
        created_at: new Date(),
        updated_at: new Date()
    },
    {
        name: "Claude 3",
        description: "Anthropic's Claude 3 model",
        image: "anthropic/claude:latest",
        api_endpoint: "https://api.anthropic.com/v1/complete",
        parameters: {
            max_tokens_to_sample: 4096,
            temperature: 0.7,
            top_p: 1.0,
            top_k: 5
        },
        status: "active",
        created_at: new Date(),
        updated_at: new Date()
    },
    {
        name: "Llama 3",
        description: "Meta's Llama 3 model",
        image: "meta/llama:latest",
        api_endpoint: "http://localhost:8080/v1/completions",
        parameters: {
            max_tokens: 2048,
            temperature: 0.7,
            top_p: 0.9
        },
        status: "active",
        created_at: new Date(),
        updated_at: new Date()
    }
]);

print("MongoDB initialization completed");
