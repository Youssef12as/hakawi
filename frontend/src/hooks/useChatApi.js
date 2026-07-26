import { useState, useCallback } from 'react';

export function useChatApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendTextMessage = useCallback(async (text, sessionId, region = 'aswan') => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/chat/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, session_id: sessionId, region }),
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

  const sendAudioMessage = useCallback(async (blob, sessionId, region = 'aswan') => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      if (sessionId) formData.append('session_id', sessionId);
      formData.append('region', region);

      const res = await fetch('/api/chat/audio', {
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

  // RAG-backed Ancient Mode chat — returns {response, monument, builder, ...}
  // monument_key constrains the RAG search to a specific monument's chunks.
  const sendAncientMessage = useCallback(async (text, sessionId, monumentKey) => {
    setIsLoading(true);
    setError(null);
    try {
      const body = { text, session_id: sessionId };
      if (monumentKey) body.monument_key = monumentKey;
      const res = await fetch('/api/chat/ancient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  return {
    sendTextMessage,
    sendAudioMessage,
    sendAncientMessage,
    transcribeAudio,
    fetchGovernorates,
    fetchTTS,
    isLoading,
    error,
  };
}
