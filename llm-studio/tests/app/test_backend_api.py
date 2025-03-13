# test_backend_api.py
import pytest
import requests
import json
from test_config import BACKEND_URL, TEST_ADMIN, TEST_USER, TEST_TECHNICIAN

@pytest.fixture
def admin_token():
    """Get admin auth token"""
    # Check if we should use JSON or form data
    # Try JSON first
    response = requests.post(
        f"{BACKEND_URL}/auth/login",
        json={"username": TEST_ADMIN["username"], "password": TEST_ADMIN["password"]}
    )
    
    # If that fails, try form data
    if response.status_code != 200:
        print(f"JSON login failed with {response.status_code}. Trying form data...")
        response = requests.post(
            f"{BACKEND_URL}/auth/login",
            data={"username": TEST_ADMIN["username"], "password": TEST_ADMIN["password"]}
        )
    
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]

@pytest.fixture
def user_token():
    """Get regular user auth token"""
    # Check if we should use JSON or form data
    # Try JSON first
    response = requests.post(
        f"{BACKEND_URL}/auth/login",
        json={"username": TEST_USER["username"], "password": TEST_USER["password"]}
    )
    
    # If that fails, try form data
    if response.status_code != 200:
        print(f"JSON login failed with {response.status_code}. Trying form data...")
        response = requests.post(
            f"{BACKEND_URL}/auth/login",
            data={"username": TEST_USER["username"], "password": TEST_USER["password"]}
        )
    
    assert response.status_code == 200, f"User login failed: {response.text}"
    return response.json()["access_token"]

def test_health_endpoint():
    """Test health endpoint"""
    response = requests.get(f"{BACKEND_URL}/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_user_profile(user_token):
    """Test getting user profile"""
    headers = {"Authorization": f"Bearer {user_token}"}
    response = requests.get(f"{BACKEND_URL}/users/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == TEST_USER["username"]

def test_admin_list_users(admin_token):
    """Test admin listing all users"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.get(f"{BACKEND_URL}/users", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

def test_create_conversation(user_token):
    """Test creating a new conversation"""
    headers = {"Authorization": f"Bearer {user_token}"}
    data = {
        "llm_id": "1",  # Make sure this LLM ID exists
        "title": "Test Conversation"
    }
    response = requests.post(f"{BACKEND_URL}/conversations", headers=headers, json=data)
    assert response.status_code in [200, 201], f"Failed to create conversation: {response.text}"
    conversation = response.json()
    assert conversation["title"] == "Test Conversation"
    return conversation["id"]

def test_list_conversations(user_token):
    """Test listing user conversations"""
    headers = {"Authorization": f"Bearer {user_token}"}
    response = requests.get(f"{BACKEND_URL}/conversations", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_send_prompt(user_token):
    """Test sending a prompt"""
    # First create a new conversation
    try:
        conv_id = test_create_conversation(user_token)
    except Exception as e:
        pytest.skip(f"Skipping send_prompt test because conversation creation failed: {str(e)}")
    
    headers = {"Authorization": f"Bearer {user_token}"}
    data = {
        "llm_id": "1",  # Make sure this LLM ID exists
        "prompt": "Hello, how are you?",
        "conversation_id": conv_id
    }
    response = requests.post(f"{BACKEND_URL}/conversations/prompt", headers=headers, json=data)
    assert response.status_code == 200, f"Failed to send prompt: {response.text}"
    prompt_response = response.json()
    assert "response" in prompt_response
