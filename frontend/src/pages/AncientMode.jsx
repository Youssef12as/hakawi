import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Globe2, Sparkles } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import CharacterStage from '../components/character/CharacterStage';
import ChatBubble from '../components/chat/ChatBubble';
import ChatInput from '../components/chat/ChatInput';
import { useChatApi } from '../hooks/useChatApi';

export default function AncientMode() {
  const { regionId } = useParams();
  const navigate = useNavigate();
  const { sendAncientMessage, fetchGovernorates, isLoading } = useChatApi();

  const [governorates, setGovernorates] = useState(null);

  useEffect(() => {
    fetchGovernorates().then((data) => {
      if (data) setGovernorates(data.governorates || data);
    });
  }, [fetchGovernorates]);

  // Dynamically resolve region and ancient monument from database
  const activeData = useMemo(() => {
    const gov = governorates?.find((g) => g.key === regionId) || governorates?.[0];
    const monuments = gov?.monuments || [];
    // Prioritize monument with ancient voice key or prominent builder
    const mon = monuments.find((m) => m.ancient_voice_key && m.ancient_voice_key !== 'am-othman') ||
                monuments.find((m) => m.key === 'abu-simbel') ||
                monuments[0];

    return {
      name: gov?.name || 'مصر القديمة',
      elder: mon?.builder || (regionId === 'aswan' ? 'رمسيس الثاني' : 'حكيم مصر'),
      title: mon?.title || 'فرعون مصر العظيم',
      bio: mon?.bio || 'من أعماق التاريخ المصري، أروي لك حكايات الخلود وبناء الحضارة.',
      idleSrc: mon?.idle_video_url,
      talkingSrc: mon?.talking_video_url,
      chips: mon?.chips?.length ? mon.chips : ['هرم خوفو', 'معبد حتشبسوت', 'مقبرة توت عنخ آمون', 'أبو سمبل', 'معبد فيلة'],
      monumentKey: mon?.key,
    };
  }, [governorates, regionId]);

  const handleSendText = useCallback(async (text) => {
    setChatHistory(prev => [...prev, { id: Date.now(), sender: 'user', text, timestamp: Date.now() }]);

    try {
      const data = await sendAncientMessage(text, sessionId, activeData.monumentKey);
      setSessionId(data.session_id);

      setChatHistory(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: data.response,
        timestamp: Date.now() + 1,
        meta: { monument: data.monument, builder: data.builder }
      }]);

      // Simulate speaking for ~3s so the avatar mouth moves while the user reads.
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 3000);
    } catch {
      setChatHistory(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: 'عذرًا، لم أتمكن من استدعاء الحكمة من النصوص القديمة. حاول مرة أخرى.',
        timestamp: Date.now() + 1,
        isError: true
      }]);
    }
  }, [sendAncientMessage, sessionId, activeData.monumentKey]);

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
              <span className="text-[#c4a06a]/60 text-sm font-medium">{activeData.name}</span>
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
              idleSrc={activeData.idleSrc}
              talkingSrc={activeData.talkingSrc}
            />
          </div>

          {/* Ancient Bio Card */}
          <div className="p-6 bg-[#050403]/50 border-t border-[#c4a06a]/10">
            <h2 className="text-3xl font-bold text-[#e8d1a7] mb-1 font-amiri tracking-wide">{activeData.elder}</h2>
            <p className="text-[#c4a06a] text-sm mb-4 tracking-widest">{activeData.title}</p>
            <p className="text-[#c4a06a]/70 text-sm leading-relaxed border-r-2 border-[#c4a06a]/30 pr-4 italic">
              "{activeData.bio}"
            </p>

            <div className="mt-6 pt-6 border-t border-[#c4a06a]/10">
               <p className="text-xs text-[#c4a06a]/50 uppercase tracking-widest mb-3 flex items-center gap-2">
                 <Sparkles className="w-3 h-3" />
                 كلمات مفتاحية
               </p>
               <div className="flex flex-wrap gap-2">
                 {activeData.chips.map(word => (
                   <button
                     key={word}
                     onClick={() => handleSendText(`حدثني عن ${word}`)}
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
                elderName={msg.meta?.builder || activeData.elder}
                isError={msg.isError}
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
