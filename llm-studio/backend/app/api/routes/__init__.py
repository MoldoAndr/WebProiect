from fastapi import APIRouter

# Import all routers
from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.routes.conversations import router as conversations_router

# Create the main router
router = APIRouter()

# Include all routers with appropriate prefixes
router.include_router(auth_router, prefix="/auth", tags=["authentication"])
router.include_router(users_router, prefix="/users", tags=["users"])
router.include_router(conversations_router, prefix="/conversations", tags=["conversations"])
