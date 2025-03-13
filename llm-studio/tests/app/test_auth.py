# test_auth.py
import requests
import json

BASE_URL = "http://localhost:8000"

def test_auth_endpoints():
    """Test various authentication endpoint combinations"""
    
    # Credentials to test
    credentials = {
        "username": "admin",
        "password": "password"
    }
    
    # List of possible endpoints to try
    endpoints = [
        "/api/auth/login",
        "/api/v1/auth/login",
        "/auth/login",
        "/api/login",
        "/login"
    ]
    
    # Content type variations
    content_types = [
        # Form data
        {"data": credentials},
        # JSON
        {"json": credentials}
    ]
    
    print("\n=== Authentication Endpoint Testing ===")
    
    for endpoint in endpoints:
        full_url = f"{BASE_URL}{endpoint}"
        print(f"\nTesting endpoint: {full_url}")
        
        for content_type in content_types:
            content_name = "form-data" if "data" in content_type else "json"
            print(f"  Using {content_name}...")
            
            try:
                response = requests.post(full_url, **content_type)
                print(f"  Status: {response.status_code}")
                print(f"  Response: {response.text[:100]}...")
                
            except Exception as e:
                print(f"  Error: {str(e)}")

if __name__ == "__main__":
    test_auth_endpoints()
