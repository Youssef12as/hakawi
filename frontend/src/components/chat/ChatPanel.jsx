import { useRef, useEffect } from 'react';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';

export default function ChatPanel({ chatHistory, onSendText, onSendAudio, onTranscribeAudio, isLoading, elderName, languageMode }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  return (
    <div className="flex flex-col flex-1 min-h-0" id="chat-panel">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {/* Welcome message */}
        {chatHistory.length === 0 && !isLoading && (
          <div className="text-center py-10 animate-fade-in">
            <div className="w-14 h-14 bg-[#c4a06a]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#c4a06a]/20">
              <span className="text-2xl">💬</span>
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

      {/* Input */}
      <ChatInput onSendText={onSendText} onSendAudio={onSendAudio} onTranscribeAudio={onTranscribeAudio} isLoading={isLoading} />
    </div>
  );
}
