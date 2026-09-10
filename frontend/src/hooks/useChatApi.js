import { useState, useCallback } from 'react';
import { getAuthHeaders, handleUnauthorized } from '../utils/apiAuth';

export function useChatApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendTextMessage = useCallback(async (text, sessionId, extraParams = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = typeof extraParams === 'string'
        ? { text, session_id: sessionId, region: extraParams }
        : { text, session_id: sessionId, ...extraParams };

      const res = await fetch('/api/chat/text', {
        method: 'POST',
        headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        await handleUnauthorized();
        throw new Error('انتهت الجلسة. من فضلك سجل الدخول مرة أخرى.');
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendAudioMessage = useCallback(async (blob, sessionId, extraParams = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      if (sessionId) formData.append('session_id', sessionId);

      if (typeof extraParams === 'string') {
        formData.append('region', extraParams);
      } else if (extraParams && typeof extraParams === 'object') {
        Object.entries(extraParams).forEach(([k, v]) => formData.append(k, v));
      }

      const res = await fetch('/api/chat/audio', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: formData,
      });
      if (res.status === 401) {
        await handleUnauthorized();
        throw new Error('انتهت الجلسة. من فضلك سجل الدخول مرة أخرى.');
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const transcribeAudio = useCallback(async (blob) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');

      const res = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // RAG-backed Ancient Mode chat — returns {response, tts_text, monument, builder, ...}
  // monument_key constrains the RAG search to a specific monument's chunks.
  // languageMode: 'modern' (default) or 'ancient' — controls TTS output language.
  // responseMode: 'direct' | 'hikaya' | 'presentation' — controls response style.
  const sendAncientMessage = useCallback(async (text, sessionId, monumentKey, languageMode = 'modern', responseMode = 'direct') => {
    setIsLoading(true);
    setError(null);
    try {
      const body = { text, session_id: sessionId };
      if (monumentKey) body.monument_key = monumentKey;
      if (languageMode) body.language_mode = languageMode;
      if (responseMode) body.response_mode = responseMode;
      const res = await fetch('/api/chat/ancient', {
        method: 'POST',
        headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        await handleUnauthorized();
        throw new Error('انتهت الجلسة. من فضلك سجل الدخول مرة أخرى.');
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTTS = useCallback(async (text, characterName) => {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, character_name: characterName }),
      });
      if (!res.ok) return null;
      return await res.blob();
    } catch (e) {
      console.error('TTS error:', e);
      return null;
    }
  }, []);

  const fetchGovernorates = useCallback(async () => {
    try {
      const res = await fetch('/api/governorates');
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('Failed to fetch governorates:', e);
      return null;
    }
  }, []);

  // ─── Authenticated chat sessions (history) ──────────────────────────

  // Create a session owned by the logged-in user. Sends the access token;
  // the backend extracts the user id and stamps it on the session.
  const createSession = useCallback(async (context = {}) => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(context),
      });
      if (res.status === 401) {
        await handleUnauthorized();
        throw new Error('التسجيل مطلوب لبدء محادثة.');
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/sessions', {
        headers: await getAuthHeaders(),
      });
      if (res.status === 401) {
        await handleUnauthorized();
        return { sessions: [] };
      }
      if (!res.ok) return { sessions: [] };
      return await res.json();
    } catch (e) {
      console.error('Failed to fetch sessions:', e);
      return { sessions: [] };
    }
  }, []);

  const fetchSessionDetail = useCallback(async (sessionId) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, {
        headers: await getAuthHeaders(),
      });
      if (res.status === 401) {
        await handleUnauthorized();
        return null;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('Failed to fetch session detail:', e);
      return null;
    }
  }, []);

  const deleteSession = useCallback(async (sessionId) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      });
      if (res.status === 401) {
        await handleUnauthorized();
        return false;
      }
      return res.ok;
    } catch (e) {
      console.error('Failed to delete session:', e);
      return false;
    }
  }, []);

  const fetchChatHistory = useCallback(async ({ sessionId, monumentKey, familyMemberId, chatMode } = {}) => {
    try {
      const params = new URLSearchParams();
      if (sessionId) params.append('session_id', sessionId);
      if (monumentKey) params.append('monument_key', monumentKey);
      if (familyMemberId) params.append('family_member_id', familyMemberId);
      if (chatMode) params.append('chat_mode', chatMode);

      const res = await fetch(`/api/chat/history?${params.toString()}`, {
        headers: await getAuthHeaders(),
      });
      if (res.status === 401) {
        await handleUnauthorized();
        return null;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('Failed to fetch chat history:', e);
      return null;
    }
  }, []);

  return {
    sendTextMessage,
    sendAudioMessage,
    sendAncientMessage,
    transcribeAudio,
    fetchGovernorates,
    fetchChatHistory,
    fetchTTS,
    createSession,
    fetchSessions,
    fetchSessionDetail,
    deleteSession,
    isLoading,
    error,
  };
}
