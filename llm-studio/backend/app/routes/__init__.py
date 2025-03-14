# Import routes so they can be imported from the routes package
from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.llms import router as llms_router
from app.routes.conversations import router as conversations_router

# These are re-exported for easier imports in main.py
auth = auth_router
users = users_router
llms = llms_router
conversations = conversations_router
