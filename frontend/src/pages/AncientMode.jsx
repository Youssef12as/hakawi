import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Globe2, Sparkles } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import CharacterStage from '../components/character/CharacterStage';
import ChatBubble from '../components/chat/ChatBubble';
import ChatInput from '../components/chat/ChatInput';

const ANCIENT_REGIONS = {
  aswan: { name: 'أسوان والنوبة', elder: 'رمسيس الثاني', title: 'فرعون مصر العظيم', bio: 'أنا رمسيس الثاني، باني معابد أبو سمبل العظيمة. هنا يتحد النيل مع الخلود.' },
  luxor: { name: 'الأقصر', elder: 'أمنحتب الثالث', title: 'ملك الشمس', bio: 'في طيبة العظيمة شيدت المعابد التي تصل بين الأرض والسماء، وبين البشر والآلهة.' },
  cairo: { name: 'الجيزة', elder: 'خوفو', title: 'باني الهرم الأكبر', bio: 'حجارة الأهرامات لا تحكي فقط عن الموت، بل عن الحياة التي تمتد لأبد الآبدين.' },
  alexandria: { name: 'الإسكندرية', elder: 'كليوباترا', title: 'ملكة مصر', bio: 'حيث يلتقي البحر بالمكتبة العظيمة، هنا تجتمع حكمة العالم بأسره.' }
};

export default function AncientMode() {
  const { regionId } = useParams();
  const navigate = useNavigate();
  const region = ANCIENT_REGIONS[regionId] || ANCIENT_REGIONS['aswan'];
  
  const [chatHistory, setChatHistory] = useState([
    {
      id: 1,
      sender: 'ai',
      text: '𓇋𓏏𓈖 𓂋𓂝 𓊹𓊹𓊹! (مرحباً بك في عصر الأجداد. اسألني عن أسرار الفراعنة...)',
      timestamp: Date.now()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSendText = useCallback(async (text) => {
    setChatHistory(prev => [...prev, { id: Date.now(), sender: 'user', text, timestamp: Date.now() }]);
    setIsLoading(true);

    // Simulate Pharaonic response
    setTimeout(() => {
      let aiResponseText = '𓋹𓊵𓏏𓊪 𓎛𓎡𓅓... (الحكمة توجد في الصمت أكثر من الكلام. لقد بنينا الأهرامات بالإرادة وليس بالكلمات.)';
      
      if (text.includes('هرم')) {
        aiResponseText = '𓍋𓅓𓂋 𓉐𓂋 𓉐𓂋... (الأهرامات ليست مقابر بل بوابات للنجوم، حيث يصعد الملك إلى السماء.)';
      } else if (text.includes('نيل')) {
        aiResponseText = '𓇋𓏏𓂋𓅱 𓂝𓉻 𓈖𓆑𓂋... (النيل هو شريان الحياة، لولاه لكانت مصر صحراء قاحلة. نحن نقدس حابي إله النيل.)';
      }

      setChatHistory(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: aiResponseText, timestamp: Date.now() + 1 }]);
      setIsLoading(false);
      
      // Simulate speaking for 3 seconds
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 3000);
    }, 1500);
  }, []);

  const handleClose = () => {
    navigate('/map');
  };

  return (
    <PageShell className="bg-[#050403]">
      <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-[#0b0a08]" style={{ background: 'radial-gradient(circle at center, #1a150c 0%, #050403 100%)' }}>
        
        {/* Character Portal & Bio Side */}
        <div className="flex flex-col lg:w-[55%] border-b lg:border-b-0 lg:border-l border-[#c4a06a]/30 overflow-y-auto custom-scrollbar">
          
          {/* Ancient Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#c4a06a]/20 flex-shrink-0 bg-[#050403]/80 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#c4a06a]/20 border border-[#c4a06a]/30">
                <Globe2 className="w-4 h-4 text-[#c4a06a]" />
                <span className="text-[#c4a06a] text-xs font-bold tracking-wider">وضع اللغة الهيروغليفية</span>
              </div>
              <span className="text-[#c4a06a]/60 text-sm font-medium">{region.name}</span>
            </div>
            <button
              onClick={handleClose}
              className="text-[#c4a06a]/50 hover:text-[#c4a06a] transition-colors p-2 hover:bg-[#c4a06a]/10 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Pharaonic Stage */}
          <div className="w-full relative">
            {/* Ambient Pharaonic particles (Simulated) */}
            <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen" style={{ backgroundImage: 'radial-gradient(circle, #e8d1a7 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            
            <CharacterStage
              isSpeaking={isSpeaking}
              // We reuse the am-othman video but in reality this would be a Pharaonic avatar
              idleSrc={`/character/am-othman-idle.mp4`}
              talkingSrc={`/character/am-othman-talking.mp4`}
            />
          </div>

          {/* Ancient Bio Card */}
          <div className="p-6 bg-[#050403]/50 border-t border-[#c4a06a]/10">
            <h2 className="text-3xl font-bold text-[#e8d1a7] mb-1 font-amiri tracking-wide">{region.elder}</h2>
            <p className="text-[#c4a06a] text-sm mb-4 tracking-widest">{region.title}</p>
            <p className="text-[#c4a06a]/70 text-sm leading-relaxed border-r-2 border-[#c4a06a]/30 pr-4 italic">
              "{region.bio}"
            </p>
            
            <div className="mt-6 pt-6 border-t border-[#c4a06a]/10">
               <p className="text-xs text-[#c4a06a]/50 uppercase tracking-widest mb-3 flex items-center gap-2">
                 <Sparkles className="w-3 h-3" />
                 كلمات مفتاحية
               </p>
               <div className="flex flex-wrap gap-2">
                 {['هرم', 'نيل', 'معبد', 'آلهة'].map(word => (
                   <button 
                     key={word} 
                     onClick={() => handleSendText(`حدثني عن ال${word}`)}
                     className="px-4 py-2 rounded-full border border-[#c4a06a]/20 text-[#c4a06a]/80 text-xs hover:bg-[#c4a06a]/10 transition-colors"
                   >
                     {word}
                   </button>
                 ))}
               </div>
            </div>
          </div>
        </div>

        {/* Chat Side */}
        <div className="flex flex-col lg:w-[45%] min-h-0 bg-[#0a0806]/80 backdrop-blur-sm relative">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {chatHistory.map((msg) => (
              <ChatBubble
                key={msg.id}
                sender={msg.sender}
                text={msg.text}
                elderName={region.elder}
              />
            ))}
            {isLoading && (
               <div className="flex justify-start">
                 <div className="bg-[#1a1815] text-[#c4a06a] rounded-2xl rounded-tr-sm px-6 py-4 border border-[#c4a06a]/20 shadow-lg">
                   <span className="animate-pulse">𓏏𓎛𓅱𓏏𓇋...</span>
                 </div>
               </div>
            )}
          </div>
          <ChatInput onSendText={handleSendText} isLoading={isLoading} />
        </div>

      </div>
    </PageShell>
  );
}
