"""Shared fixtures for auth + chat session tests.

Creates two throwaway users directly in auth.users (only `id` is required),
signs HS256 tokens the same way Supabase does, and cleans everything up via
the profiles deletion trigger (which cascades to auth.users and sessions).
"""

import os
import sys
import time

import jwt as pyjwt
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config import settings  # noqa: E402
from src.database import get_db_cursor  # noqa: E402
from src.main import app  # noqa: E402

TEST_JWT_SECRET = "pytest-local-jwt-secret-do-not-use-in-prod"

# Fixed UUIDs (not uuid4) so every import of this module sees identical
# ids regardless of how pytest loads it (conftest vs tests.conftest).
USER_A_ID = "11111111-1111-4111-8111-111111111111"
USER_B_ID = "22222222-2222-4222-8222-222222222222"


def make_token(
    sub: str,
    secret: str = TEST_JWT_SECRET,
    audience: str = "authenticated",
    expires_in: int = 3600,
) -> str:
    """Sign a Supabase-style access token (HS256, aud=authenticated)."""
    now = int(time.time())
    payload = {
        "sub": sub,
        "aud": audience,
        "exp": now + expires_in,
        "iat": now,
        "role": "authenticated",
    }
    return pyjwt.encode(payload, secret, algorithm="HS256")


@pytest.fixture(autouse=True)
def _configure_jwt_secret(monkeypatch):
    """Point the backend at the test signing secret for every test."""
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def auth_users():
    """Create two test users in auth.users; remove them (and everything
    cascaded from them) at teardown."""
    emails = {
        USER_A_ID: f"pytest-a-{USER_A_ID[:8]}@test.local",
        USER_B_ID: f"pytest-b-{USER_B_ID[:8]}@test.local",
    }
    with get_db_cursor(commit=True) as cur:
        for uid, email in emails.items():
            cur.execute(
                """
                INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
                VALUES (%s, %s, now(), now(), now())
                ON CONFLICT (id) DO NOTHING;
                """,
                (uid, email),
            )
    yield {"a": USER_A_ID, "b": USER_B_ID}
    # profiles deletion trigger removes auth.users rows; sessions cascade via user_id FK
    with get_db_cursor(commit=True) as cur:
        cur.execute(
            "DELETE FROM public.profiles WHERE id IN (%s, %s);",
            (USER_A_ID, USER_B_ID),
        )


@pytest.fixture(scope="session")
def token_a():
    return {"Authorization": f"Bearer {make_token(USER_A_ID)}"}


@pytest.fixture(scope="session")
def token_b():
    return {"Authorization": f"Bearer {make_token(USER_B_ID)}"}
