from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.routes.conversations import router as conversations_router
from app.api.routes.admin_chat import router as admin_chat_router

router = APIRouter()

router.include_router(auth_router, prefix="/auth", tags=["authentication"])
router.include_router(users_router, prefix="/users", tags=["users"])
router.include_router(conversations_router, prefix="/conversations", tags=["conversations"])
router.include_router(admin_chat_router, prefix="/admin-chat", tags=["admin-chat"])