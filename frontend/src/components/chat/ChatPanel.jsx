import { useRef, useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';

/* ── الـ 3 أوضاع بتاعت الرد ── */
const RESPONSE_MODES = [
  { key: 'direct',       label: 'مباشر',  desc: 'إجابة واضحة ومختصرة' },
  { key: 'hikaya',       label: 'حكاوي',  desc: 'يحكيلك قصة ممتعة' },
  { key: 'presentation', label: 'عرض',    desc: 'عرض منظم بأرقام وحقائق' },
];

export default function ChatPanel({ chatHistory, onSendText, onSendAudio, onTranscribeAudio, isLoading, elderName, languageMode, responseMode, onResponseModeChange, immersiveMobile = false, suggestions = [] }) {
  const messagesEndRef = useRef(null);
  const messagesRef = useRef(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState([]);

  const visibleMobileSuggestions = suggestions
    .slice(0, 3)
    .map((suggestion, index) => ({ suggestion, index }))
    .filter(({ index }) => !dismissedSuggestions.includes(index));

  useEffect(() => {
    const messages = messagesRef.current;
    if (!messages) return;
    messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  return (
    <div className="flex flex-col flex-1 min-h-0" id="chat-panel">
      {/* ── Response Mode Selector ── */}
      {onResponseModeChange && (
        <div className={`items-center justify-center gap-2 px-4 py-2 border-b border-[#c4a06a]/10 bg-[#0b0a08]/60 ${immersiveMobile ? 'hidden lg:flex' : 'flex'}`}>
          {RESPONSE_MODES.map((mode) => (
            <button
              key={mode.key}
              onClick={() => onResponseModeChange(mode.key)}
              title={mode.desc}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                responseMode === mode.key
                  ? 'bg-[#c4a06a] text-[#0b0a08] shadow-[0_0_12px_rgba(196,160,106,0.4)]'
                  : 'bg-[#1a1815] text-[#9d9167] border border-[#c4a06a]/20 hover:border-[#c4a06a]/50 hover:text-[#c4a06a]'
              }`}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {mode.label}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={messagesRef} className={`flex-1 overflow-y-auto space-y-2.5 ${immersiveMobile ? 'px-4 py-2 lg:py-3' : 'px-4 py-3'}`}>
        {/* Welcome message */}
        {chatHistory.length === 0 && !isLoading && (
          <div className={`text-center animate-fade-in ${immersiveMobile ? 'py-4 lg:py-10' : 'py-10'}`}>
            <div className="w-14 h-14 bg-[#c4a06a]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#c4a06a]/20">
              <MessageCircle className="h-6 w-6 text-[#c4a06a]" aria-hidden="true" />
            </div>
            <p className="text-[#9d9167] text-sm leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
              ابدأ الكلام مع <span className="text-[#c4a06a] font-bold text-base">{elderName}</span>
              <br />
              <span className="text-[#9d9167]/70 text-xs mt-1 block">اكتب رسالة أو ابعت فويس</span>
            </p>
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <ChatBubble
            key={`${msg.timestamp}-${i}`}
            sender={msg.sender}
            text={msg.text}
            isError={msg.isError}
            audioBlob={msg.audioBlob}
            elderName={elderName}
            languageMode={languageMode}
          />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-[#1a1815]/95 border border-[#c4a06a]/15 text-[#f8ebd5] rounded-2xl rounded-tl-sm px-5 py-4 shadow-lg flex items-center gap-1.5">
              {[0, 0.2, 0.4].map((d, i) => (
                <span key={i} className="w-2 h-2 rounded-full bg-[#c4a06a] opacity-60 animate-bounce" style={{ animationDelay: `${d}s` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {immersiveMobile && visibleMobileSuggestions.length > 0 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto px-3 pb-2 lg:hidden" aria-label="أسئلة مقترحة">
          {visibleMobileSuggestions.map(({ suggestion, index }) => (
            <div
              key={`${suggestion}-${index}`}
              className="relative min-h-11 min-w-[7rem] flex-1 overflow-hidden rounded-full border border-[#c4a06a]/45 bg-[#17130e]/92"
            >
              <button
                type="button"
                onClick={() => onSendText(suggestion)}
                className="min-h-11 w-full py-2 pl-10 pr-3 text-xs font-semibold text-[#f4dfbd] transition-colors active:bg-[#c4a06a]/20"
              >
                {suggestion}
              </button>
              <button
                type="button"
                onClick={() => setDismissedSuggestions((current) => [...current, index])}
                aria-label={`إزالة اقتراح: ${suggestion}`}
                title={`إزالة اقتراح: ${suggestion}`}
                className="absolute inset-y-0 left-0 flex w-10 items-center justify-center text-[#f4dfbd]/55 transition-colors hover:text-[#fff5e3] active:bg-[#c4a06a]/15"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <ChatInput onSendText={onSendText} onSendAudio={onSendAudio} onTranscribeAudio={onTranscribeAudio} isLoading={isLoading} />
    </div>
  );
}
