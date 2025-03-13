# test_llm_api.py
import pytest
import requests
import json
from test_config import LLM_URL, TEST_ADMIN, TEST_TECHNICIAN

@pytest.fixture
def admin_token():
    """Get admin auth token from backend"""
    from test_backend_api import admin_token as get_admin_token
    return get_admin_token()

@pytest.fixture
def tech_token():
    """Get technician auth token from backend"""
    from test_backend_api import tech_token as get_tech_token
    return get_tech_token()

def test_llm_health():
    """Test LLM service health endpoint"""
    response = requests.get(f"{LLM_URL}/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_list_llms(tech_token):
    """Test listing all LLMs"""
    headers = {"Authorization": f"Bearer {tech_token}"}
    response = requests.get(f"{LLM_URL}/llms", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    return data

def test_get_llm_by_id(tech_token):
    """Test getting a specific LLM"""
    llms = test_list_llms(tech_token)
    if not llms:
        pytest.skip("No LLMs found to test")
    
    llm_id = llms[0]["id"]
    headers = {"Authorization": f"Bearer {tech_token}"}
    response = requests.get(f"{LLM_URL}/llms/{llm_id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == llm_id

def test_create_update_delete_llm(admin_token):
    """Test the full lifecycle of an LLM"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Create LLM
    create_data = {
        "name": f"Test LLM {pytest.get_unique_id()}",
        "description": "Test LLM for API testing",
        "image": "test/test-llm:latest",
        "api_endpoint": "http://localhost:8080/v1/generate",
        "parameters": {
            "temperature": 0.7,
            "max_tokens": 1024
        }
    }
    
    response = requests.post(f"{LLM_URL}/llms", headers=headers, json=create_data)
    assert response.status_code == 200, f"Failed to create LLM: {response.text}"
    
    created_llm = response.json()
    llm_id = created_llm["id"]
    assert created_llm["name"] == create_data["name"]
    
    # Update LLM
    update_data = {
        "description": "Updated description",
        "parameters": {
            "temperature": 0.5,
            "max_tokens": 2048
        }
    }
    
    response = requests.put(f"{LLM_URL}/llms/{llm_id}", headers=headers, json=update_data)
    assert response.status_code == 200
    
    updated_llm = response.json()
    assert updated_llm["description"] == update_data["description"]
    
    # Delete LLM
    response = requests.delete(f"{LLM_URL}/llms/{llm_id}", headers=headers)
    assert response.status_code == 200
    
    # Verify deletion
    response = requests.get(f"{LLM_URL}/llms/{llm_id}", headers=headers)
    assert response.status_code == 404

@pytest.fixture(scope="session")
def get_unique_id():
    """Generate unique IDs for test data"""
    import time
    import random
    def _id_generator():
        return f"{int(time.time())}-{random.randint(1000, 9999)}"
    return _id_generator
