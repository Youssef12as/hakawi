-- Additive migration: member/auth tables are unchanged.
BEGIN;
CREATE TABLE IF NOT EXISTS public.guest_sessions (
    id uuid PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    message_count integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS guest_sessions_expiry ON public.guest_sessions(expires_at);
CREATE TABLE IF NOT EXISTS public.guest_chat_sessions (
    id uuid PRIMARY KEY,
    guest_id uuid NOT NULL REFERENCES public.guest_sessions(id) ON DELETE CASCADE,
    chat_mode text NOT NULL CHECK (chat_mode IN ('regional', 'ancient')),
    governorate_key text,
    monument_key text,
    language_mode text NOT NULL DEFAULT 'modern',
    title text NOT NULL DEFAULT 'محادثة جديدة',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS guest_chat_owner ON public.guest_chat_sessions(guest_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS public.guest_chat_messages (
    id uuid PRIMARY KEY,
    session_id uuid NOT NULL REFERENCES public.guest_chat_sessions(id) ON DELETE CASCADE,
    question text NOT NULL,
    response text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS guest_chat_message_session ON public.guest_chat_messages(session_id, created_at);
-- No direct browser access. All authorization goes through the backend.
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_chat_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guest_sessions, public.guest_chat_sessions, public.guest_chat_messages FROM anon, authenticated;
COMMIT;
