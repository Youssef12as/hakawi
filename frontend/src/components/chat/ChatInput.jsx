import { useState, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import MicButton from './MicButton';

export default function ChatInput({ onSendText, onSendAudio, onTranscribeAudio, isLoading }) {
  const [text, setText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const inputRef = useRef(null);

  const handleSend = () => {
    if (!text.trim() || isLoading || isTranscribing) return;
    onSendText(text.trim());
    setText('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAudioReady = async (blob) => {
    if (onTranscribeAudio) {
      try {
        setIsTranscribing(true);
        const res = await onTranscribeAudio(blob);
        if (res && res.text) {
          setText(prev => (prev ? prev + ' ' + res.text : res.text));
        }
      } catch (err) {
        console.error("Transcription failed", err);
      } finally {
        setIsTranscribing(false);
      }
    } else if (onSendAudio) {
      onSendAudio(blob);
    }
  };

  return (
    <div className="p-4 border-t border-[#c4a06a]/10 bg-[#0b0a08]/90 backdrop-blur-xl">
      <div className="flex items-center gap-2 bg-[#1a1815] border border-[#c4a06a]/20 focus-within:border-[#c4a06a]/60 rounded-full px-4 py-2 shadow-inner transition-colors duration-300">
        {isTranscribing ? (
          <div className="p-2.5 text-[#c4a06a]"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <MicButton onAudioReady={handleAudioReady} disabled={isLoading || isTranscribing} />
        )}

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isTranscribing ? "جاري تحويل الصوت لنص..." : "عايز تقول إيه؟..."}
          disabled={isLoading || isTranscribing}
          className="flex-1 bg-transparent text-[#f8ebd5] placeholder:text-[#9d9167]/60 outline-none text-base py-2.5 min-w-0 disabled:opacity-50"
          style={{ fontFamily: 'var(--font-body)' }}
          autoComplete="off"
          id="chat-text-input"
        />

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
    </div>
  );
}
