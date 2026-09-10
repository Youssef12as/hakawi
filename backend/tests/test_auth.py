"""Authentication enforcement tests: no guest access to chat features."""

import time

import jwt as pyjwt

from tests.conftest import TEST_JWT_SECRET, USER_A_ID, make_token


class TestMissingOrBadToken:
    def test_create_session_without_token_401(self, client):
        r = client.post("/api/chat/sessions", json={"chat_mode": "regional"})
        assert r.status_code == 401

    def test_chat_text_without_token_401(self, client):
        r = client.post("/api/chat/text", json={"text": "أهلا"})
        assert r.status_code == 401

    def test_chat_audio_without_token_401(self, client):
        r = client.post(
            "/api/chat/audio",
            files={"file": ("recording.webm", b"fake-bytes", "audio/webm")},
        )
        assert r.status_code == 401

    def test_chat_ancient_without_token_401(self, client):
        r = client.post("/api/chat/ancient", json={"text": "احكيلي عن أبو سمبل"})
        assert r.status_code == 401

    def test_history_without_token_401(self, client):
        r = client.get("/api/chat/history")
        assert r.status_code == 401

    def test_list_sessions_without_token_401(self, client):
        r = client.get("/api/chat/sessions")
        assert r.status_code == 401

    def test_malformed_scheme_401(self, client):
        r = client.post(
            "/api/chat/sessions",
            json={"chat_mode": "regional"},
            headers={"Authorization": "Basic dXNlcjpwYXNz"},
        )
        assert r.status_code == 401


class TestInvalidTokens:
    def test_expired_token_401(self, client):
        token = make_token(USER_A_ID, expires_in=-60)
        r = client.post(
            "/api/chat/sessions",
            json={"chat_mode": "regional"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 401

    def test_wrong_signature_401(self, client):
        token = make_token(USER_A_ID, secret="attacker-controlled-secret")
        r = client.post(
            "/api/chat/sessions",
            json={"chat_mode": "regional"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 401

    def test_wrong_audience_401(self, client):
        token = make_token(USER_A_ID, audience="not-authenticated")
        r = client.post(
            "/api/chat/sessions",
            json={"chat_mode": "regional"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 401

    def test_garbage_token_401(self, client):
        r = client.post(
            "/api/chat/sessions",
            json={"chat_mode": "regional"},
            headers={"Authorization": "Bearer not-a-jwt"},
        )
        assert r.status_code == 401

    def test_token_without_sub_401(self, client):
        now = int(time.time())
        token = pyjwt.encode(
            {"aud": "authenticated", "exp": now + 3600},
            TEST_JWT_SECRET,
            algorithm="HS256",
        )
        r = client.post(
            "/api/chat/sessions",
            json={"chat_mode": "regional"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 401


class TestPublicEndpointsStayPublic:
    """Read-only / asset endpoints must keep working without a token."""

    def test_health_public(self, client):
        assert client.get("/health").status_code == 200

    def test_governorates_public(self, client):
        assert client.get("/api/governorates").status_code == 200

    def test_registry_public(self, client):
        assert client.get("/api/registry").status_code == 200
