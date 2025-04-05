# app/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
import logging
from pydantic import BaseModel, EmailStr
from app.core.security import create_access_token, verify_password, get_current_user
from app.core.config import settings
from app.models.token import Token
from app.models.user import UserCreate, UserResponse, User, UserUpdate
from app.services.user_service import (
    get_user_by_username,
    get_user_by_email,
    create_user,
    change_password,
    set_reset_code,
    reset_password_with_code
)
from app.core.email import send_reset_code_email

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        user = await get_user_by_username(form_data.username)
        if not user or not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user account"
            )
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=access_token_expires
        )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                full_name=user.full_name,
                role=user.role,
                is_active=user.is_active,
                created_at=user.created_at
            )
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed due to server error"
        )

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    try:
        existing_user = await get_user_by_username(user_data.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        existing_email = await get_user_by_email(user_data.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        user = await create_user(user_data)
        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at
        )
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

# Models for forgot and reset password via code
class ForgotPasswordCodeRequest(BaseModel):
    email: EmailStr

class ResetPasswordCodeRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str

@router.post("/forgot-password-code", tags=["authentication"])
async def forgot_password_code(request: ForgotPasswordCodeRequest, background_tasks: BackgroundTasks):
    logger.info(f"Received forgot-password-code request for email: {request.email}")
    user = await get_user_by_email(request.email)
    if user:
        reset_code = await set_reset_code(user.id)
        background_tasks.add_task(send_reset_code_email, user.email, reset_code)
        logger.info(f"Reset code generated and email task added for user: {user.email}")
    else:
        logger.info(f"No user found with email: {request.email}")
    return {"message": "If the email exists in our records, a reset code has been sent"}

@router.post("/reset-password-code", tags=["authentication"])
async def reset_password_code(request: ResetPasswordCodeRequest):
    logger.info(f"Received reset-password-code request for email: {request.email}")
    result = await reset_password_with_code(request.email, request.code, request.new_password)
    return result

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.post("/change-password", tags=["authentication"])
async def change_password_endpoint(data: ChangePasswordRequest, current_user: User = Depends(get_current_user)):
    updated_user = await change_password(current_user.id, data.old_password, data.new_password)
    return {"message": "Password changed successfully"}
