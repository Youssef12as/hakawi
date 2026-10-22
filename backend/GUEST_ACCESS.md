# Guest access

Members continue using Supabase authentication and the original chat tables.
Guests receive an independently signed token, with a separate UUID and a fixed
24-hour lifetime by default. Guests can list, resume, and delete only their own
temporary conversations. Profile and family features require member login.

## Enable

1. Apply `migrations/001_guest_chat.sql` to the intended database, using its SQL
   console or `python tools/guest_database.py migrate` from `backend`.
   First run `python tools/guest_database.py validate` to exercise the schema,
   history queries, and isolation inside a transaction that is rolled back.
   This adds three tables; it does not change member tables. The database role
   used by the backend must own these tables or bypass RLS. Browser roles get no
   access to them.
2. Set `GUEST_JWT_SECRET` to a new random secret of at least 32 characters on the
   backend. Do not reuse the Supabase secret or expose it in frontend variables.
   For example generate one with `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
3. Optionally set `GUEST_SESSION_HOURS` (default 24; bounded to 1–168).
4. Restart the backend and run `python tools/guest_database.py check`.

Leaving the signing secret empty disables guest entry without changing member
access. Rotating the secret invalidates outstanding guest credentials.

## Retention and limits

Expired identities are rejected on every request, including history retrieval.
The backend cleans expired guest rows at startup and hourly while running;
foreign-key cascades remove conversations and messages. If it is offline,
physical cleanup occurs when it next starts. A scheduler can alternatively run
`python tools/guest_database.py cleanup` hourly.

Each guest identity is limited to 100 conversations and 200 generation attempts
over its lifetime. Failed attempts count toward the limit. These are per-session
limits, not a global abuse-prevention mechanism: apply IP rate limiting to
`POST /api/guest/session` at the hosting proxy before exposing guest entry to
untrusted high-volume traffic.

The browser remembers the guest token until expiry. Logging out or signing in
as a member revokes that guest session and deletes its temporary data; no chats
are transferred into the member account. Other browsers do not share its data.

## Verification

`python -m pytest tests/test_guest_access.py` exercises guest token validation,
isolation, persistence, history, expiry, and member-only rejection using an
isolated SQLite adapter (no real users/database credentials). Use
`python tools/guest_database.py validate` for PostgreSQL storage verification.
Live AI responses and browser interactions still need an environment smoke test.
