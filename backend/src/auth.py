"""
Authentication helpers for the Hikawi backend.

Two access levels:
- get_current_user_id: STRICT — verifies the Supabase access token
  (HS256 signature, audience, expiry) and returns the user id.
  Raises 401 for missing/invalid/expired tokens. Required for chat
  session creation and chat history access.
- get_optional_user_id: LENIENT — extracts the user id from the token
  without signature verification (used for optional attribution on
  public endpoints like custom voice registration).
"""

import logging
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.config import settings

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer(auto_error=False)


def get_optional_user_id(request: Request) -> Optional[str]:
    """
    Extract the Supabase authenticated user ID (sub claim) from the
    Authorization header WITHOUT signature verification. Returns None if
    no token or token is invalid. For optional attribution only.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload.get("sub")
    except Exception as e:
        logger.debug(f"Failed to decode auth token: {e}")
        return None


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> str:
    """
    Verify the Supabase access token and return the authenticated user id.

    Verification: HS256 signature against SUPABASE_JWT_SECRET,
    audience='authenticated', and mandatory exp/sub claims.
    Raises HTTP 401 for any missing/invalid/expired token.
    """
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="التسجيل مطلوب. من فضلك سجل الدخول للمتابعة.",
        )

    if not settings.SUPABASE_JWT_SECRET:
        logger.error("SUPABASE_JWT_SECRET is not configured in backend/.env")
        raise HTTPException(
            status_code=500,
            detail="Authentication is not configured on the server.",
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="انتهت صلاحية الجلسة. من فضلك سجل الدخول مرة أخرى.",
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(status_code=401, detail="Invalid token audience.")
    except jwt.InvalidTokenError as e:
        logger.debug(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication token.")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")

    return user_id
