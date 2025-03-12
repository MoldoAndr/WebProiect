# app/api/routes/__init__.py
from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.routes.conversations import router as conversations_router
from app.api.routes.llms import router as llms_router

auth = auth_router
users = users_router
conversations = conversations_router
llms = llms_router
