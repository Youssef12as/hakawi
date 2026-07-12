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
          max-w-[85%] px-5 py-4 text-sm leading-relaxed border
          ${isAI
            ? `rounded-2xl rounded-tr-sm ${
                isError
                  ? 'bg-red-500/15 text-red-200 border-red-400/20'
                  : 'bg-[#1a1815] text-sand/90 border-[#c4a06a]/20 shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
              }`
            : 'bg-[#c4a06a]/10 text-sand border-[#c4a06a]/30 rounded-2xl rounded-tl-sm'
          }
        `}
      >
        <p>{text}</p>
        
        {/* Footer with Name and Audio Button */}
        <div className={`flex items-center gap-2 mt-3 pt-3 border-t border-[#c4a06a]/10 ${isAI ? 'justify-between' : 'justify-end'}`}>
          {isAI && (
             <button 
               onClick={handleReplay} 
               disabled={!audioBlob} 
               className="text-[#c4a06a]/50 hover:text-[#c4a06a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
               title={audioBlob ? "إعادة الاستماع" : "جاري تحضير الصوت..."}
             >
               <Volume2 className="w-4 h-4" />
             </button>
          )}
          <span className="text-xs font-bold text-[#c4a06a]/80">
            {isAI ? elderName : 'أنت'}
          </span>
        </div>
      </div>
    </div>
  );
}
