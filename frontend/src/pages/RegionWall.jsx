import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import CharacterStage from '../components/character/CharacterStage';
import ChatPanel from '../components/chat/ChatPanel';
import { useTTSPipeline } from '../hooks/useTTSPipeline';
import { useChatApi } from '../hooks/useChatApi';

// ─── Region Configs ────────────────────────────────────────────────────────────
// Each region gets its own visual "wall" world
const REGION_WALLS = {
  aswan: {
    name: 'أسوان والنوبة',
    character: 'am-othman',
    elderName: 'عم عثمان',
    // CSS gradient for the wall background fallback
    wallGradient: 'linear-gradient(135deg, #4a1942 0%, #7b3f00 40%, #c4853a 70%, #e8b87d 100%)',
    wallImage: '/assets/nubian-carpet-bg.png',
    wallType: 'carpet',       // 'carpet' | 'temple' | 'islamic' | 'mosaic'
    accentColor: '#e8a87d',   // amber/terracotta
    glowColor: 'rgba(232, 168, 125, 0.6)',
    theme: {
      bg: '#0f0a08',
      text: '#f5e6d3',
      border: '#c4853a',
    },
    hotspots: [
      {
        id: 'triangle',
        top: '38%',
        left: '30%',
        size: 'lg',
        symbol: '△',
        label: 'رمز الحماية',
        story: 'أهلاً يا ولدي! المثلث اللي ضغطت عليه ده مش مجرد شكل. أجدادنا النوبيين كانوا بينسجوه في الكليم عشان يعكس العين ويحمي البيت من الحسد. كل مثلث فيه روح من جدة قضت حياتها تنسج الحكمة في الخيوط.',
      },
      {
        id: 'wave',
        top: '60%',
        left: '65%',
        size: 'md',
        symbol: '〰',
        label: 'نهر النيل',
        story: 'الخط المتعرج ده هو شريان الحياة — نهر النيل. النوبة كلها اتربت على ضفافه، وكل كليم لازم يكون فيه ذكر للنيل اللي سقانا وغذى أرضنا وحمل قوارب أجدادنا.',
      },
      {
        id: 'tree',
        top: '55%',
        left: '28%',
        size: 'sm',
        symbol: '🌿',
        label: 'شجرة الحياة',
        story: 'الشجرة في الكليم النوبي بترمز للخصوبة والحياة المستمرة. زي الجذور اللي بتمسك الأرض، التراث بيمسكنا ومش بيخلينا نضيع في الدنيا الواسعة.',
      },
    ],
  },

  luxor: {
    name: 'الأقصر وصعيد مصر',
    character: 'am-othman',
    elderName: 'حكيم الأقصر',
    wallGradient: 'linear-gradient(160deg, #1a0e00 0%, #3d2000 30%, #7a4800 60%, #c4920a 100%)',
    wallImage: '/assets/temple-wall-bg.png',
    wallType: 'temple',
    accentColor: '#c4a847',
    glowColor: 'rgba(196, 168, 71, 0.7)',
    theme: {
      bg: '#0a0800',
      text: '#f5e8c0',
      border: '#c4a847',
    },
    hotspots: [
      {
        id: 'ankh',
        top: '35%',
        left: '35%',
        size: 'lg',
        symbol: '𓋹',
        label: 'عنخ — مفتاح الحياة',
        story: 'يا حبيبي، الرمز ده اسمه "عنخ" وهو مفتاح الحياة عند أجدادك الفراعنة. كانوا بيشيلوه الآلهة في إيدهم كعلامة إنهم بيمنحوا الحياة الأبدية. لغاية النهارده الرمز ده موجود على جدران معبد الأقصر.',
      },
      {
        id: 'eye',
        top: '55%',
        left: '62%',
        size: 'md',
        symbol: '𓂀',
        label: 'عين حورس',
        story: 'عين حورس دي من أشهر رموز مصر القديمة. حورس إله السماء قاتل ضد عمه ست وخسر عينه، لكن المعبود تحوت رجعها له. ومن يومها العين بقت رمز الحماية والشفاء والقوة.',
      },
      {
        id: 'scarab',
        top: '42%',
        left: '65%',
        size: 'sm',
        symbol: '𓆣',
        label: 'الجعران المقدس',
        story: 'الجعران، أو "خبري"، كان رمز التجديد وشروق الشمس. الفراعنة شافوا الجعران وهو بيدفع الكرة ووجدوا فيه صورة للإله اللي بيدفع الشمس في السما كل صباح.',
      },
    ],
  },

  cairo: {
    name: 'القاهرة والجيزة',
    character: 'am-othman',
    elderName: 'الشيخ محمود',
    wallGradient: 'linear-gradient(135deg, #0a0f1a 0%, #1a2535 30%, #2d4a6e 60%, #4a7fa0 100%)',
    wallImage: '/assets/islamic-door-bg.png',
    wallType: 'islamic',
    accentColor: '#5aa0c4',
    glowColor: 'rgba(90, 160, 196, 0.6)',
    theme: {
      bg: '#050810',
      text: '#d0e8f5',
      border: '#4a7fa0',
    },
    hotspots: [
      {
        id: 'star8',
        top: '40%',
        left: '32%',
        size: 'lg',
        symbol: '✦',
        label: 'نجمة الثمانية',
        story: 'النجمة الثمانية دي من أشهر الزخارف الفاطمية اللي زينوا بيها مساجد القاهرة القديمة. الرقم ثمانية عند العلماء المسلمين كان رمز للكمال والتوازن الكوني.',
      },
      {
        id: 'arabesque',
        top: '58%',
        left: '60%',
        size: 'md',
        symbol: '❋',
        label: 'الأرابيسك',
        story: 'الأرابيسك هو فن إسلامي خالص. الخطوط اللي بتتشابك من غير نهاية بترمز لاستمرارية الوجود وقدرة الله على خلق الجمال بلا حدود. تقدر تشوف نفس النقش ده في خان الخليلي.',
      },
    ],
  },

  alexandria: {
    name: 'الإسكندرية والدلتا',
    character: 'am-othman',
    elderName: 'عم سيد البحري',
    wallGradient: 'linear-gradient(160deg, #050d14 0%, #0a2035 30%, #1a4a6e 60%, #2a7aa0 100%)',
    wallImage: '/assets/mosaic-bg.png',
    wallType: 'mosaic',
    accentColor: '#4a9fc4',
    glowColor: 'rgba(74, 159, 196, 0.6)',
    theme: {
      bg: '#030a10',
      text: '#c5e5f5',
      border: '#2a7aa0',
    },
    hotspots: [
      {
        id: 'triton',
        top: '42%',
        left: '35%',
        size: 'lg',
        symbol: '🔱',
        label: 'حضارة البحر',
        story: 'الإسكندرية يا حبيبي مدينة بتتنفس من البحر. الإغريق واليهود والمصريين والرومان كلهم عاشوا هنا وخلوا أثر. الفسيفساء دي بتحكي قصة مدينة كانت مركز العالم القديم.',
      },
      {
        id: 'lighthouse',
        top: '55%',
        left: '62%',
        size: 'md',
        symbol: '🏛️',
        label: 'فنار الإسكندرية',
        story: 'فنار الإسكندرية كان إحدى عجائب الدنيا السبع. اتبنى على جزيرة فاروس وارتفاعه قارب 135 متر. كان يهدي المراكب لميناء أعظم مدينة في العالم القديم.',
      },
    ],
  },
};

