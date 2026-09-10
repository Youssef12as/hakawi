"""Session lifecycle + ownership + single-row turn persistence tests."""

import pytest

from src.database import get_db_cursor
from tests.conftest import USER_A_ID


def _get_turn_rows(session_id):
    with get_db_cursor() as cur:
        cur.execute(
            """
            SELECT question, response, metadata
            FROM public.chat_messages
            WHERE session_id = %s
            ORDER BY created_at;
            """,
            (session_id,),
        )
        return cur.fetchall()


class TestSessionLifecycle:
    def test_create_session_stamps_user_id(self, client, auth_users, token_a):
        r = client.post(
            "/api/chat/sessions",
            json={"chat_mode": "ancient", "monument_key": "abu-simbel", "title": "أبو سمبل"},
            headers=token_a,
        )
        assert r.status_code == 200
        data = r.json()
        assert data["session_id"]
        assert data["chat_mode"] == "ancient"

        with get_db_cursor() as cur:
            cur.execute(
                "SELECT user_id, chat_mode, title FROM public.chat_sessions WHERE id = %s;",
                (data["session_id"],),
            )
            row = cur.fetchone()
        assert row is not None
        assert str(row["user_id"]) == USER_A_ID
        assert row["chat_mode"] == "ancient"

    def test_list_sessions_scoped_to_owner(self, client, auth_users, token_a, token_b):
        before_a = len(client.get("/api/chat/sessions", headers=token_a).json()["sessions"])

        client.post("/api/chat/sessions", json={"chat_mode": "regional"}, headers=token_a)
        client.post("/api/chat/sessions", json={"chat_mode": "ancient"}, headers=token_a)
        client.post("/api/chat/sessions", json={"chat_mode": "family_member"}, headers=token_b)

        a_list = client.get("/api/chat/sessions", headers=token_a).json()["sessions"]
        b_list = client.get("/api/chat/sessions", headers=token_b).json()["sessions"]

        # A gained exactly the 2 sessions created here
        assert len(a_list) == before_a + 2
        # A never sees B's family session
        assert all(s["chat_mode"] != "family_member" for s in a_list)
        # B's list contains B's family session
        assert any(s["chat_mode"] == "family_member" for s in b_list)
        # No overlap between the two users' sessions
        a_ids = {s["id"] for s in a_list}
        b_ids = {s["id"] for s in b_list}
        assert a_ids.isdisjoint(b_ids)

    def test_get_session_detail_owner_ok(self, client, auth_users, token_a):
        created = client.post(
            "/api/chat/sessions", json={"chat_mode": "regional"}, headers=token_a
        ).json()

        r = client.get(f"/api/chat/sessions/{created['session_id']}", headers=token_a)
        assert r.status_code == 200
        assert r.json()["id"] == created["session_id"]
        assert r.json()["messages"] == []

    def test_foreign_session_detail_404(self, client, auth_users, token_a, token_b):
        created = client.post(
            "/api/chat/sessions", json={"chat_mode": "regional"}, headers=token_a
        ).json()

        # User B must not see user A's session (404, no existence leak)
        r = client.get(f"/api/chat/sessions/{created['session_id']}", headers=token_b)
        assert r.status_code == 404

    def test_delete_session_owner_only(self, client, auth_users, token_a, token_b):
        created = client.post(
            "/api/chat/sessions", json={"chat_mode": "regional"}, headers=token_a
        ).json()
        sid = created["session_id"]

        # B cannot delete A's session
        assert client.delete(f"/api/chat/sessions/{sid}", headers=token_b).status_code == 404
        # A can
        assert client.delete(f"/api/chat/sessions/{sid}", headers=token_a).status_code == 200
        # Gone for A too now
        assert client.get(f"/api/chat/sessions/{sid}", headers=token_a).status_code == 404


