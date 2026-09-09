import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { X, Languages } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import DialectMap from '../components/map/DialectMap';
import MonumentSelector from '../components/map/MonumentSelector';
import CharacterStage from '../components/character/CharacterStage';
import CharacterCard from '../components/character/CharacterCard';
import ChatPanel from '../components/chat/ChatPanel';
import AIBadge from '../components/consent/AIBadge';
import { useCharacterState } from '../hooks/useCharacterState';
import { useChatApi } from '../hooks/useChatApi';

/* ── Cross-fade transition duration (ms) ── */
const CROSSFADE_MS = 600;

/* ── Wall Symbols (from Landing Page) ── */
const WALL_SYMBOLS = [
  { id: 'nubian-baskets', name: 'السلال النوبية', desc: 'كانت هذه السلال تُنسج يدويًا من سعف النخيل، وتُستخدم لحفظ الخبز والتمر والمحاصيل.', img: '/image/ramz.png', top: '66%', left: '12%' },
  { id: 'nubian-tray', name: 'الطبق النوبي', desc: 'يحمل كل طبق زخارف هندسية مستوحاة من النيل والبيئة المحيطة.', img: '/image/noqush.png', top: '61%', left: '32%' },
  { id: 'clay-jar', name: 'الجرة الفخارية', desc: 'كانت الجرار تحفظ الماء باردًا حتى في أشد أيام الصيف حرارة.', img: '/image/ramz.png', top: '54%', left: '43%' },
  { id: 'hand-loom', name: 'النول اليدوي', desc: 'على هذا النول كانت تُنسج المفروشات والسجاد خيطًا بعد خيط.', img: '/image/noqush.png', top: '56%', left: '51%' },
  { id: 'woven-textile', name: 'قطعة نسيج يدوية', desc: 'كل لون ونقشة يحملان دلالة خاصة ترتبط بالمكان والمناسبة.', img: '/image/ramz.png', top: '81%', left: '74%' },
  { id: 'luxor-carpet', name: 'سجادة الأقصر', desc: 'استُلهمت زخارفها من المعابد وأعمدة الكرنك والطبيعة المحيطة بالنيل.', img: '/image/noqush.png', top: '42%', left: '90%' },
];

