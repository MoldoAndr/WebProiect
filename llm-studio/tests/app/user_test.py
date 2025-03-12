"""
Tests for user management functionality in the LLM Studio application.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.user_service import get_user_by_id, get_user_by_username, create_user
from app.core.security import create_access_token
from app.models.user import UserCreate

client = TestClient(app)

# Test data
admin_user_data = {
    "username": "testadmin",
    "email": "admin@example.com",
    "password": "adminSecurePass123!",
    "full_name": "Test Admin",
    "role": "admin"
}

regular_user_data = {
    "username": "regularuser",
    "email": "regular@example.com",
    "password": "userSecurePass123!",
    "full_name": "Regular User",
    "role": "user"
}

technician_user_data = {
    "username": "techtester",
    "email": "tech@example.com",
    "password": "techSecurePass123!",
    "full_name": "Tech User",
    "role": "technician"
}

# Fixtures to create test users
@pytest.fixture(scope="module")
async def create_admin_user():
    user = await get_user_by_username(admin_user_data["username"])
    if not user:
        user_create = UserCreate(**{k: v for k, v in admin_user_data.items() if k != "role"})
        user = await create_user(user_create)
        # Update user role to admin
        # This would require a direct database update or a service function
    return user

@pytest.fixture(scope="module")
async def create_regular_user():
    user = await get_user_by_username(regular_user_data["username"])
    if not user:
        user_create = UserCreate(**{k: v for k, v in regular_user_data.items() if k != "role"})
        user = await create_user(user_create)
    return user

@pytest.fixture(scope="module")
async def create_technician_user():
    user = await get_user_by_username(technician_user_data["username"])
    if not user:
        user_create = UserCreate(**{k: v for k, v in technician_user_data.items() if k != "role"})
        user = await create_user(user_create)
        # Update user role to technician
        # This would require a direct database update or a service function
    return user

@pytest.fixture(scope="module")
def admin_token(create_admin_user):
    return create_access_token(str(create_admin_user.id))

@pytest.fixture(scope="module")
def regular_token(create_regular_user):
    return create_access_token(str(create_regular_user.id))

@pytest.fixture(scope="module")
def technician_token(create_technician_user):
    return create_access_token(str(create_technician_user.id))

def test_get_users_admin(admin_token):
    """Test that an admin can get all users."""
    response = client.get(
        "/api/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_get_users_denied_regular(regular_token):
    """Test that a regular user cannot get all users."""
    response = client.get(
        "/api/users",
        headers={"Authorization": f"Bearer {regular_token}"}
    )
    assert response.status_code == 403

def test_get_user_profile(regular_token, create_regular_user):
    """Test that a user can get their own profile."""
    response = client.get(
        f"/api/users/{create_regular_user.id}",
        headers={"Authorization": f"Bearer {regular_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == regular_user_data["username"]

def test_update_user_profile(regular_token, create_regular_user):
    """Test that a user can update their profile."""
    update_data = {
        "full_name": "Updated Full Name"
    }
    
    response = client.put(
        f"/api/users/{create_regular_user.id}",
        json=update_data,
        headers={"Authorization": f"Bearer {regular_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == update_data["full_name"]

def test_update_other_user_denied(regular_token, create_admin_user):
    """Test that a user cannot update another user's profile."""
    update_data = {
        "full_name": "Hacked Name"
    }
    
    response = client.put(
        f"/api/users/{create_admin_user.id}",
        json=update_data,
        headers={"Authorization": f"Bearer {regular_token}"}
    )
    
    assert response.status_code == 403

def test_admin_update_any_user(admin_token, create_regular_user):
    """Test that an admin can update any user's profile."""
    update_data = {
        "full_name": "Admin Updated Name"
    }
    
    response = client.put(
        f"/api/users/{create_regular_user.id}",
        json=update_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == update_data["full_name"]

def test_admin_change_user_role(admin_token, create_regular_user):
    """Test that an admin can change a user's role."""
    update_data = {
        "role": "technician"
    }
    
    response = client.put(
        f"/api/users/{create_regular_user.id}/role",
        json=update_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == update_data["role"]

def test_regular_change_role_denied(regular_token, create_regular_user):
    """Test that a regular user cannot change roles."""
    update_data = {
        "role": "admin"
    }
    
    response = client.put(
        f"/api/users/{create_regular_user.id}/role",
        json=update_data,
        headers={"Authorization": f"Bearer {regular_token}"}
    )
    
    assert response.status_code == 403

def test_delete_user_admin(admin_token, create_regular_user):
    """Test that an admin can delete a user."""
    # Create a temporary user to delete
    temp_user_data = {
        "username": f"tempuser_{pytest.id_generator()}",
        "email": f"temp_{pytest.id_generator()}@example.com",
        "password": "tempPass123!",
        "full_name": "Temporary User"
    }
    
    # Register the user
    register_response = client.post(
        "/api/auth/register",
        json=temp_user_data
    )
    temp_user_id = register_response.json()["id"]
    
    # Delete the user
    delete_response = client.delete(
        f"/api/users/{temp_user_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert delete_response.status_code == 200
    
    # Verify user is deleted
    check_response = client.get(
        f"/api/users/{temp_user_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert check_response.status_code == 404

def test_delete_user_denied_regular(regular_token, create_admin_user):
    """Test that a regular user cannot delete a user."""
    response = client.delete(
        f"/api/users/{create_admin_user.id}",
        headers={"Authorization": f"Bearer {regular_token}"}
    )
    assert response.status_code == 403

# Helper function to generate unique IDs for test data
@pytest.fixture(scope="module")
def id_generator():
    import time
    def _id_generator():
        return str(int(time.time() * 1000))
    return _id_generator
