import { useRef, useEffect, useState } from 'react';
import { Check, ChevronDown, MessageCircle, X } from 'lucide-react';
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
  const [showModeSheet, setShowModeSheet] = useState(false);

  const activeMode = RESPONSE_MODES.find((mode) => mode.key === responseMode) || RESPONSE_MODES[0];

  const visibleMobileSuggestions = suggestions
    .slice(0, 3)
    .map((suggestion, index) => ({ suggestion, index }))
    .filter(({ index }) => !dismissedSuggestions.includes(index));

  useEffect(() => {
    const messages = messagesRef.current;
    if (!messages) return;
    messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  useEffect(() => {
    if (!showModeSheet) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') setShowModeSheet(false);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showModeSheet]);

  return (
    <div className="relative flex flex-col flex-1 min-h-0" id="chat-panel">
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

      {immersiveMobile && onResponseModeChange && (
        <div className="flex shrink-0 items-center justify-between border-t border-[#c4a06a]/10 bg-[#0b0a08]/78 px-4 py-1.5 lg:hidden">
          <span className="text-xs font-medium text-[#9d9167]">أسلوب الرد</span>
          <button
            type="button"
            onClick={() => setShowModeSheet(true)}
            aria-haspopup="dialog"
            aria-expanded={showModeSheet}
            className="flex min-h-11 items-center gap-2 rounded-full border border-[#c4a06a]/35 bg-[#1a1815] px-4 text-sm font-bold text-[#f4dfbd] transition-colors active:bg-[#c4a06a]/20"
          >
            <span>{activeMode.label}</span>
            <ChevronDown className="h-4 w-4 text-[#c4a06a]" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Input */}
      <ChatInput onSendText={onSendText} onSendAudio={onSendAudio} onTranscribeAudio={onTranscribeAudio} isLoading={isLoading} />

      {immersiveMobile && onResponseModeChange && showModeSheet && (
        <div className="absolute inset-0 z-[70] flex items-end lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={() => setShowModeSheet(false)}
            aria-label="إغلاق قائمة أسلوب الرد"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="response-mode-title"
            className="animate-fade-in-up relative z-10 w-full rounded-t-[1.75rem] border-t border-[#c4a06a]/35 bg-[#14110d] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_60px_rgba(0,0,0,0.65)]"
          >
            <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-[#c4a06a]/45" aria-hidden="true" />
            <div className="mb-3 flex items-center justify-between">
              <h2 id="response-mode-title" className="font-amiri text-xl font-bold text-[#ffe2b3]">
                اختر أسلوب الرد
              </h2>
              <button
                type="button"
                onClick={() => setShowModeSheet(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#f4dfbd]/70 transition-colors active:bg-[#c4a06a]/15 active:text-[#fff5e3]"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-2">
              {RESPONSE_MODES.map((mode) => {
                const isSelected = mode.key === responseMode;

                return (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => {
                      onResponseModeChange(mode.key);
                      setShowModeSheet(false);
                    }}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-right transition-colors ${
                      isSelected
                        ? 'border-[#c4a06a]/70 bg-[#c4a06a]/16 text-[#fff2dc]'
                        : 'border-[#c4a06a]/15 bg-[#1a1815] text-[#f4dfbd] active:bg-[#c4a06a]/10'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-[#c4a06a] bg-[#c4a06a] text-[#0b0a08]' : 'border-[#c4a06a]/30 text-transparent'}`}>
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{mode.label}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-[#b9a88d]">{mode.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