export default function MapInteract() {


  // 3-stage state: null → governorate → monument
  const [governorates, setGovernorates] = useState(null);
  const [selectedGovernorate, setSelectedGovernorate] = useState(null);
  const [selectedMonument, setSelectedMonument] = useState(null);

  // New state for "Great Wall" feature
  const [showWall, setShowWall] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState(null);

  // Cross-fade transition state
  // When transitioning from map → monument selector, we briefly render both
  // layers and animate opacity so the switch feels like a continuous movement.
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [fadePhase, setFadePhase] = useState('idle'); // 'idle' | 'out' | 'in'
  const pendingGovRef = useRef(null);

  const [sessionId, setSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  // Language mode for TTS: 'modern' = Arabic voice, 'ancient' = old Egyptian voice
  const [languageMode, setLanguageMode] = useState('modern');
  // Response style: 'direct' = factual, 'hikaya' = storytelling, 'presentation' = TED talk
  const [responseMode, setResponseMode] = useState('direct');

  const { isSpeaking, playResponseAudio, stopAudio } = useCharacterState();
  const { sendTextMessage, sendAncientMessage, fetchTTS, fetchGovernorates, fetchChatHistory, transcribeAudio, isLoading } = useChatApi();

  // ── Fetch governorates on mount ─────────────────────────────────
  useEffect(() => {
    fetchGovernorates().then((data) => {
      if (data) setGovernorates(data.governorates || data);
    });
  }, [fetchGovernorates]);

  // ── Stage 1 → Stage 2: pick a governorate (with cross-fade) ────
  const handleSelectGovernorate = useCallback(
    (govKey) => {
      stopAudio();
      const gov = governorates?.find((g) => g.key === govKey);
      if (gov) {
        // Start cross-fade transition
        pendingGovRef.current = gov;
        setIsTransitioning(true);
        setFadePhase('out');

        // After the map fades out, commit the state and fade in
        setTimeout(() => {
          setSelectedGovernorate(gov);
          setFadePhase('in');

          // Clean up transition state after fade-in completes
          setTimeout(() => {
            setIsTransitioning(false);
            setFadePhase('idle');
            pendingGovRef.current = null;
          }, CROSSFADE_MS);
        }, CROSSFADE_MS);
      }
    },
    [stopAudio, governorates],
  );

  // ── Stage 2 → Stage 3: pick a monument ─────────────────────────
  const handleSelectMonument = useCallback(async (monument) => {
    setSelectedMonument(monument);
    const histData = await fetchChatHistory({ monumentKey: monument.key });
    if (histData && histData.session_id && histData.messages?.length > 0) {
      setSessionId(histData.session_id);
      setChatHistory(histData.messages);
    } else {
      setSessionId(uuidv4());
      setChatHistory([]);
    }
  }, [fetchChatHistory]);

  // ── Navigation helpers ──────────────────────────────────────────
  const handleBackToMap = useCallback(() => {
    stopAudio();
    setSelectedGovernorate(null);
    setSelectedMonument(null);
    setSessionId(null);
    setChatHistory([]);
  }, [stopAudio]);

  const handleBackToMonuments = useCallback(() => {
    stopAudio();
    setSelectedMonument(null);
    setSessionId(null);
    setChatHistory([]);
  }, [stopAudio]);

  // ── Text Chat (RAG-backed via /api/chat/ancient) ────────────────
  const handleSendText = useCallback(
    async (text) => {
      setChatHistory((prev) => [
        ...prev,
        { sender: 'user', text, timestamp: Date.now() },
      ]);

      try {
        const data = await sendAncientMessage(text, sessionId, selectedMonument?.key, languageMode, responseMode);
        setSessionId(data.session_id);
        const aiResponseText = data.response;
        // Use tts_text for TTS (old Egyptian when ancient mode, same as response when modern)
        const ttsText = data.tts_text || aiResponseText;

        const msgId = Date.now();
        setChatHistory((prev) => [
          ...prev,
          {
            id: msgId,
            sender: 'ai',
            text: aiResponseText,
            timestamp: msgId,
            meta: { monument: data.monument, builder: data.builder },
          },
        ]);

        // TTS — always use the character's voice, but text differs by language mode
        const characterName = data.character_name || selectedMonument?.character_name || 'am-othman';
        const audioBlob = await fetchTTS(ttsText, characterName);

        if (audioBlob) {
          setChatHistory((prev) =>
            prev.map((msg) =>
              msg.id === msgId ? { ...msg, audioBlob } : msg
            )
          );
          await playResponseAudio(audioBlob);
        }
      } catch {
        setChatHistory((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: 'عذرًا، لم أتمكن من استدعاء الحكمة من النصوص القديمة. حاول مرة أخرى.',
            timestamp: Date.now(),
            isError: true,
          },
        ]);
      }
    },
    [sessionId, selectedMonument, languageMode, responseMode, sendAncientMessage, fetchTTS, playResponseAudio],
  );

  // ══════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════

  // Cross-fade inline styles
  const crossfadeStyles = `
    .map-crossfade-out {
      animation: mapFadeOut ${CROSSFADE_MS}ms ease-in-out forwards;
    }
    .map-crossfade-in {
      animation: mapFadeIn ${CROSSFADE_MS}ms ease-in-out forwards;
    }
    @keyframes mapFadeOut {
      0%   { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(1.08); }
    }
    @keyframes mapFadeIn {
      0%   { opacity: 0; transform: scale(0.96); }
      100% { opacity: 1; transform: scale(1); }
    }
  `;

  // ── Stage 1: Map view (or transitioning out of it) ──────────────
  if (!selectedGovernorate) {
    return (
      <PageShell className="bg-espresso/5">
        <style>{crossfadeStyles}</style>
        <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row relative">
          {/* Map — with cross-fade-out when transitioning */}
          <div className={`w-full h-full p-3 sm:p-4 ${fadePhase === 'out' ? 'map-crossfade-out' : 'animate-fade-in'}`}>
            <DialectMap
              regions={governorates || []}
              onSelectRegion={handleSelectGovernorate}
            />
          </div>

          {/* Loading overlay */}
          {!governorates && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0b0a08]/60 backdrop-blur-sm z-10">
              <div className="text-center">
                <div className="w-10 h-10 border-[3px] border-[#c4a06a]/20 border-t-[#c4a06a] rounded-full animate-spin mx-auto mb-3" />
                <p className="text-[#c4a06a]/60 text-sm">جاري تحميل المعالم...</p>
              </div>
            </div>
          )}
        </div>
      </PageShell>
    );
  }

  // ── Stage 2: Monument selector (with cross-fade-in) ─────────────
  if (!selectedMonument) {
    return (
      <PageShell className="bg-espresso/5">
        <style>{crossfadeStyles}</style>
        <div className={`h-[calc(100vh-4rem)] ${fadePhase === 'in' ? 'map-crossfade-in' : 'animate-fade-in'}`}>
          <MonumentSelector
            governorate={selectedGovernorate}
            monuments={selectedGovernorate.monuments}
            onSelectMonument={handleSelectMonument}
            onBack={handleBackToMap}
          />
        </div>
      </PageShell>
    );
  }

  // ── Stage 3: Character + Chat (RAG-backed) ─────────────────────
  const monument = selectedMonument;

  return (
    <PageShell className="bg-espresso/5">
      <div
        className="h-[calc(100vh-4rem)] grid lg:grid-cols-[1.15fr_0.85fr] animate-slide-in-end overflow-hidden"
        style={{ background: 'radial-gradient(circle at center, #111010 0%, #0b0a08 100%)' }}
      >
        {/* Character Portal & Bio Side (Right Column in RTL) */}
        <div className="flex flex-col border-b lg:border-b-0 lg:border-l border-[#c4a06a]/20 overflow-y-auto custom-scrollbar">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-sand/8 flex-shrink-0 bg-espresso/50">
            <div className="flex items-center gap-3">
              <AIBadge />
              <span className="text-sand/50 text-xs font-medium hidden sm:inline">
                {monument.display_name}
              </span>
            </div>
            <button
              onClick={handleBackToMonuments}
              className="text-sand/30 hover:text-sand transition-colors p-1.5 rounded-lg hover:bg-sand/8"
              aria-label="إغلاق المحادثة"
              id="close-panel-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Video Container OR Living Wall */}
          <div className="w-full relative min-h-[300px] sm:min-h-[400px]">
            {showWall ? (
              <div className="absolute inset-0 z-20 flex flex-col bg-[#111010] animate-fade-in bg-cover bg-center" style={{ backgroundImage: "url('/new photos/wall.png')" }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#c4a06a]/30 bg-[#111010]/80 backdrop-blur-md absolute top-0 w-full z-30">
                  <h3 className="text-[#c4a06a] font-bold text-lg">منقوشاتنا</h3>
                  <button
                    onClick={() => setShowWall(false)}
                    className="text-sand/50 hover:text-[#c4a06a] transition-colors px-3 py-1.5 rounded-lg bg-[#c4a06a]/10 hover:bg-[#c4a06a]/20"
                  >
                    عودة
                  </button>
                </div>

                <div className="relative w-full h-full overflow-hidden mt-12">
                  {WALL_SYMBOLS.map((symbol) => (
                    <button
                      key={symbol.id}
                      onClick={() => {
                        handleSendText(`حدثني عن ${symbol.name}`);
                        setSelectedSymbol(symbol);
                        setShowWall(false);
                      }}
                      className="absolute group hover:scale-110 transition-transform duration-300"
                      style={{ top: symbol.top, left: symbol.left }}
                    >
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-[#c4a06a]/40 group-hover:border-[#c4a06a] shadow-[0_0_15px_rgba(196,160,106,0.2)] group-hover:shadow-[0_0_20px_rgba(196,160,106,0.6)]">
                        <img src={symbol.img} alt={symbol.name} className="w-full h-full object-cover mix-blend-screen opacity-80 group-hover:opacity-100" />
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-[#111010]/90 px-2 py-1 rounded text-[#c4a06a] text-[10px] md:text-xs font-bold opacity-0 group-hover:opacity-100 whitespace-nowrap border border-[#c4a06a]/30">
                        {symbol.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <CharacterStage
                isSpeaking={isSpeaking}
                idleSrc={monument.idle_video_url}
                talkingSrc={monument.talking_video_url}
              />
            )}
          </div>

          {/* Bio Card with monument-specific chips */}
          <CharacterCard
            name={monument.builder}
            location={monument.display_name}
            title={monument.title}
            bio={monument.bio}
            chips={monument.chips || []}
            onChipClick={(question) => handleSendText(question)}
          />
        </div>

        {/* Chat Side (Left Column in RTL) */}
        <div className="relative flex flex-col min-h-0 bg-[#111010]">

          {/* Chat Side Header — Language Toggle (Aswan monuments) + منقوشاتنا */}
          {selectedGovernorate?.key === 'aswan' && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#c4a06a]/10 bg-[#1a1815]">
              {/* Language Mode Toggle - Only show for ancient monuments (not am-othman/aswan-general) */}
              {monument.key !== 'aswan-general' ? (
                <div className="flex items-center gap-3">
                  <Languages className="w-4 h-4 text-[#c4a06a]/60" />
                  <span className={`text-xs font-bold transition-colors cursor-pointer ${languageMode === 'modern' ? 'text-[#c4a06a]' : 'text-sand/40'}`}
                    onClick={() => setLanguageMode('modern')}
                  >
                    المصرية الحديثة
                  </span>

                  <button
                    onClick={() => setLanguageMode(languageMode === 'modern' ? 'ancient' : 'modern')}
                    className="relative w-12 h-6 rounded-full bg-espresso border border-[#c4a06a]/30 transition-colors flex-shrink-0"
                    aria-label="تبديل اللغة"
                  >
                    <div className={`absolute top-0.5 bottom-0.5 w-5 bg-[#c4a06a] rounded-full transition-all duration-300 ${languageMode === 'ancient' ? 'left-0.5' : 'left-[1.375rem]'}`} />
                  </button>

                  <span className={`text-xs font-bold transition-colors cursor-pointer ${languageMode === 'ancient' ? 'text-[#c4a06a]' : 'text-sand/40'}`}
                    onClick={() => setLanguageMode('ancient')}
                  >
                    المصرية القديمة
                  </span>
                </div>
              ) : (
                <div /> /* Empty div to maintain flex spacing if needed */
              )}

              {/* منقوشاتنا button (only for aswan-general) */}
              {monument.key === 'aswan-general' && (
                <button
                  onClick={() => setShowWall((prev) => !prev)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border transition-all duration-300 text-sm font-medium ${showWall ? 'bg-[#c4a06a]/20 border-[#c4a06a]/50 text-[#c4a06a]' : 'bg-transparent border-[#c4a06a]/20 text-[#c4a06a]/70 hover:bg-[#c4a06a]/10 hover:text-[#c4a06a]'}`}
                >
                  🏛️ منقوشاتنا
                </button>
              )}
            </div>
          )}

          {/* Floating Symbol Panel */}
          {selectedSymbol && (
            <div className="absolute top-4 left-4 right-4 z-30 animate-slide-in-end">
              <div className="bg-[#1a1815]/95 backdrop-blur-xl border border-[#c4a06a]/40 rounded-2xl shadow-2xl p-4 flex gap-4 items-start">
                <button
                  onClick={() => setSelectedSymbol(null)}
                  className="absolute top-3 left-3 text-sand/40 hover:text-red-400 transition-colors bg-black/20 p-1.5 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-[#c4a06a]/20">
                  <img src={selectedSymbol.img} alt={selectedSymbol.name} className="w-full h-full object-cover opacity-90 mix-blend-screen" />
                </div>
                <div className="flex-1 mt-1">
                  <h4 className="text-[#c4a06a] font-bold text-lg mb-1">{selectedSymbol.name}</h4>
                  <p className="text-sand/70 text-sm leading-relaxed">{selectedSymbol.desc}</p>
                </div>
              </div>
            </div>
          )}

          <ChatPanel
            chatHistory={chatHistory}
            onSendText={handleSendText}
            onTranscribeAudio={transcribeAudio}
            isLoading={isLoading}
            elderName={monument.builder}
            languageMode={languageMode}
            responseMode={responseMode}
            onResponseModeChange={setResponseMode}
          />
        </div>
      </div>
    </PageShell>
  );
}
