#!/usr/bin/env python3
import requests
import json
import time
from requests.packages.urllib3.exceptions import InsecureRequestWarning

# Disable SSL warnings for self-signed certificates in development
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

# Base URLs
BASE_URL = "https://localhost"
BACKEND_URL = f"{BASE_URL}/api"
LLM_URL = f"{BASE_URL}/llm-api"

# Test credentials
TEST_USER = {
    "username": "testuser",
    "password": "testpassword123"
}

def test_backend_health():
    """Test the backend health endpoint."""
    try:
        response = requests.get(f"{BACKEND_URL}/health", verify=False)
        print(f"Backend Health Check: {response.status_code}")
        print(response.json())
        return response.status_code == 200
    except Exception as e:
        print(f"Backend Health Check Error: {str(e)}")
        return False

def test_llm_health():
    """Test the LLM management health endpoint."""
    try:
        response = requests.get(f"{LLM_URL}/health", verify=False)
        print(f"LLM Management Health Check: {response.status_code}")
        print(response.json())
        return response.status_code == 200
    except Exception as e:
        print(f"LLM Management Health Check Error: {str(e)}")
        return False

def register_test_user():
    """Register a test user account."""
    try:
        data = {
            "username": TEST_USER["username"],
            "email": "test@example.com",
            "password": TEST_USER["password"],
            "full_name": "Test User"
        }
        response = requests.post(f"{BACKEND_URL}/auth/register", json=data, verify=False)
        print(f"User Registration: {response.status_code}")
        if response.status_code == 200:
            print(response.json())
            return True
        else:
            print(f"Failed to register user: {response.text}")
            return False
    except Exception as e:
        print(f"User Registration Error: {str(e)}")
        return False

def login_test_user():
    """Log in with the test user and return the JWT token."""
    try:
        data = {
            "username": TEST_USER["username"],
            "password": TEST_USER["password"]
        }
        response = requests.post(f"{BACKEND_URL}/auth/login", data=data, verify=False)
        print(f"User Login: {response.status_code}")
        if response.status_code == 200:
            token_data = response.json()
            print(f"Login successful, token obtained.")
            return token_data.get("access_token")
        else:
            print(f"Failed to login: {response.text}")
            return None
    except Exception as e:
        print(f"User Login Error: {str(e)}")
        return None

def list_available_llms(token):
    """List all available LLMs."""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{LLM_URL}/llms", headers=headers, verify=False)
        print(f"List LLMs: {response.status_code}")
        if response.status_code == 200:
            llms = response.json()
            print(f"Found {len(llms)} LLMs:")
            for llm in llms:
                print(f"  - {llm['name']} (ID: {llm['id']}, Status: {llm['status']})")
            return llms
        else:
            print(f"Failed to list LLMs: {response.text}")
            return []
    except Exception as e:
        print(f"List LLMs Error: {str(e)}")
        return []

def create_test_llm(token):
    """Create a test LLM."""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        data = {
            "name": "Test LLM",
            "description": "Test LLM for integration testing",
            "image": "test/llm:latest",
            "api_endpoint": "http://localhost:8080/v1/generate",
            "parameters": {
                "temperature": 0.7,
                "max_tokens": 1024
            }
        }
        response = requests.post(f"{LLM_URL}/llms", json=data, headers=headers, verify=False)
        print(f"Create LLM: {response.status_code}")
        if response.status_code == 200:
            llm = response.json()
            print(f"Created LLM: {llm['name']} (ID: {llm['id']})")
            return llm
        else:
            print(f"Failed to create LLM: {response.text}")
            return None
    except Exception as e:
        print(f"Create LLM Error: {str(e)}")
        return None

def send_test_prompt(token, llm_id):
    """Send a test prompt to an LLM."""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        data = {
            "prompt": "Tell me a joke about programming.",
            "system_prompt": "You are a helpful assistant with a good sense of humor."
        }
        response = requests.post(f"{LLM_URL}/llms/{llm_id}/prompt", json=data, headers=headers, verify=False)
        print(f"Send Prompt: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"LLM Response: {result['response']}")
            print(f"Processing Time: {result.get('processing_time')} seconds")
            print(f"Tokens: {result.get('tokens')}")
            return result
        else:
            print(f"Failed to send prompt: {response.text}")
            return None
    except Exception as e:
        print(f"Send Prompt Error: {str(e)}")
        return None

def run_tests():
    """Run all tests in sequence."""
    print("\n--- Starting Integration Tests ---\n")
    
    # Test health endpoints
    print("\n--- Testing Health Endpoints ---")
    backend_healthy = test_backend_health()
    llm_healthy = test_llm_health()
    
    if not (backend_healthy and llm_healthy):
        print("\n❌ Health checks failed. Make sure services are running.")
        return
    
    # Register and login
    print("\n--- Testing Authentication ---")
    register_test_user()  # May fail if user already exists
    token = login_test_user()
    
    if not token:
        print("\n❌ Authentication failed. Cannot proceed with further tests.")
        return
    
    # Test LLM operations
    print("\n--- Testing LLM Management ---")
    llms = list_available_llms(token)
    
    test_llm = None
    # First check if we already have a test LLM
    for llm in llms:
        if llm["name"] == "Test LLM":
            test_llm = llm
            print(f"Found existing test LLM with ID: {test_llm['id']}")
            break
    
    # Create a test LLM if needed
    if not test_llm:
        test_llm = create_test_llm(token)
    
    if test_llm:
        # Test sending a prompt
        print("\n--- Testing LLM Prompt API ---")
        send_test_prompt(token, test_llm["id"])
    
    print("\n--- Integration Tests Completed ---\n")

if __name__ == "__main__":
    run_tests()
