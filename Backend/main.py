from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
import jwt
from typing import Optional

# -------------------------------------
# Basic Setup
# -------------------------------------
app = FastAPI()

# Adjust these to match *your* frontend’s URL:
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    # Add more if needed (e.g., for production)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,        # or ["*"] to allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET = "YOUR_SECRET_KEY"        # Replace with a real secret in production!
JWT_ALGORITHM = "HS256"

# In-memory "database" of users for demonstration
# Keyed by email, storing user info + hashed password
fake_db = {}

# For simple ID autoincrement in memory
next_id = 1


# -------------------------------------
# Pydantic Models
# -------------------------------------
class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "User"  # Default to "User" if not specified

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str

class AuthResponse(BaseModel):
    user: User
    token: str


# -------------------------------------
# Utility Functions
# -------------------------------------
def hash_password(password: str) -> str:
    """Hash a plain-text password."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against the hashed version."""
    return pwd_context.verify(plain_password, hashed_password)

def create_jwt_token(user_data: dict) -> str:
    """
    Create a JWT token from user data.
    In production, consider adding an expiration time, iat, etc.
    """
    return jwt.encode(user_data, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    """Decode a JWT token (not used in this simple example, but for reference)."""
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return decoded
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# -------------------------------------
# Routes
# -------------------------------------

@app.post("/api/signup", response_model=AuthResponse)
def signup(signup_data: SignupRequest):
    global next_id

    if signup_data.email in fake_db:
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    hashed_pw = hash_password(signup_data.password)

    user_id = next_id
    next_id += 1

    new_user = {
        "id": user_id,
        "name": signup_data.name,
        "email": signup_data.email,
        "hashed_password": hashed_pw,
        "role": signup_data.role
    }

    fake_db[signup_data.email] = new_user

    token_data = {
        "id": user_id,
        "name": signup_data.name,
        "email": signup_data.email,
        "role": signup_data.role
    }
    token = create_jwt_token(token_data)

    return AuthResponse(
        user=User(
            id=user_id,
            name=signup_data.name,
            email=signup_data.email,
            role=signup_data.role
        ),
        token=token
    )


@app.post("/api/login", response_model=AuthResponse)
def login(login_data: LoginRequest):
    user_record = fake_db.get(login_data.email)
    if not user_record:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not verify_password(login_data.password, user_record["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token_data = {
        "id": user_record["id"],
        "name": user_record["name"],
        "email": user_record["email"],
        "role": user_record["role"]
    }
    token = create_jwt_token(token_data)

    return AuthResponse(
        user=User(
            id=user_record["id"],
            name=user_record["name"],
            email=user_record["email"],
            role=user_record["role"]
        ),
        token=token
    )


# -------------------------------------
# Sample Root Endpoint
# -------------------------------------
@app.get("/")
def read_root():
    return {"message": "FastAPI is running. Try POST /api/signup or /api/login."}

