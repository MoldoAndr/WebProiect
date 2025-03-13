# test_config.py
import os

# Correct API endpoints
BASE_URL = "http://localhost:8000"
API_VERSION = "/api/v1"  # Update this if needed
BACKEND_URL = f"{BASE_URL}{API_VERSION}"

# Test user credentials - update these with actual usernames and passwords
TEST_ADMIN = {
    "username": "admin",  # Update with actual admin username
    "password": "password"  # Update with actual admin password
}

TEST_USER = {
    "username": "user",  # Update with actual user username
    "password": "password"  # Update with actual user password
}

TEST_TECHNICIAN = {
    "username": "technician",  # Update with actual technician username
    "password": "password"  # Update with actual technician password
}

# API URLs
LLM_URL = "http://localhost:8001"
