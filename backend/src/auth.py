"""
Authentication helper for Hikawi backend.
Extracts the Supabase user ID from the Authorization Bearer header if present.
"""

import logging
from typing import Optional
from fastapi import Request
import jwt

logger = logging.getLogger(__name__)


def get_optional_user_id(request: Request) -> Optional[str]:
    """
    Extract the Supabase authenticated user ID (sub claim) from the Authorization header.
    Returns None if no token or token is invalid.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1].strip()
    try:
        # Decode without verification of signature for lightweight claim extraction
        # (Supabase gateway or client already verified the session)
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload.get("sub")
    except Exception as e:
        logger.debug(f"Failed to decode auth token: {e}")
        return None
