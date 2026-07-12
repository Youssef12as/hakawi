import { useRef, useEffect } from 'react';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';

export default function ChatPanel({ chatHistory, onSendText, onSendAudio, isLoading, elderName }) {
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
            <div className="w-14 h-14 bg-sand/8 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-sand/40 text-sm leading-relaxed">
              ابدأ المحادثة مع <span className="text-sand/60 font-semibold">{elderName}</span>
              <br />
              <span className="text-sand/25 text-xs">اكتب رسالة أو سجّل صوتك</span>
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
          />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-sand/10 rounded-2xl rounded-es-sm px-5 py-3">
              <div className="loading-dots">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSendText={onSendText} onSendAudio={onSendAudio} isLoading={isLoading} />
    </div>
  );
}
