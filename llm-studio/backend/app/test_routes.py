import pytest
import respx
import asyncio
from httpx import Response
from app.services.llm_manager_service import LLMManagerService

# Instantiate the service once for all tests.
service = LLMManagerService()

# --- Test GET Models (list command) ---
@pytest.mark.asyncio
async def test_get_models_success():
    expected_models = {
        "llama-2-7b-chat-q2-k": {
            "context_window": 2048,
            "id": "llama-2-7b-chat-q2-k",
            "n_gpu_layers": 0,
            "n_threads": 4,
            "size_mb": 2695.0270385742188,
            "type": "llama"
        },
        "phi-2-q3-k-s": {
            "context_window": 2048,
            "id": "phi-2-q3-k-s",
            "n_gpu_layers": 0,
            "n_threads": 4,
            "size_mb": 1192.8748474121094,
            "type": "phi2"
        },
        "tinyllama-1-1b-chat-v1-0-q2-k": {
            "context_window": 2048,
            "id": "tinyllama-1-1b-chat-v1-0-q2-k",
            "n_gpu_layers": 0,
            "n_threads": 4,
            "size_mb": 460.7357177734375,
            "type": "llama"
        }
    }
    with respx.mock(base_url="http://llm-api:5000") as mock:
        mock.get("/api/models").respond(200, json=expected_models)
        models = await service.get_models()
        # We expect the returned models to exactly match the mocked dictionary.
        assert models == expected_models

# --- Test Create Conversation (create command) ---
@pytest.mark.asyncio
async def test_create_conversation_success():
    # Mimic a call like: bash llm_chat.sh create phi2 my_philosophy_chat
    expected_response = {
        "conversation_id": "my_philosophy_chat",
        "model_id": "phi-2-q3-k-s"
    }
    with respx.mock(base_url="http://llm-api:5000") as mock:
        mock.post("/api/conversation").respond(200, json=expected_response)
        response = await service.create_conversation("phi-2-q3-k-s", "my_philosophy_chat")
        assert response == expected_response

# --- Test Get Conversation History (history command) ---
@pytest.mark.asyncio
async def test_get_conversation_success():
    expected_history = {
        "conversation_id": "my_philosophy_chat",
        "messages": [
            {"role": "user", "text": "What is the meaning of life?"},
            {"role": "assistant", "text": "The meaning of life is 42."}
        ]
    }
    with respx.mock(base_url="http://llm-api:5000") as mock:
        mock.get("/api/conversation/my_philosophy_chat").respond(200, json=expected_history)
        history = await service.get_conversation("my_philosophy_chat")
        assert history == expected_history

# --- Test Reset Conversation (reset command) ---
@pytest.mark.asyncio
async def test_reset_conversation_success():
    expected_response = {
        "conversation_id": "my_philosophy_chat",
        "status": "reset"
    }
    with respx.mock(base_url="http://llm-api:5000") as mock:
        mock.post("/api/conversation/my_philosophy_chat/reset").respond(200, json=expected_response)
        response = await service.reset_conversation("my_philosophy_chat")
        assert response == expected_response

# --- Test Send Message (chat command) ---
@pytest.mark.asyncio
async def test_send_message_success():
    # Mimic sending a message like: bash llm_chat.sh chat my_philosophy_chat "What is the meaning of life?"
    expected_response = {
        "response": "The meaning of life is 42."
    }
    with respx.mock(base_url="http://llm-api:5000") as mock:
        mock.post("/api/chat").respond(200, json=expected_response)
        response = await service.send_message("my_philosophy_chat", "What is the meaning of life?")
        assert response == expected_response

# --- Optionally, Test Health Check ---
@pytest.mark.asyncio
async def test_health_check_success():
    expected_response = {"status": "healthy"}
    with respx.mock(base_url="http://llm-api:5000") as mock:
        mock.get("/health").respond(200, json=expected_response)
        response = await service.health_check()
        assert response == expected_response

