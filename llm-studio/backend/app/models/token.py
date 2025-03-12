from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict, Any

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[Dict[str, Any]] = None

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None
    jti: Optional[str] = None
    type: Optional[Literal["access", "refresh"]] = None
    salt: Optional[str] = None
    
    class Config:
        from_attributes = True

class TokenRefresh(BaseModel):
    refresh_token: str
