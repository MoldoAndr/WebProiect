import pytest
import requests
import time

# Configuration
BASE_URL = "http://localhost:8000/api"  # Adjust if needed
tokens = {}

# Fixture for getting tokens
@pytest.fixture
def admin_token():
    if "admin" not in tokens:
        response = requests.post(
            f"{BASE_URL}/auth/login", 
            data={"username": "admin", "password": "password"}
        )
        assert response.status_code == 200
        tokens["admin"] = response.json()["access_token"]
    return tokens["admin"]

@pytest.fixture
def tech_token():
    if "technician" not in tokens:
        response = requests.post(
            f"{BASE_URL}/auth/login", 
            data={"username": "technician", "password": "password"}
        )
        assert response.status_code == 200
        tokens["technician"] = response.json()["access_token"]
    return tokens["technician"]

@pytest.fixture
def user_token():
    if "user" not in tokens:
        response = requests.post(
            f"{BASE_URL}/auth/login", 
            data={"username": "user", "password": "password"}
        )
        assert response.status_code == 200
        tokens["user"] = response.json()["access_token"]
    return tokens["user"]

@pytest.fixture
def llm_id(user_token):
    response = requests.get(
        f"{BASE_URL}/llms",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    llms = response.json()
    return llms[0]["id"]

@pytest.fixture
def conversation_id(user_token, llm_id):
    data = {
        "llm_id": llm_id,
        "title": "Test conversation"
    }
    
    response = requests.post(
        f"{BASE_URL}/conversations",
        headers={"Authorization": f"Bearer {user_token}"},
        json=data
    )
    
    assert response.status_code == 200
    return response.json()["id"]

# Tests organized by functionality
class TestAuth:
    def test_login_admin(self):
        response = requests.post(
            f"{BASE_URL}/auth/login", 
            data={"username": "admin", "password": "password"}
        )
        assert response.status_code == 200
        assert "access_token" in response.json()
    
    def test_login_technician(self):
        response = requests.post(
            f"{BASE_URL}/auth/login", 
            data={"username": "technician", "password": "password"}
        )
        assert response.status_code == 200
        assert "access_token" in response.json()
    
    def test_login_user(self):
        response = requests.post(
            f"{BASE_URL}/auth/login", 
            data={"username": "user", "password": "password"}
        )
        assert response.status_code == 200
        assert "access_token" in response.json()
    
    def test_login_invalid(self):
        response = requests.post(
            f"{BASE_URL}/auth/login", 
            data={"username": "nonexistent", "password": "wrongpassword"}
        )
        assert response.status_code == 401

class TestUsers:
    def test_admin_get_users(self, admin_token):
        response = requests.get(
            f"{BASE_URL}/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        assert len(users) > 0
    
    def test_user_forbidden_get_users(self, user_token):
        response = requests.get(
            f"{BASE_URL}/users",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403
    
    def test_user_get_me(self, user_token):
        response = requests.get(
            f"{BASE_URL}/users/me",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        user = response.json()
        assert user["username"] == "user"

class TestLLMs:
    def test_get_llms(self, user_token):
        response = requests.get(
            f"{BASE_URL}/llms",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        llms = response.json()
        assert isinstance(llms, list)
        assert len(llms) > 0
    
    def test_technician_modify_llm(self, tech_token, llm_id):
        data = {
            "description": f"Updated description {time.time()}"
        }
        
        response = requests.put(
            f"{BASE_URL}/llms/{llm_id}",
            headers={"Authorization": f"Bearer {tech_token}"},
            json=data
        )
        
        assert response.status_code == 200
        updated_llm = response.json()
        assert updated_llm["description"] == data["description"]
    
    def test_user_forbidden_modify_llm(self, user_token, llm_id):
        data = {
            "description": "Should not be allowed"
        }
        
        response = requests.put(
            f"{BASE_URL}/llms/{llm_id}",
            headers={"Authorization": f"Bearer {user_token}"},
            json=data
        )
        
        assert response.status_code == 403

class TestConversations:
    def test_create_conversation(self, user_token, llm_id):
        data = {
            "llm_id": llm_id,
            "title": "Test conversation"
        }
        
        response = requests.post(
            f"{BASE_URL}/conversations",
            headers={"Authorization": f"Bearer {user_token}"},
            json=data
        )
        
        assert response.status_code == 200
        conv = response.json()
        assert conv["title"] == "Test conversation"
    
    def test_send_message(self, user_token, conversation_id):
        data = {
            "conversation_id": conversation_id,
            "prompt": "Hello, how are you?"
        }
        
        response = requests.post(
            f"{BASE_URL}/prompt",
            headers={"Authorization": f"Bearer {user_token}"},
            json=data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "response" in result