class TestChatTurnPersistence:
    def test_chat_text_saves_single_row_turn(
        self, client, auth_users, token_a, monkeypatch
    ):
        import src.chat.router as chat_router

        monkeypatch.setattr(
            chat_router, "generate", lambda **kwargs: "أهلاً بيكم في أسوان يا ولدي."
        )

        r = client.post(
            "/api/chat/text",
            json={"text": "إزيك يا عم عثمان", "region": "aswan"},
            headers=token_a,
        )
        assert r.status_code == 200
        session_id = r.json()["session_id"]

        rows = _get_turn_rows(session_id)
        assert len(rows) == 1, "a turn must be exactly one row"
        assert rows[0]["question"] == "إزيك يا عم عثمان"
        assert rows[0]["response"] == "أهلاً بيكم في أسوان يا ولدي."

    def test_chat_text_followup_reuses_session(
        self, client, auth_users, token_a, monkeypatch
    ):
        import src.chat.router as chat_router

        monkeypatch.setattr(chat_router, "generate", lambda **kwargs: "رد تجريبي.")

        first = client.post(
            "/api/chat/text",
            json={"text": "السؤال الأول", "region": "aswan"},
            headers=token_a,
        ).json()

        second = client.post(
            "/api/chat/text",
            json={"text": "السؤال الثاني", "region": "aswan", "session_id": first["session_id"]},
            headers=token_a,
        ).json()

        assert second["session_id"] == first["session_id"]
        rows = _get_turn_rows(first["session_id"])
        assert len(rows) == 2
        assert rows[0]["question"] == "السؤال الأول"
        assert rows[1]["question"] == "السؤال الثاني"

    def test_chat_text_into_foreign_session_404(
        self, client, auth_users, token_a, token_b, monkeypatch
    ):
        import src.chat.router as chat_router

        monkeypatch.setattr(chat_router, "generate", lambda **kwargs: "رد تجريبي.")

        a_session = client.post(
            "/api/chat/sessions", json={"chat_mode": "regional"}, headers=token_a
        ).json()

        r = client.post(
            "/api/chat/text",
            json={"text": "intrusion attempt", "session_id": a_session["session_id"]},
            headers=token_b,
        )
        assert r.status_code == 404

    def test_ancient_chat_persists_metadata(
        self, client, auth_users, token_a, monkeypatch
    ):
        import src.chat.router as chat_router

        fake_payload = {
            "system_prompt": "sys",
            "user_prompt": "user",
            "monument": "أبو سمبل — رمسيس الثاني",
            "builder": "رمسيس الثاني",
            "persona_key": "abu-simbel",
            "chunks": [(0.9, {"text": "chunk"})],
        }
        monkeypatch.setattr(chat_router, "retrieve_and_build", lambda *a, **k: fake_payload)
        monkeypatch.setattr(chat_router, "generate", lambda **kwargs: "أنا رمسيس الثاني.")

        r = client.post(
            "/api/chat/ancient",
            json={"text": "مين أنت؟", "monument_key": "abu-simbel", "language_mode": "modern"},
            headers=token_a,
        )
        assert r.status_code == 200
        data = r.json()
        assert data["character_name"] == "amr-abdeen-modern"

        rows = _get_turn_rows(data["session_id"])
        assert len(rows) == 1
        meta = rows[0]["metadata"]
        assert meta["character_name"] == "amr-abdeen-modern"
        assert meta["builder"] == "رمسيس الثاني"
        assert meta["tts_text"] == "أنا رمسيس الثاني."

    def test_history_endpoint_scoped_to_user(
        self, client, auth_users, token_a, token_b, monkeypatch
    ):
        import src.chat.router as chat_router

        monkeypatch.setattr(chat_router, "generate", lambda **kwargs: "رد تجريبي.")

        a_data = client.post(
            "/api/chat/text",
            json={"text": "سؤال المستخدم أ"},
            headers=token_a,
        ).json()

        # A reads own history by session id
        r = client.get(
            "/api/chat/history", params={"session_id": a_data["session_id"]}, headers=token_a
        )
        assert r.status_code == 200
        msgs = r.json()["messages"]
        assert len(msgs) == 2
        assert msgs[0]["sender"] == "user"
        assert msgs[1]["sender"] == "ai"

        # B cannot read A's history (404)
        r = client.get(
            "/api/chat/history", params={"session_id": a_data["session_id"]}, headers=token_b
        )
        assert r.status_code == 404

        # B's "most recent" lookup must not surface A's session
        r = client.get("/api/chat/history", params={"chat_mode": "regional"}, headers=token_b)
        assert r.status_code == 200
        assert r.json()["session_id"] is None


class TestTurnIntegrity:
    def test_response_never_exists_without_question(self, client, auth_users, token_a):
        """The schema must reject a turn with NULL question: a response can
        never exist in a row without its question."""
        created = client.post(
            "/api/chat/sessions", json={"chat_mode": "regional"}, headers=token_a
        ).json()
        sid = created["session_id"]

        with pytest.raises(Exception):
            with get_db_cursor(commit=True) as cur:
                cur.execute(
                    """
                    INSERT INTO public.chat_messages (session_id, question, response)
                    VALUES (%s, NULL, 'رد يتيم بدون سؤال');
                    """,
                    (sid,),
                )

        # Cleanup
        with get_db_cursor(commit=True) as cur:
            cur.execute("DELETE FROM public.chat_sessions WHERE id = %s;", (sid,))
