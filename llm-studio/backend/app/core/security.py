from datetime import datetime, timedelta
from typing import Optional, Any, Dict
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
import secrets
import string
import re
from app.core.config import settings
from app.models.token import TokenPayload
from app.services.user_service import get_user_by_id
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def generate_random_string(length: int = 32) -> str:
    """Generate a cryptographically secure random string."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token for a user."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Generate a unique token ID (jti)
    jti = secrets.token_hex(32)
    
    to_encode = {
        "sub": str(subject),
        "exp": expire.timestamp(),
        "iat": datetime.utcnow().timestamp(),
        "jti": jti,
        "type": "access"
    }
    
    # Use a different secret key for every token
    token_salt = generate_random_string(16)
    combined_secret = settings.SECRET_KEY + token_salt
    
    # Include the salt in the token
    to_encode["salt"] = token_salt
    
    # Encode the token with the combined secret
    encoded_jwt = jwt.encode(
        to_encode, 
        combined_secret, 
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt

def create_refresh_token(subject: str) -> str:
    """Create a JWT refresh token for a user."""
    expire = datetime.utcnow() + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    
    # Generate a unique token ID (jti)
    jti = secrets.token_hex(32)
    
    to_encode = {
        "sub": str(subject),
        "exp": expire.timestamp(),
        "iat": datetime.utcnow().timestamp(),
        "jti": jti,
        "type": "refresh"
    }
    
    # Use a different secret key for every token
    token_salt = generate_random_string(16)
    combined_secret = settings.REFRESH_SECRET_KEY + token_salt
    
    # Include the salt in the token
    to_encode["salt"] = token_salt
    
    # Encode the token with the combined secret
    encoded_jwt = jwt.encode(
        to_encode, 
        combined_secret, 
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt

async def verify_token(token: str, token_type: str = "access") -> TokenPayload:
    """Verify and decode a JWT token."""
    try:
        # First decode without verification to get the salt
        unverified_payload = jwt.decode(
            token, 
            options={"verify_signature": False}
        )
        
        # Get the salt from the unverified payload
        token_salt = unverified_payload.get("salt", "")
        
        # Choose the appropriate secret key based on token type
        if token_type == "access":
            combined_secret = settings.SECRET_KEY + token_salt
        else:
            combined_secret = settings.REFRESH_SECRET_KEY + token_salt
        
        # Now verify and decode the token with the combined secret
        payload = jwt.decode(
            token, 
            combined_secret, 
            algorithms=[settings.ALGORITHM], 
            options={"verify_exp": True}
        )
        
        # Validate token type
        if payload.get("type") != token_type:
            raise JWTError("Invalid token type")
        
        # Convert to TokenPayload model
        token_data = TokenPayload(
            sub=payload.get("sub"),
            exp=payload.get("exp"),
            jti=payload.get("jti"),
            type=payload.get("type")
        )
        
        return token_data
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Get the current user from the JWT token."""
    try:
        token_data = await verify_token(token)
        
        user = await get_user_by_id(token_data.sub)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        
        return user
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def validate_password_strength(password: str) -> bool:
    """Validate that the password meets minimum security requirements."""
    # Check minimum length
    if len(password) < 8:
        return False
    
    # Check for at least one lowercase letter
    if not re.search(r'[a-z]', password):
        return False
    
    # Check for at least one uppercase letter
    if not re.search(r'[A-Z]', password):
        return False
    
    # Check for at least one digit
    if not re.search(r'\d', password):
        return False
    
    # Check for at least one special character
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False
    
    return True

# Role-based access control
def get_admin_user(user: User = Depends(get_current_user)) -> User:
    """Check if the current user is an admin."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return user

def get_technician_user(user: User = Depends(get_current_user)) -> User:
    """Check if the current user is a technician or admin."""
    if user.role not in ["technician", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return user

# Rate limiting
async def rate_limit(request: Request) -> None:
    """Rate limit API requests.
    
    This is a placeholder for a more sophisticated rate limiting implementation.
    In a production environment, you would use Redis or a similar service to implement
    proper rate limiting.
    """
    # For now, just pass through
    pass
