import { Volume2 } from 'lucide-react';

export default function ChatBubble({ sender, text, isError, elderName, audioBlob }) {
  const isAI = sender === 'ai';

  const handleReplay = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audio.play();
    }
  };

  return (
    <div className={`flex flex-col w-full ${isAI ? 'items-start' : 'items-end'} animate-fade-in`}>
      <div
        className={`
          max-w-[85%] px-5 py-3.5 text-base leading-relaxed border shadow-lg
          ${isAI
            ? `rounded-2xl rounded-tl-sm ${
                isError
                  ? 'bg-red-500/15 text-red-200 border-red-400/20'
                  : 'bg-[#1a1815]/95 text-[#f8ebd5] border border-[#c4a06a]/20'
              }`
            : 'bg-gradient-to-br from-[#c4a06a] to-[#a8865a] text-[#0b0a08] font-semibold border-none rounded-2xl rounded-tr-sm'
          }
        `}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <p>{text}</p>
        
        {/* Footer with Name and Audio Button */}
        <div className={`flex items-center gap-2 mt-3 pt-3 border-t border-[#c4a06a]/10 ${isAI ? 'justify-between' : 'justify-end'}`}>
           {isAI && (
             <button 
               onClick={handleReplay} 
               disabled={!audioBlob} 
               className={`transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                 isError ? 'text-red-400/50 hover:text-red-400' : 'text-[#c4a06a]/50 hover:text-[#c4a06a]'
               }`}
               title={audioBlob ? "اسمع تاني" : "بيحضر الصوت..."}
             >
               <Volume2 className="w-4 h-4" />
             </button>
          )}
          <span className={`text-xs font-bold ${isAI ? 'text-[#c4a06a]/80' : 'text-[#0b0a08]/70'}`}>
            {isAI ? elderName : 'أنا'}
          </span>
        </div>
      </div>
    </div>
  );
}
