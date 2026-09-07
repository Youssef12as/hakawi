import { useState, useRef, useCallback } from 'react';

/**
 * Hook for live real-time Arabic speech-to-text using Deepgram Nova-3 via WebSocket.
 * Continuously streams 250ms audio chunks and receives interim/final transcripts.
 */
export function useDeepgramLive({ onTranscriptUpdate, onStreamEnd } = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState(null);

  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const accumulatedFinalRef = useRef('');

  const stopStreaming = useCallback(() => {
    // 1. Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    mediaRecorderRef.current = null;

    // 2. Stop audio tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // 3. Gracefully close WebSocket
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        try {
          socketRef.current.send(JSON.stringify({ type: 'CloseStream' }));
          socketRef.current.close(1000, 'Stream ended by user');
        } catch (e) {
          // ignore
        }
      }
      socketRef.current = null;
    }

    setIsStreaming(false);
    setInterimText('');

    if (onStreamEnd && accumulatedFinalRef.current) {
      onStreamEnd(accumulatedFinalRef.current.trim());
    }
  }, [onStreamEnd]);

  const startStreaming = useCallback(async () => {
    setError(null);
    setInterimText('');
    accumulatedFinalRef.current = '';

    try {
      // 1. Request microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // 2. Connect to backend WebSocket proxy
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/api/ws/stt`;
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      socketRef.current = ws;

      ws.onopen = () => {
        setIsStreaming(true);

        // 3. Determine best supported MIME type
        let mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '';
          }
        }

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
        mediaRecorderRef.current = recorder;

        // Send 250ms chunks continuously
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(e.data);
          }
        };

        recorder.start(250);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Deepgram Results message
          if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
            const transcript = data.channel.alternatives[0].transcript || '';
            const isFinal = data.is_final;

            if (transcript) {
              if (isFinal) {
                accumulatedFinalRef.current = accumulatedFinalRef.current
                  ? `${accumulatedFinalRef.current} ${transcript}`
                  : transcript;
                setInterimText('');
                if (onTranscriptUpdate) {
                  onTranscriptUpdate(accumulatedFinalRef.current, '');
                }
              } else {
                setInterimText(transcript);
                if (onTranscriptUpdate) {
                  onTranscriptUpdate(accumulatedFinalRef.current, transcript);
                }
              }
            }
          }
        } catch (err) {
          console.error('Error parsing Deepgram WS message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('Deepgram WebSocket error:', err);
        setError('تعذر الاتصال بخدمة التحويل الصوتي المباشر');
      };

      ws.onclose = () => {
        setIsStreaming(false);
      };
    } catch (err) {
      console.error('Error starting live streaming:', err);
      setError('تعذر الوصول إلى الميكروفون');
      setIsStreaming(false);
    }
  }, [onTranscriptUpdate]);

  const toggleStreaming = useCallback(() => {
    if (isStreaming) {
      stopStreaming();
    } else {
      startStreaming();
    }
  }, [isStreaming, startStreaming, stopStreaming]);

  return {
    isStreaming,
    interimText,
    startStreaming,
    stopStreaming,
    toggleStreaming,
    error,
  };
}
