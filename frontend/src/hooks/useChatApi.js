import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function useChatApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendTextMessage = useCallback(async (text, sessionId) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/chat/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, session_id: sessionId }),
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

  const sendAudioMessage = useCallback(async (blob, sessionId) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      if (sessionId) formData.append('session_id', sessionId);

      const res = await fetch(`${API_BASE}/api/chat/audio`, {
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

  const fetchTTS = useCallback(async (text, characterName) => {
    try {
      const res = await fetch(`${API_BASE}/api/tts`, {
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

  return { sendTextMessage, sendAudioMessage, fetchTTS, isLoading, error };
}
