# app/services/reset_code_cache.py
import random
from datetime import datetime, timedelta

# Global dictionary for temporary reset codes: keyed by user id.
reset_code_cache = {}

def set_reset_code_in_memory(user_id: str) -> str:
    """Generate an 8-digit reset code, store it in memory with a 10-minute expiration, and return the code."""
    code = str(random.randint(10000000, 99999999))
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    reset_code_cache[user_id] = {"code": code, "expires_at": expires_at}
    return code

def get_reset_code(user_id: str) -> str:
    """Retrieve the reset code for the user if it exists and has not expired; otherwise return None."""
    entry = reset_code_cache.get(user_id)
    if entry:
        if datetime.utcnow() < entry["expires_at"]:
            return entry["code"]
        else:
            # Code expired: remove it.
            del reset_code_cache[user_id]
    return None

def clear_reset_code(user_id: str):
    """Remove the reset code from the in-memory cache."""
    if user_id in reset_code_cache:
        del reset_code_cache[user_id]
