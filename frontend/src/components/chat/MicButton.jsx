import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';

export default function MicButton({
  onAudioReady,
  disabled,
  isRecording: externalIsRecording,
  onToggle: externalOnToggle,
}) {
  const [internalRecording, setInternalRecording] = useState(false);
  const isControlled = externalOnToggle !== undefined;
  const isRecording = isControlled ? !!externalIsRecording : internalRecording;

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size > 0 && onAudioReady) {
          onAudioReady(blob);
        }
      };

      recorder.start();
      setInternalRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  }, [onAudioReady]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setInternalRecording(false);
  }, []);

  const handleClick = () => {
    if (isControlled) {
      externalOnToggle();
    } else {
      if (internalRecording) stopRecording();
      else startRecording();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled && !isRecording}
      className={`
        p-2.5 rounded-xl transition-all duration-300
        ${isRecording
          ? 'text-red-400 bg-red-400/15 animate-recording-pulse'
          : 'text-sand/40 hover:text-wine hover:bg-wine/10'
        }
        disabled:opacity-20 disabled:cursor-not-allowed
      `}
      aria-label={isRecording ? 'إيقاف التسجيل' : 'تسجيل صوتي'}
      id="mic-btn"
    >
      {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </button>
  );
}
