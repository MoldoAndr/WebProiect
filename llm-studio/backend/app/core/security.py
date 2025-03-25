# app/core/security.py
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Union
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, WebSocket
from fastapi.security import OAuth2PasswordBearer
from app.core.config import settings
from app.models.user import User
from passlib.context import CryptContext
import secrets
import logging

logger = logging.getLogger(__name__)

# Password handling
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate password hash"""
    return pwd_context.hash(password)

def create_access_token(data: Union[Dict[str, Any], str], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token with improved security"""
    
    # If data is just a user ID string, convert to expected format
    if isinstance(data, str):
        data = {"sub": data}
    
    to_encode = data.copy()
    
    # Set expiration
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),                  # Issued at
        "jti": secrets.token_hex(16),             # JWT ID for uniqueness
        "type": "access"                          # Token type
    })
    
    # Create JWT token
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM],
            options={"verify_signature": True}
        )
        return payload
    except JWTError as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Get current user from token with improved security"""
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        token_type = payload.get("type")
        if token_type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    from app.services.user_service import get_user_by_id
    user = await get_user_by_id(user_id)
    
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

# WebSocket authentication
async def get_current_user_ws(websocket: WebSocket) -> User:
    """Get current user from WebSocket token"""
    try:
        token = websocket.query_params.get("token")
        if not token:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing authentication token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token is missing",
            )
            
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        
        if user_id is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
            
        token_type = payload.get("type")
        if token_type != "access":
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token type")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
            
    except JWTError as e:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=f"Authentication failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    # Get user from database
    from app.services.user_service import get_user_by_id
    user = await get_user_by_id(user_id)
    
    if user is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user.is_active:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Inactive user")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    return user

# Role-based access control
def check_admin_access(user: User = Depends(get_current_user)):
    """Check if user has admin access"""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return user

def check_technician_access(user: User = Depends(get_current_user)):
    """Check if user has technician or admin access"""
    if user.role not in ["admin", "technician"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Technician or admin privileges required"
        )
    return user
