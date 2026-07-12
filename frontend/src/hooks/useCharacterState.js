import { useState, useRef, useCallback } from 'react';

export function useCharacterState() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef(null);

  const playResponseAudio = useCallback((audioBlob) => {
    return new Promise((resolve) => {
      // Clean up previous audio
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current._blobUrl) {
          URL.revokeObjectURL(audioRef.current._blobUrl);
        }
      }

      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audio._blobUrl = url;
      audioRef.current = audio;

      // isSpeaking true only when audio actually starts playing
      audio.onplay = () => setIsSpeaking(true);

      // isSpeaking false when audio ends
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        resolve();
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        resolve();
      };

      audio.play().catch(() => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        resolve();
      });
    });
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      if (audioRef.current._blobUrl) {
        URL.revokeObjectURL(audioRef.current._blobUrl);
      }
      setIsSpeaking(false);
    }
  }, []);

  return { isSpeaking, playResponseAudio, stopAudio };
}
