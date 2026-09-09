"""
Authentication helpers for the Hikawi backend.

Two access levels:
- get_current_user_id: STRICT — verifies the Supabase access token
  using JWKS (ES256 asymmetric key) with HS256 legacy fallback.
  Raises 401 for missing/invalid/expired tokens. Required for chat
  session creation and chat history access.
- get_optional_user_id: LENIENT — extracts the user id from the token
  without signature verification (used for optional attribution on
  public endpoints like custom voice registration).
"""

import logging
from typing import Optional

import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.config import settings

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer(auto_error=False)

# JWKS client for ES256 (asymmetric) token verification.
# Caches the public key set; lifespan=300 means it re-fetches every 5 minutes.
_jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    """Lazy-init the JWKS client so it's created after settings are loaded."""
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(_jwks_url, lifespan=300)
    return _jwks_client


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


def _verify_token(token: str) -> dict:
    """
    Verify a Supabase access token and return the decoded payload.

    Strategy:
      1. Try JWKS (ES256 asymmetric) — the current Supabase signing key.
      2. Fall back to HS256 with SUPABASE_JWT_SECRET — the legacy key
         (still used to verify tokens issued before the key rotation).

    Raises jwt.InvalidTokenError on failure.
    """
    # ── Attempt 1: JWKS / ES256 ──────────────────────────────────────────
    try:
        jwks_client = _get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
        return payload
    except (jwt.exceptions.PyJWKClientError, jwt.InvalidTokenError) as e:
        logger.debug(f"JWKS/ES256 verification failed, trying HS256 fallback: {e}")

    # ── Attempt 2: Legacy HS256 ──────────────────────────────────────────
    if settings.SUPABASE_JWT_SECRET:
        # This path handles tokens signed before the key rotation.
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
        return payload

    raise jwt.InvalidTokenError("All verification methods exhausted.")


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> str:
    """
    Verify the Supabase access token and return the authenticated user id.

    Verification: JWKS (ES256) primary, HS256 legacy fallback.
    Raises HTTP 401 for any missing/invalid/expired token.
    """
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="التسجيل مطلوب. من فضلك سجل الدخول للمتابعة.",
        )

    token = credentials.credentials
    try:
        payload = _verify_token(token)
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

