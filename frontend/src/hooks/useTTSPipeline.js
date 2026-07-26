import { useState, useCallback, useRef } from 'react';
import { splitIntoBreathGroups } from '../utils/textUtils';
import { useChatApi } from './useChatApi';

export function useTTSPipeline() {
  const { fetchTTS } = useChatApi();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const stopPlaybackRef = useRef(false);
  const currentAudioRef = useRef(null);

  const stopAudio = useCallback(() => {
    stopPlaybackRef.current = true;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      if (currentAudioRef.current._blobUrl) {
        URL.revokeObjectURL(currentAudioRef.current._blobUrl);
      }
    }
    setIsSpeaking(false);
  }, []);

  const playSentencePipeline = useCallback(async (
    fullText, 
    characterName, 
    onTypeStart, // Called before starting to type a sentence
    onTypeUpdate // Called with the progressively typed text
  ) => {
    stopPlaybackRef.current = false;
    const sentences = splitIntoBreathGroups(fullText);

    if (!sentences || sentences.length === 0) {
      onTypeUpdate(fullText);
      return;
    }

    setIsSpeaking(true);
    let displayedText = "";

    // Fire ALL TTS requests at once — no waiting between them
    const audioPromises = sentences.map(s => fetchTTS(s, characterName));

    for (let i = 0; i < sentences.length; i++) {
      if (stopPlaybackRef.current) break;

      const sentence = sentences[i];

      if (!sentence || !sentence.trim()) continue;

      // Wait only for THIS chunk's audio (the others are already in-flight)
      const audioBlob = await audioPromises[i];

      if (audioBlob && !stopPlaybackRef.current) {
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        audio._blobUrl = url;
        currentAudioRef.current = audio;

        await new Promise((resolve) => {
          let charIndex = 0;
          let typingTimer = null;

          function startTyping(msPerChar) {
            function typeNext() {
              if (stopPlaybackRef.current) {
                finishUp();
                return;
              }
              if (charIndex < sentence.length) {
                charIndex++;
                onTypeUpdate(displayedText + sentence.slice(0, charIndex));
                typingTimer = setTimeout(typeNext, msPerChar);
              }
            }
            typeNext();
          }

          function finishUp() {
            if (typingTimer) clearTimeout(typingTimer);
            onTypeUpdate(displayedText + sentence + " ");
            if (audio._blobUrl) URL.revokeObjectURL(audio._blobUrl);
            resolve();
          }

          audio.onended = finishUp;
          audio.onerror = finishUp;

          audio.onloadedmetadata = () => {
            const msPerChar = Math.max(20, (audio.duration * 1000) / sentence.length);
            startTyping(msPerChar);
          };

          audio.play().then(() => {
            if (charIndex === 0 && !stopPlaybackRef.current) {
              startTyping(50); 
            }
          }).catch(() => {
            finishUp();
          });
        });
      } else {
        // TTS failed or stopped — just show text
        onTypeUpdate(displayedText + sentence + " ");
      }

      displayedText += sentence + " ";
    }

    if (!stopPlaybackRef.current) {
      onTypeUpdate(fullText);
    }
    setIsSpeaking(false);
  }, [fetchTTS]);

  // For playing hardcoded static audio blobs (like the chips)
  const playStaticAudio = useCallback(async (audioUrl) => {
    try {
      stopAudio();
      stopPlaybackRef.current = false;
      
      // Fetch the audio file as a blob to prevent browser download managers from intercepting it
      const response = await fetch(audioUrl);
      if (!response.ok) throw new Error('Failed to fetch audio');
      
      const rawBlob = await response.blob();
      // Explicitly set type to audio/wav because we use .dat extensions to bypass IDM
      const blob = new Blob([rawBlob], { type: 'audio/wav' });
      const objectUrl = URL.createObjectURL(blob);
      
      return new Promise((resolve) => {
        const audio = new Audio(objectUrl);
        audio._blobUrl = objectUrl;
        currentAudioRef.current = audio;
        
        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => {
          setIsSpeaking(false);
          resolve(); // stopAudio will revoke the blobUrl, or we could revoke it here
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };
        
        audio.play().catch(() => {
          setIsSpeaking(false);
          resolve();
        });
      });
    } catch (err) {
      console.error("Error playing static audio:", err);
    }
  }, [stopAudio]);

  return { isSpeaking, playSentencePipeline, playStaticAudio, stopAudio };
}