// ─── Wall Overlay Patterns (CSS-only) ──────────────────────────────────────────
function WallOverlay({ wallType, accentColor }) {
  const patterns = {
    carpet: (
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="carpet-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <polygon points="30,5 55,55 5,55" fill="none" stroke={accentColor} strokeWidth="1"/>
            <rect x="20" y="20" width="20" height="20" fill="none" stroke={accentColor} strokeWidth="0.5" transform="rotate(45 30 30)"/>
            <circle cx="30" cy="30" r="3" fill={accentColor} opacity="0.4"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#carpet-pattern)"/>
      </svg>
    ),
    temple: (
      <svg className="absolute inset-0 w-full h-full opacity-15" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="temple-pattern" x="0" y="0" width="80" height="40" patternUnits="userSpaceOnUse">
            <line x1="0" y1="20" x2="80" y2="20" stroke={accentColor} strokeWidth="1"/>
            <line x1="40" y1="0" x2="40" y2="40" stroke={accentColor} strokeWidth="0.5"/>
            <text x="15" y="15" fontSize="14" fill={accentColor} opacity="0.6" fontFamily="serif">𓂀</text>
            <text x="50" y="35" fontSize="12" fill={accentColor} opacity="0.5" fontFamily="serif">𓋹</text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#temple-pattern)"/>
      </svg>
    ),
    islamic: (
      <svg className="absolute inset-0 w-full h-full opacity-15" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="islamic-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            {[0, 45, 90, 135].map(angle => (
              <line key={angle}
                x1="40" y1="40"
                x2={40 + 38 * Math.cos(angle * Math.PI / 180)}
                y2={40 + 38 * Math.sin(angle * Math.PI / 180)}
                stroke={accentColor} strokeWidth="1"
              />
            ))}
            <polygon points="40,5 75,40 40,75 5,40" fill="none" stroke={accentColor} strokeWidth="0.8"/>
            <circle cx="40" cy="40" r="10" fill="none" stroke={accentColor} strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#islamic-pattern)"/>
      </svg>
    ),
    mosaic: (
      <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="mosaic-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect x="1" y="1" width="17" height="17" fill={accentColor} opacity="0.3"/>
            <rect x="22" y="1" width="17" height="17" fill={accentColor} opacity="0.15"/>
            <rect x="1" y="22" width="17" height="17" fill={accentColor} opacity="0.15"/>
            <rect x="22" y="22" width="17" height="17" fill={accentColor} opacity="0.3"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mosaic-pattern)"/>
      </svg>
    ),
  };
  return patterns[wallType] || null;
}

