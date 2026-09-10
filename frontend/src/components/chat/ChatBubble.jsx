import { Volume2 } from 'lucide-react';
import { arabicToHieroglyphs } from '../../utils/hieroglyphs';

export default function ChatBubble({ sender, text, isError, elderName, audioBlob, languageMode }) {
  const isAI = sender === 'ai';

  const handleReplay = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audio.play();
    }
  };

  const renderTextWithImages = (rawText) => {
    if (!rawText) return rawText;
    
    const parts = [];
    // Regex matches ![alt](url)
    const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(rawText)) !== null) {
      // 1. Add the text before the image
      if (match.index > lastIndex) {
        const textPart = rawText.slice(lastIndex, match.index);
        parts.push(
          <span key={`text-${lastIndex}`}>
            {languageMode === 'ancient' ? arabicToHieroglyphs(textPart) : textPart}
          </span>
        );
      }
      
      // Clean the URL (remove accidental dots or spaces at the end)
      let cleanUrl = match[2].trim();
      if (cleanUrl.endsWith('.') || cleanUrl.endsWith(',') || cleanUrl.endsWith(']')) {
        cleanUrl = cleanUrl.slice(0, -1);
      }

      // 2. Add the image itself
      parts.push(
        <div key={`img-wrapper-${match.index}`} className="flex justify-center w-full my-3">
          <img 
            src={cleanUrl} 
            alt={match[1]} 
            className="max-w-full rounded-lg shadow-md border-2 border-[#c4a06a]/30 object-cover"
            loading="lazy"
            style={{ maxHeight: '250px' }}
          />
        </div>
      );
      
      lastIndex = regex.lastIndex;
    }

    // 3. Add any remaining text after the last image
    if (lastIndex < rawText.length) {
      const textPart = rawText.slice(lastIndex);
      parts.push(
        <span key={`text-${lastIndex}`}>
          {languageMode === 'ancient' ? arabicToHieroglyphs(textPart) : textPart}
        </span>
      );
    }

    return parts;
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
        style={{ fontFamily: languageMode === 'ancient' ? '"Segoe UI Historic", "Noto Sans Egyptian Hieroglyphs", sans-serif' : 'var(--font-body)' }}
      >
        <div 
          className={languageMode === 'ancient' ? 'text-lg tracking-wide leading-relaxed flex flex-col' : 'flex flex-col'}
          title={languageMode === 'ancient' ? text : undefined}
          dir="auto"
        >
          {renderTextWithImages(text)}
        </div>
        
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
