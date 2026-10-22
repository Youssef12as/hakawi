"""Offline API tests using real guest storage queries against a SQLite adapter.

PostgreSQL-only syntax is normalized here; production SQL/RLS still requires
the deployment smoke test documented in GUEST_ACCESS.md.
"""
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from uuid import uuid4

import jwt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from psycopg2.extras import Json

from src import auth, guest_auth
from src.chat import guest_service, router as chat
from src.config import settings
from src.family.router import router as family_router

SECRET = "guest-test-secret-for-isolated-tests-only-123456"


@pytest.fixture
def guest_api(monkeypatch):
    db = sqlite3.connect(":memory:", check_same_thread=False)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    db.create_function("now", 0, lambda: datetime.now(timezone.utc).isoformat())
    db.executescript("""
        CREATE TABLE guest_sessions (id TEXT PRIMARY KEY, expires_at TEXT NOT NULL, message_count INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE guest_chat_sessions (
            id TEXT PRIMARY KEY, guest_id TEXT REFERENCES guest_sessions(id) ON DELETE CASCADE,
            chat_mode TEXT, governorate_key TEXT, monument_key TEXT, language_mode TEXT, title TEXT,
            created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')),
            updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')));
        CREATE TABLE guest_chat_messages (
            id TEXT PRIMARY KEY, session_id TEXT REFERENCES guest_chat_sessions(id) ON DELETE CASCADE,
            question TEXT, response TEXT, metadata TEXT,
            created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')));
    """)

    class Cursor:
        def __init__(self):
            self.cursor = db.cursor()

        def execute(self, sql, params=()):
            sql = sql.replace("public.", "").replace("%s", "?").replace(" FOR UPDATE", "")
            values = tuple(json.dumps(p.adapted) if isinstance(p, Json) else p.isoformat() if isinstance(p, datetime) else str(p) if isinstance(p, guest_auth.GuestId) else p for p in params)
            self.cursor.execute(sql, values)

        @property
        def rowcount(self):
            return self.cursor.rowcount

        def convert(self, row):
            if row is None:
                return None
            result = dict(row)
            for name in ("created_at", "updated_at", "expires_at"):
                if name in result:
                    result[name] = datetime.fromisoformat(result[name])
            if "metadata" in result:
                result["metadata"] = json.loads(result["metadata"])
            return result

        def fetchone(self):
            return self.convert(self.cursor.fetchone())

        def fetchall(self):
            return [self.convert(row) for row in self.cursor.fetchall()]

    @contextmanager
    def cursor(commit=False):
        c = Cursor()
        try:
            yield c
            if commit:
                db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            c.cursor.close()

    monkeypatch.setattr(guest_auth, "get_db_cursor", cursor)
    monkeypatch.setattr(guest_service, "get_db_cursor", cursor)
    monkeypatch.setattr(settings, "GUEST_JWT_SECRET", SECRET)
    monkeypatch.setattr(chat, "generate", lambda **kw: "إجابة تجريبية")
    monkeypatch.setattr(chat, "get_historical_persona", lambda *_: ({}, None))
    monkeypatch.setattr(chat, "format_persona_instructions", lambda *_: "Test persona")
    monkeypatch.setattr(chat, "log_pipeline_metrics", lambda *_: None)
    # Keep all member verification local: no Supabase JWKS/network requests.
    monkeypatch.setattr(auth, "_verify_token", lambda token: jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated", options={"require": ["sub", "exp"]}))
    app = FastAPI()
    app.include_router(guest_auth.router)
    app.include_router(chat.router)
    app.include_router(family_router)
    with TestClient(app) as client:
        yield client, db
    db.close()


def enter(client):
    response = client.post("/api/guest/session")
    assert response.status_code == 200
    body = response.json()
    return body, {"Authorization": f"Bearer {body['access_token']}"}


def test_guest_chat_history_roundtrip(guest_api):
    client, _ = guest_api
    guest, headers = enter(client)
    assert client.get('/api/guest/session', headers=headers).json()['id'] == guest['id']
    reply = client.post('/api/chat/text', headers=headers, json={'text': 'أهلاً'})
    assert reply.status_code == 200, reply.text
    sid = reply.json()['session_id']
    listed = client.get('/api/chat/sessions', headers=headers).json()['sessions']
    assert len(listed) == 1 and listed[0]['turn_count'] == 1
    detail = client.get(f'/api/chat/sessions/{sid}', headers=headers)
    assert detail.status_code == 200
    assert [m['sender'] for m in detail.json()['messages']] == ['user', 'ai']
    history = client.get('/api/chat/history', headers=headers, params={'session_id': sid})
    assert history.json()['messages'][0]['text'] == 'أهلاً'
    recent = client.get('/api/chat/history', headers=headers, params={'chat_mode': 'regional'})
    assert recent.json()['session_id'] == sid
    assert client.delete(f'/api/chat/sessions/{sid}', headers=headers).status_code == 200
    assert client.get('/api/chat/sessions', headers=headers).json()['sessions'] == []


def test_two_guests_cannot_read_write_or_delete_each_others_chats(guest_api):
    client, _ = guest_api
    _, a = enter(client)
    _, b = enter(client)
    sid = client.post('/api/chat/sessions', headers=a, json={}).json()['session_id']
    assert client.get('/api/chat/sessions', headers=b).json()['sessions'] == []
    assert client.get(f'/api/chat/sessions/{sid}', headers=b).status_code == 404
    assert client.get('/api/chat/history', headers=b, params={'session_id': sid}).status_code == 404
    assert client.post('/api/chat/text', headers=b, json={'text': 'stolen', 'session_id': sid}).status_code == 404
    assert client.post('/api/chat/sessions', headers=b, json={'session_id': sid}).status_code == 404
    assert client.delete(f'/api/chat/sessions/{sid}', headers=b).status_code == 404


@pytest.mark.parametrize('field,value', [('persona', 'family_member'), ('member_id', 'gf'), ('member_name', 'جد'), ('relation', 'أب')])
def test_guest_family_chat_rejected(guest_api, field, value):
    client, _ = guest_api
    _, headers = enter(client)
    assert client.post('/api/chat/text', headers=headers, json={'text': 'hi', field: value}).status_code == 403


def test_guest_member_only_routes_rejected(guest_api):
    client, _ = guest_api
    _, headers = enter(client)
    assert client.get('/api/family-tree', headers=headers).status_code == 403
    assert client.post('/api/chat/sessions', headers=headers, json={'chat_mode': 'family_member'}).status_code == 403
    assert client.post('/api/chat/audio', headers=headers, data={'persona': 'family_member'}, files={'file': ('test.webm', b'bytes')}).status_code == 403


def test_expiry_and_cleanup_cascade(guest_api):
    client, db = guest_api
    guest, headers = enter(client)
    sid = client.post('/api/chat/text', headers=headers, json={'text': 'hi'}).json()['session_id']
    db.execute("UPDATE guest_sessions SET expires_at = '2000-01-01T00:00:00+00:00' WHERE id = ?", (guest['id'],))
    db.commit()
    assert client.get(f'/api/chat/sessions/{sid}', headers=headers).status_code == 401
    guest_auth.cleanup_expired_guests()
    assert db.execute('SELECT count(*) FROM guest_chat_messages').fetchone()[0] == 0
    assert db.execute('SELECT count(*) FROM guest_chat_sessions').fetchone()[0] == 0


def test_logout_revokes_token_and_deletes_chats(guest_api):
    client, db = guest_api
    _, headers = enter(client)
    client.post('/api/chat/text', headers=headers, json={'text': 'hi'})
    assert client.delete('/api/guest/session', headers=headers).status_code == 200
    assert client.get('/api/chat/sessions', headers=headers).status_code == 401
    assert db.execute('SELECT count(*) FROM guest_chat_messages').fetchone()[0] == 0


@pytest.mark.parametrize('alteration', ['signature', 'expired', 'role', 'audience', 'missing-exp'])
def test_invalid_guest_token_rejected(guest_api, alteration):
    client, _ = guest_api
    guest, _ = enter(client)
    payload = jwt.decode(guest['access_token'][6:], options={'verify_signature': False})
    key = SECRET
    if alteration == 'signature': key = 'different-secret-with-at-least-thirty-two-characters'
    if alteration == 'expired': payload['exp'] = 1
    if alteration == 'role': payload['role'] = 'member'
    if alteration == 'audience': payload['aud'] = 'authenticated'
    if alteration == 'missing-exp': del payload['exp']
    token = 'guest.' + jwt.encode(payload, key, algorithm='HS256')
    assert client.get('/api/chat/sessions', headers={'Authorization': f'Bearer {token}'}).status_code == 401


def test_guest_token_cannot_be_used_as_supabase_token(guest_api):
    client, _ = guest_api
    guest, _ = enter(client)
    assert client.get('/api/family-tree', headers={'Authorization': f"Bearer {guest['access_token'][6:]}"}).status_code == 401


def test_unknown_session_and_missing_token(guest_api):
    client, _ = guest_api
    _, headers = enter(client)
    assert client.get('/api/chat/sessions').status_code == 401
    assert client.post('/api/chat/text', headers=headers, json={'text': 'hi', 'session_id': str(uuid4())}).status_code == 404
    assert client.get('/api/chat/sessions/not-a-uuid', headers=headers).status_code == 400


def test_guest_message_budget(guest_api):
    client, db = guest_api
    guest, headers = enter(client)
    db.execute('UPDATE guest_sessions SET message_count = 200 WHERE id = ?', (guest['id'],))
    db.commit()
    assert client.post('/api/chat/text', headers=headers, json={'text': 'hi'}).status_code == 429


def test_members_still_use_original_storage(guest_api, monkeypatch):
    client, _ = guest_api
    from tests.conftest import make_token, USER_A_ID
    called = []
    monkeypatch.setattr(chat.member_store, 'list_user_sessions', lambda uid: called.append(uid) or [])
    response = client.get('/api/chat/sessions', headers={'Authorization': f'Bearer {make_token(USER_A_ID)}'})
    assert response.status_code == 200 and called == [USER_A_ID]


def test_guest_entry_disabled_without_secret(guest_api, monkeypatch):
    client, _ = guest_api
    monkeypatch.setattr(settings, 'GUEST_JWT_SECRET', '')
    assert client.post('/api/guest/session').status_code == 503


@pytest.mark.parametrize('language_mode', ['modern', 'ancient'])
def test_ancient_chat_can_resume_guest_context(guest_api, monkeypatch, language_mode):
    client, _ = guest_api
    _, headers = enter(client)
    seen_history = []
    monkeypatch.setattr(chat, 'rag_is_ready', lambda: True)
    monkeypatch.setattr(chat, 'get_monument_by_key', lambda _: {'monument_name': 'Abu Simbel', 'display_name': 'أبو سمبل', 'character_name': 'ramsis'})
    monkeypatch.setattr(chat, 'retrieve_and_build', lambda *a, **k: {
        'system_prompt': 'sys', 'user_prompt': 'question', 'monument': 'Abu Simbel',
        'builder': 'Ramsis', 'persona_key': 'abu-simbel', 'chunks': [],
    })

    def generate(**kwargs):
        seen_history.append(kwargs['history'])
        return 'response'

    monkeypatch.setattr(chat, 'generate', generate)
    monkeypatch.setattr(chat, 'generate_with_ancient', lambda **kw: (generate(**kw), 'speech'))
    payload = {'text': 'hello', 'monument_key': 'abu-simbel', 'language_mode': language_mode}
    response = client.post('/api/chat/ancient', headers=headers, json=payload)
    assert response.status_code == 200, response.text
    payload['session_id'] = response.json()['session_id']
    assert client.post('/api/chat/ancient', headers=headers, json=payload).status_code == 200
    assert len(seen_history[0]) == 0 and len(seen_history[1]) == 2
    detail = client.get(f"/api/chat/sessions/{payload['session_id']}", headers=headers).json()
    assert len(detail['messages']) == 4
    assert detail['messages'][1]['metadata']['builder'] == 'Ramsis'


def test_guest_audio_chat_persists(guest_api, monkeypatch):
    client, _ = guest_api
    _, headers = enter(client)
    monkeypatch.setattr(chat, '_transcribe_audio', lambda *_: 'transcribed')
    reply = client.post('/api/chat/audio', headers=headers, files={'file': ('test.webm', b'audio')})
    assert reply.status_code == 200, reply.text
    detail = client.get(f"/api/chat/sessions/{reply.json()['session_id']}", headers=headers).json()
    assert detail['messages'][0]['text'] == 'transcribed'


def test_member_session_id_never_reads_member_storage_for_guest(guest_api, monkeypatch):
    client, _ = guest_api
    _, headers = enter(client)

    def forbidden(*args, **kwargs):
        pytest.fail('Guest request reached member storage')

    monkeypatch.setattr(chat.member_store, 'get_session_detail', forbidden)
    monkeypatch.setattr(chat.member_store, 'get_history', forbidden)
    sid = str(uuid4())
    assert client.get(f'/api/chat/sessions/{sid}', headers=headers).status_code == 404
    assert client.post('/api/chat/text', headers=headers, json={'text': 'hi', 'session_id': sid}).status_code == 404