// ─── Hotspot Button ────────────────────────────────────────────────────────────
function HotspotButton({ spot, accentColor, glowColor, onClick }) {
  const sizes = { lg: 'w-20 h-20 text-2xl', md: 'w-16 h-16 text-xl', sm: 'w-12 h-12 text-base' };
  return (
    <button
      onClick={() => onClick(spot)}
      className={`absolute z-20 ${sizes[spot.size || 'md']} -translate-x-1/2 -translate-y-1/2 group outline-none cursor-pointer`}
      style={{ top: spot.top, left: spot.left }}
    >
      {/* Ping ring */}
      <div
        className="absolute inset-0 rounded-full animate-ping opacity-60"
        style={{ backgroundColor: accentColor }}
      />
      {/* Core */}
      <div
        className="relative w-full h-full rounded-full flex items-center justify-center backdrop-blur-sm border-2 transition-transform duration-300 group-hover:scale-110"
        style={{
          backgroundColor: `${accentColor}30`,
          borderColor: `${accentColor}90`,
          boxShadow: `0 0 30px ${glowColor}`,
        }}
      >
        <span>{spot.symbol}</span>
      </div>
      {/* Tooltip */}
      <span
        className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ backgroundColor: '#000000cc', color: accentColor, border: `1px solid ${accentColor}40` }}
      >
        {spot.label}
      </span>
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function RegionWall({ regionKey, onBack }) {
  const navigate = useNavigate();
  const wall = REGION_WALLS[regionKey];

  const [phase, setPhase] = useState('wall');   // 'wall' | 'cracking' | 'chat'
  const [sessionId, setSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);

  const { isSpeaking, playSentencePipeline, stopAudio } = useTTSPipeline();
  const { sendTextMessage, sendAudioMessage, isLoading } = useChatApi();

  // Trigger the cinematic crack → reveal sequence
  const handleHotspotClick = useCallback(async (spot) => {
    setPhase('cracking');
    const newSessionId = uuidv4();
    setSessionId(newSessionId);

    const msgId = Date.now();
    setChatHistory([{ id: msgId, sender: 'ai', text: '', timestamp: msgId }]);

    setTimeout(async () => {
      setPhase('chat');
      await playSentencePipeline(spot.story, wall.character, null, (typed) => {
        setChatHistory(prev => prev.map(m => m.id === msgId ? { ...m, text: typed } : m));
      });
    }, 1200);
  }, [wall, playSentencePipeline]);

  const handleBackToWall = useCallback(() => {
    stopAudio();
    setPhase('wall');
    setChatHistory([]);
    setSessionId(null);
  }, [stopAudio]);

  // ── Text Chat ──────────────────────────────────────────────────────
  const handleSendText = useCallback(async (text) => {
    setChatHistory(prev => [...prev, { sender: 'user', text, timestamp: Date.now() }]);
    try {
      const data = await sendTextMessage(text, sessionId);
      setSessionId(data.session_id);
      const msgId = Date.now();
      setChatHistory(prev => [...prev, { id: msgId, sender: 'ai', text: '', timestamp: msgId }]);
      await playSentencePipeline(data.response, wall.character, null, (typed) => {
        setChatHistory(prev => prev.map(m => m.id === msgId ? { ...m, text: typed } : m));
      });
    } catch {
      setChatHistory(prev => [...prev, { sender: 'ai', text: 'عذرًا، حدث خطأ.', timestamp: Date.now(), isError: true }]);
    }
  }, [sessionId, wall, sendTextMessage, playSentencePipeline]);

  // ── Audio Chat ─────────────────────────────────────────────────────
  const handleSendAudio = useCallback(async (blob) => {
    try {
      const data = await sendAudioMessage(blob, sessionId);
      setSessionId(data.session_id);
      const msgId = Date.now();
      setChatHistory(prev => [
        ...prev,
        { sender: 'user', text: data.transcribed_text, timestamp: msgId - 1 },
        { id: msgId, sender: 'ai', text: '', timestamp: msgId },
      ]);
      await playSentencePipeline(data.response, wall.character, null, (typed) => {
        setChatHistory(prev => prev.map(m => m.id === msgId ? { ...m, text: typed } : m));
      });
    } catch {
      setChatHistory(prev => [...prev, { sender: 'ai', text: 'لم أفهم التسجيل.', timestamp: Date.now(), isError: true }]);
    }
  }, [sessionId, wall, sendAudioMessage, playSentencePipeline]);

  if (!wall) return null;

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: wall.theme.bg }}>

      {/* ── Phase 1: The Wall ── */}
      <div
        className={`absolute inset-0 transition-all duration-[1800ms] ease-in-out ${phase !== 'wall' ? 'scale-110 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
      >
        {/* Background image or gradient */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${wall.wallImage}), ${wall.wallGradient}`,
          }}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />
        {/* SVG Pattern Overlay */}
        <WallOverlay wallType={wall.wallType} accentColor={wall.accentColor} />

        {/* Title */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center pointer-events-none z-10">
          <h2
            className="text-4xl font-bold mb-2 drop-shadow-2xl"
            style={{ color: wall.accentColor, textShadow: `0 0 30px ${wall.glowColor}` }}
          >
            {wall.name}
          </h2>
          <p className="text-white/70 text-lg font-medium">
            اضغط على أي رمز لتكتشف حكايته ✨
          </p>
        </div>

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-6 right-6 z-30 px-4 py-2 rounded-full text-sm font-bold backdrop-blur-md border transition-all hover:scale-105"
          style={{ color: wall.accentColor, borderColor: `${wall.accentColor}50`, backgroundColor: '#00000060' }}
        >
          ← العودة للخريطة
        </button>

        {/* Hotspot Buttons */}
        {wall.hotspots.map(spot => (
          <HotspotButton
            key={spot.id}
            spot={spot}
            accentColor={wall.accentColor}
            glowColor={wall.glowColor}
            onClick={handleHotspotClick}
          />
        ))}
      </div>

      {/* ── Phase 2: Crack Flash ── */}
      <div
        className={`absolute inset-0 pointer-events-none flex items-center justify-center transition-opacity duration-700 ${phase === 'cracking' ? 'opacity-100' : 'opacity-0'}`}
      >
        <div
          className="w-[200vw] h-[200vh] rounded-full blur-[150px] animate-pulse"
          style={{ backgroundColor: wall.accentColor, mixBlendMode: 'screen', opacity: 0.5 }}
        />
      </div>

      {/* ── Phase 3: Character + Chat ── */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 delay-300 ${phase === 'chat' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <div
          className="w-full h-full grid lg:grid-cols-[1.2fr_0.8fr]"
          style={{ background: `radial-gradient(ellipse at 30% 50%, ${wall.theme.bg}ee, #050505)` }}
        >
          {/* Left — Character */}
          <div className="relative flex flex-col" style={{ borderRight: `1px solid ${wall.accentColor}20` }}>
            <CharacterStage
              isSpeaking={isSpeaking}
              idleSrc={`/character/${wall.character}-idle.mp4`}
              talkingSrc={`/character/${wall.character}-talking.mp4`}
            />
            {/* Back to wall */}
            <button
              onClick={handleBackToWall}
              className="absolute top-5 right-5 z-50 px-4 py-2 rounded-full text-sm font-bold backdrop-blur-md border transition-all hover:scale-105 flex items-center gap-2"
              style={{ color: wall.accentColor, borderColor: `${wall.accentColor}50`, backgroundColor: '#00000070' }}
            >
              <span>↩</span>
              <span>الجدار</span>
            </button>
          </div>

          {/* Right — Chat */}
          <div className="flex flex-col min-h-0" style={{ background: '#0a0908' }}>
            <ChatPanel
              chatHistory={chatHistory}
              onSendText={handleSendText}
              onSendAudio={handleSendAudio}
              isLoading={isLoading}
              elderName={wall.elderName}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
