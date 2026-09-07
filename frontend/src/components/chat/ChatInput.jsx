import { useState, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import MicButton from './MicButton';
import { useDeepgramLive } from '../../hooks/useDeepgramLive';

export default function ChatInput({ onSendText, onSendAudio, onTranscribeAudio, isLoading }) {
  const [text, setText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const inputRef = useRef(null);
  const baseTextRef = useRef('');

  // Live real-time WebSocket streaming with Deepgram Nova-3
  const {
    isStreaming,
    startStreaming,
    stopStreaming,
    toggleStreaming: toggleLiveStream,
    error: streamError,
  } = useDeepgramLive({
    onTranscriptUpdate: (finalText, interimText) => {
      const parts = [baseTextRef.current, finalText, interimText].filter(Boolean);
      setText(parts.join(' '));
    },
    onStreamEnd: (finalText) => {
      const parts = [baseTextRef.current, finalText].filter(Boolean);
      setText(parts.join(' '));
      inputRef.current?.focus();
    },
  });

  const handleMicToggle = () => {
    if (!isStreaming) {
      baseTextRef.current = text.trim();
      startStreaming();
    } else {
      stopStreaming();
    }
  };

  const handleSend = () => {
    if (isStreaming) {
      stopStreaming();
    }
    if (!text.trim() || isLoading || isTranscribing) return;
    onSendText(text.trim());
    setText('');
    baseTextRef.current = '';
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Fallback file-based STT (in case live streaming is bypassed or used via blob)
  const handleAudioReadyFallback = async (blob) => {
    if (onTranscribeAudio) {
      try {
        setIsTranscribing(true);
        const res = await onTranscribeAudio(blob);
        if (res && res.text) {
          setText((prev) => (prev ? `${prev} ${res.text}` : res.text));
        }
      } catch (err) {
        console.error('Transcription failed:', err);
      } finally {
        setIsTranscribing(false);
      }
    } else if (onSendAudio) {
      onSendAudio(blob);
    }
  };

  return (
    <div className="p-4 border-t border-[#c4a06a]/10 bg-[#0b0a08]/90 backdrop-blur-xl">
      <div
        className={`flex items-center gap-2 bg-[#1a1815] border rounded-full px-4 py-2 shadow-inner transition-colors duration-300 ${
          isStreaming
            ? 'border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
            : 'border-[#c4a06a]/20 focus-within:border-[#c4a06a]/60'
        }`}
      >
        {isTranscribing ? (
          <div className="p-2.5 text-[#c4a06a]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <MicButton
            isRecording={isStreaming}
            onToggle={handleMicToggle}
            onAudioReady={handleAudioReadyFallback}
            disabled={isLoading || isTranscribing}
          />
        )}

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            baseTextRef.current = e.target.value;
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            isStreaming
              ? '🎙️ جاري الاستماع المباشر... تكلم بالعربية'
              : isTranscribing
              ? 'جاري تحويل الصوت لنص...'
              : 'عايز تقول إيه؟...'
          }
          disabled={isLoading || isTranscribing}
          className="flex-1 bg-transparent text-[#f8ebd5] placeholder:text-[#9d9167]/60 outline-none text-base py-2.5 min-w-0 disabled:opacity-50"
          style={{ fontFamily: 'var(--font-body)' }}
          autoComplete="off"
          id="chat-text-input"
        />

        {isStreaming && (
          <div className="flex items-center gap-1 px-2 animate-pulse text-red-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>مباشر</span>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={!text.trim() || isLoading || isTranscribing}
          className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-[#c4a06a] to-[#a8865a] text-[#0b0a08] hover:scale-110 shadow-[0_0_20px_rgba(196,160,106,0.3)] transition-all duration-300 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed rounded-full ml-1"
          aria-label="ابعت"
          id="chat-send-btn"
        >
          <Send className="w-5 h-5 -ml-1 mt-0.5" />
        </button>
      </div>

      {streamError && (
        <p className="text-red-400/80 text-xs text-center mt-2 animate-fade-in">
          {streamError}
        </p>
      )}
    </div>
  );
}
