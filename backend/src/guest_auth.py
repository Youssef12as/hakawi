"""Expiring guest identities, separate from Supabase member credentials."""
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from src.auth import _bearer_scheme, get_current_user_id
from src.config import settings
from src.database import get_db_cursor

router = APIRouter(prefix="/api/guest", tags=["guest"])
TOKEN_PREFIX = "guest."


class GuestId(str):
    """Server-verified guest identity; never constructed from request fields."""


def signing_key() -> str:
    if len(settings.GUEST_JWT_SECRET) < 32:
        raise HTTPException(503, "Guest access is not configured.")
    return settings.GUEST_JWT_SECRET


def cleanup_expired_guests() -> None:
    with get_db_cursor(commit=True) as cur:
        cur.execute("DELETE FROM public.guest_sessions WHERE expires_at <= now()")


def verify_guest_token(token: str) -> GuestId:
    try:
        payload = jwt.decode(
            token.removeprefix(TOKEN_PREFIX), signing_key(), algorithms=["HS256"],
            audience="hakawi-guest", issuer="hakawi",
            options={"require": ["exp", "iat", "sub", "role"]},
        )
        if payload["role"] != "guest":
            raise ValueError("Invalid role")
        guest_id = str(UUID(payload["sub"]))
    except (jwt.InvalidTokenError, ValueError, TypeError, AttributeError):
        raise HTTPException(401, "Guest session expired or invalid.")
    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT id FROM public.guest_sessions WHERE id = %s AND expires_at > now()", (guest_id,))
        if not cur.fetchone():
            raise HTTPException(401, "Guest session expired or invalid.")
    return GuestId(guest_id)


def get_chat_user_id(credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme)) -> str:
    if credentials and credentials.credentials.startswith(TOKEN_PREFIX):
        return verify_guest_token(credentials.credentials)
    return get_current_user_id(credentials)


@router.post("/session")
def enter_guest():
    key = signing_key()
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=max(1, min(settings.GUEST_SESSION_HOURS, 168)))
    guest_id = str(uuid4())
    with get_db_cursor(commit=True) as cur:
        cur.execute("INSERT INTO public.guest_sessions (id, expires_at) VALUES (%s, %s)", (guest_id, expires))
    token = jwt.encode({"sub": guest_id, "role": "guest", "aud": "hakawi-guest", "iss": "hakawi", "iat": now, "exp": expires}, key, algorithm="HS256")
    return {"id": guest_id, "access_token": TOKEN_PREFIX + token, "expires_at": int(expires.timestamp() * 1000)}


@router.get("/session")
def inspect_guest(user_id: str = Depends(get_chat_user_id)):
    if not isinstance(user_id, GuestId):
        raise HTTPException(403, "Guest session required.")
    return {"id": str(user_id)}


@router.delete("/session")
def leave_guest(user_id: str = Depends(get_chat_user_id)):
    if not isinstance(user_id, GuestId):
        raise HTTPException(403, "Guest session required.")
    with get_db_cursor(commit=True) as cur:
        cur.execute("DELETE FROM public.guest_sessions WHERE id = %s", (str(user_id),))
    return {"status": "deleted"}
