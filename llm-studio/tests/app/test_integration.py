# test_integration.py
import pytest
import requests
import time
from test_config import BACKEND_URL, LLM_URL, TEST_ADMIN, TEST_USER, TEST_TECHNICIAN

def test_full_integration_flow():
    """Test the full application flow"""
    # Step 1: Login
    response = requests.post(
        f"{BACKEND_URL}/auth/login",
        data={"username": TEST_USER["username"], "password": TEST_USER["password"]}
    )
    assert response.status_code == 200
    token_data = response.json()
    token = token_data["access_token"]
    
    # Step 2: Get available LLMs
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BACKEND_URL}/llms", headers=headers)
    assert response.status_code == 200
    llms = response.json()
    assert len(llms) > 0
    
    # Select the first available LLM
    selected_llm = llms[0]
    
    # Step 3: Create a new conversation
    conversation_data = {
        "llm_id": selected_llm["id"],
        "title": f"Integration Test {time.time()}"
    }
    response = requests.post(
        f"{BACKEND_URL}/conversations", 
        headers=headers, 
        json=conversation_data
    )
    assert response.status_code in [200, 201]
    conversation = response.json()
    
    # Step 4: Send a prompt
    prompt_data = {
        "llm_id": selected_llm["id"],
        "prompt": "Hello, what can you tell me about artificial intelligence?",
        "conversation_id": conversation["id"]
    }
    response = requests.post(
        f"{BACKEND_URL}/conversations/prompt", 
        headers=headers, 
        json=prompt_data
    )
    assert response.status_code == 200
    prompt_response = response.json()
    assert "response" in prompt_response
    
    # Step 5: Get conversation history
    response = requests.get(
        f"{BACKEND_URL}/conversations/{conversation['id']}", 
        headers=headers
    )
    assert response.status_code == 200
    updated_conversation = response.json()
    assert len(updated_conversation["messages"]) == 2  # User message and LLM response
    
    # Step 6: Update conversation title
    update_data = {"title": "Updated Integration Test"}
    response = requests.put(
        f"{BACKEND_URL}/conversations/{conversation['id']}", 
        headers=headers, 
        json=update_data
    )
    assert response.status_code == 200
    assert response.json()["title"] == update_data["title"]
    
    # Step 7: Delete conversation
    response = requests.delete(
        f"{BACKEND_URL}/conversations/{conversation['id']}", 
        headers=headers
    )
    assert response.status_code in [200, 204]
    
    # Step 8: Verify deletion
    response = requests.get(
        f"{BACKEND_URL}/conversations/{conversation['id']}", 
        headers=headers
    )
    assert response.status_code == 404
