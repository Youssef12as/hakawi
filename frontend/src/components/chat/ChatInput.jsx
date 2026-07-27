import { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import MicButton from './MicButton';

export default function ChatInput({ onSendText, onSendAudio, isLoading }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
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

  return (
    <div className="p-4 border-t border-[#c4a06a]/10 bg-[#0b0a08]/90 backdrop-blur-xl">
      <div className="flex items-center gap-2 bg-[#1a1815] border border-[#c4a06a]/20 focus-within:border-[#c4a06a]/60 rounded-full px-4 py-2 shadow-inner transition-colors duration-300">
        <MicButton onAudioReady={onSendAudio} disabled={isLoading} />

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="عايز تقول إيه؟..."
          disabled={isLoading}
          className="flex-1 bg-transparent text-[#f8ebd5] placeholder:text-[#9d9167]/60 outline-none text-base py-2.5 min-w-0"
          style={{ fontFamily: 'var(--font-body)' }}
          autoComplete="off"
          id="chat-text-input"
        />

        <button
          onClick={handleSend}
          disabled={!text.trim() || isLoading}
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
