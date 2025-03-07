from pydantic import BaseModel, Field
from typing import Optional, Literal

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[dict] = None

class TokenPayload(BaseModel):
    sub: str = None
    exp: int = None
    jti: str = None
    type: Literal["access", "refresh"] = None
