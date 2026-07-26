import { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import MicButton from './MicButton';
import { useChatApi } from '../../hooks/useChatApi';

export default function ChatInput({ onSendText, isLoading }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const { transcribeAudio, isLoading: isTranscribing } = useChatApi();

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
    try {
      const data = await transcribeAudio(blob);
      if (data?.text) {
        // Auto-send voice messages immediately — no extra click needed
        onSendText(data.text.trim());
      }
    } catch (err) {
      console.error("Transcription failed", err);
    }
  };

  const disabled = isLoading || isTranscribing;

  return (
    <div className="p-4 border-t border-[#c4a06a]/10 bg-[#0b0a08]/50">
      <div className="flex items-center gap-2 bg-[#1a1815] border border-[#c4a06a]/20 rounded-full px-3 py-1.5 shadow-inner">
        <MicButton onAudioReady={handleAudioReady} disabled={disabled} />

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isTranscribing ? "جاري تحويل الصوت إلى نص..." : "تحدث مع الشخصية... (اكتب رسالتك هنا)"}
          disabled={disabled}
          className="flex-1 bg-transparent text-sand placeholder:text-sand/30 outline-none text-sm py-2.5 min-w-0"
          autoComplete="off"
          id="chat-text-input"
        />

        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="p-2.5 bg-[#c4a06a]/20 text-[#c4a06a] hover:bg-[#c4a06a] hover:text-espresso transition-all duration-300 disabled:opacity-30 disabled:hover:bg-[#c4a06a]/20 disabled:hover:text-[#c4a06a] disabled:cursor-not-allowed rounded-full ml-1"
          aria-label="إرسال"
          id="chat-send-btn"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
