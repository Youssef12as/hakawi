/**
 * MonumentChat — /map/:govKey/:monumentSlug
 *
 * Full-screen character chat for a single monument.
 * Resolves the monument from URL params via MapContext + slugToKey(),
 * creates a fresh chat session on mount, and provides TTS, language
 * toggle (modern/ancient Egyptian for Aswan), chat history drawer,
 * and the "منقوشاتنا" living-wall feature for *-general monuments.
 */
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Languages, History } from 'lucide-react';
import PageShell from '../../components/layout/PageShell';
import CharacterStage from '../../components/character/CharacterStage';
import CharacterCard from '../../components/character/CharacterCard';
import RamsisLegacyStage from '../../components/character/RamsisLegacyStage';
import ChatPanel from '../../components/chat/ChatPanel';
import ChatHistoryDrawer from '../../components/chat/ChatHistoryDrawer';
import AIBadge from '../../components/consent/AIBadge';
import { useCharacterState } from '../../hooks/useCharacterState';
import { useChatApi } from '../../hooks/useChatApi';
import { useMapContext } from '../../context/MapContext';
import { slugToKey } from '../../utils/monumentSlugs';

/* ── Wall Symbols (from Landing Page) ── */
const WALL_SYMBOLS = [
  { id: 'nubian-baskets', name: 'السلال النوبية', desc: 'كانت هذه السلال تُنسج يدويًا من سعف النخيل، وتُستخدم لحفظ الخبز والتمر والمحاصيل.', img: '/image/ramz.png', top: '66%', left: '12%' },
  { id: 'nubian-tray', name: 'الطبق النوبي', desc: 'يحمل كل طبق زخارف هندسية مستوحاة من النيل والبيئة المحيطة.', img: '/image/noqush.png', top: '61%', left: '32%' },
  { id: 'clay-jar', name: 'الجرة الفخارية', desc: 'كانت الجرار تحفظ الماء باردًا حتى في أشد أيام الصيف حرارة.', img: '/image/ramz.png', top: '54%', left: '43%' },
  { id: 'hand-loom', name: 'النول اليدوي', desc: 'على هذا النول كانت تُنسج المفروشات والسجاد خيطًا بعد خيط.', img: '/image/noqush.png', top: '56%', left: '51%' },
  { id: 'woven-textile', name: 'قطعة نسيج يدوية', desc: 'كل لون ونقشة يحملان دلالة خاصة ترتبط بالمكان والمناسبة.', img: '/image/ramz.png', top: '81%', left: '74%' },
  { id: 'luxor-carpet', name: 'سجادة الأقصر', desc: 'استُلهمت زخارفها من المعابد وأعمدة الكرنك والطبيعة المحيطة بالنيل.', img: '/image/noqush.png', top: '42%', left: '90%' },
];

const DEFAULT_MOBILE_HERO_SIZE = 52;
const MIN_MOBILE_HERO_SIZE = 30;
const MAX_MOBILE_HERO_SIZE = 68;

export default function MonumentChat({ overrideSlug, initialContext, isOverlay }) {
  const { govKey, monumentSlug: urlSlug } = useParams();
  const monumentSlug = overrideSlug || urlSlug;
  const navigate = useNavigate();
  const { governorates } = useMapContext();

  const governorate = useMemo(
    () => governorates?.find((g) => g.key === govKey),
    [governorates, govKey]
  );
  
  const monumentKey = useMemo(
    () => slugToKey(govKey, monumentSlug),
    [govKey, monumentSlug]
  );
  
  const monument = useMemo(
    () => governorate?.monuments?.find((m) => m.key === monumentKey),
    [governorate, monumentKey]
  );

  const [sessionId, setSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [languageMode, setLanguageMode] = useState('modern');
  const [responseMode, setResponseMode] = useState('direct');

  const [showWall, setShowWall] = useState(false);
  const [hasSentInitialContext, setHasSentInitialContext] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [mobileHeroSize, setMobileHeroSize] = useState(DEFAULT_MOBILE_HERO_SIZE);
  const [isResizingMobile, setIsResizingMobile] = useState(false);
  const layoutRef = useRef(null);

  const { isSpeaking, playResponseAudio, stopAudio } = useCharacterState();
  const { sendAncientMessage, fetchTTS, fetchChatHistory, fetchSessionDetail, transcribeAudio, createSession, isLoading } = useChatApi();

  useEffect(() => {
    if (!monument) return;
    setChatHistory([]);
    createSession({
      chat_mode: 'ancient',
      monument_key: monument.key,
      language_mode: 'modern',
      title: monument.builder || monument.display_name,
    }).then((created) => {
      setSessionId(created?.session_id || null);
    }).catch(() => {
      setSessionId(null);
    });
  }, [monument?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectHistorySession = useCallback(async (selectedSid) => {
    try {
      const detail = await fetchSessionDetail(selectedSid);
      if (detail) {
        setSessionId(detail.id);
        if (detail.language_mode) {
          setLanguageMode(detail.language_mode);
        }
        setChatHistory(
          (detail.messages || []).map((m) => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            timestamp: m.timestamp,
            meta: m.metadata || {},
            metadata: m.metadata || {},
          }))
        );
      }
    } catch (e) {
      console.error('Failed to load session history:', e);
    }
  }, [fetchSessionDetail]);

  const handleSendText = useCallback(
    async (text) => {
      setChatHistory((prev) => [
        ...prev,
        { sender: 'user', text, timestamp: Date.now() },
      ]);

      try {
        const data = await sendAncientMessage(text, sessionId, monument?.key, languageMode, responseMode);
        setSessionId(data.session_id);
        const aiResponseText = data.response;
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

        const characterName = data.character_name || monument?.character_name || 'am-othman';
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
    [sessionId, monument, languageMode, responseMode, sendAncientMessage, fetchTTS, playResponseAudio],
  );

  const handleClose = useCallback(() => {
    stopAudio();
    navigate(`/map/${govKey}`);
  }, [stopAudio, navigate, govKey]);

  const updateMobileSplit = useCallback((clientY) => {
    const layout = layoutRef.current;
    if (!layout) return;

    const bounds = layout.getBoundingClientRect();
    const nextSize = ((clientY - bounds.top) / bounds.height) * 100;
    const clampedSize = Math.min(
      MAX_MOBILE_HERO_SIZE,
      Math.max(MIN_MOBILE_HERO_SIZE, nextSize),
    );

    setMobileHeroSize(clampedSize);
  }, []);

  const handleResizePointerDown = useCallback((event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizingMobile(true);
    updateMobileSplit(event.clientY);
  }, [updateMobileSplit]);

  const handleResizePointerMove = useCallback((event) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    updateMobileSplit(event.clientY);
  }, [updateMobileSplit]);

  const handleResizePointerEnd = useCallback((event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsResizingMobile(false);
  }, []);

  const handleResizeKeyDown = useCallback((event) => {
    const keySteps = {
      ArrowUp: -4,
      ArrowDown: 4,
      PageUp: -10,
      PageDown: 10,
    };

    if (event.key === 'Home') {
      event.preventDefault();
      setMobileHeroSize(MIN_MOBILE_HERO_SIZE);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setMobileHeroSize(MAX_MOBILE_HERO_SIZE);
      return;
    }

    const step = keySteps[event.key];
    if (!step) return;

    event.preventDefault();
    setMobileHeroSize((current) => Math.min(
      MAX_MOBILE_HERO_SIZE,
      Math.max(MIN_MOBILE_HERO_SIZE, current + step),
    ));
  }, []);

  useEffect(() => {
    if (governorates && !monument) {
      navigate(`/map/${govKey}`, { replace: true });
    }
  }, [governorates, monument, navigate, govKey]);

  useEffect(() => {
    if (monument && initialContext && sessionId && !hasSentInitialContext) {
      handleSendText(initialContext);
      setHasSentInitialContext(true);
    }
  }, [monument, initialContext, sessionId, hasSentInitialContext, handleSendText]);

  if (!governorates) {return (
      <Wrapper {...wrapperProps}>
          <div className={isOverlay ? "h-full flex items-center justify-center" : "h-[calc(100vh-4rem)] flex items-center justify-center"}>
          <div className="w-10 h-10 border-[3px] border-[#c4a06a]/20 border-t-[#c4a06a] rounded-full animate-spin" />
        </div>
      </Wrapper>
    );
  }

  if (!monument) {
    return null;
  }

  const isRamsis = monument.character_name === 'ramsis' || monument.key === 'abu-simbel';
  const Wrapper = isOverlay ? 'div' : PageShell;
  const wrapperProps = isOverlay
    ? { className: 'h-full w-full bg-[#111010]' }
    : { className: isRamsis ? 'bg-espresso/5 max-lg:!p-0' : 'bg-espresso/5' };
  const innerClass = isOverlay
    ? 'h-full grid lg:grid-cols-[1.15fr_0.85fr] animate-slide-in-end overflow-hidden'
    : 'h-[calc(100vh-4rem)] grid lg:grid-cols-[1.15fr_0.85fr] animate-slide-in-end overflow-hidden';
  const ramsisLayoutClass = isRamsis
    ? isOverlay
      ? 'ramsis-chat-layout relative !h-full !overflow-hidden lg:grid-rows-1'
      : 'ramsis-chat-layout relative !overflow-hidden max-lg:fixed max-lg:inset-0 max-lg:z-[400] max-lg:!h-[100svh] lg:!h-[calc(100vh-4rem)] lg:grid-rows-1'
    : '';

  return (
    <Wrapper {...wrapperProps}>
      <div
        ref={layoutRef}
        className={`${innerClass} ${ramsisLayoutClass}`}
        style={{
          background: 'radial-gradient(circle at center, #111010 0%, #0b0a08 100%)',
          ...(isRamsis ? { '--ramsis-hero-size': `${mobileHeroSize}%` } : {}),
        }}
      >
        {/* Character Portal & Bio Side (Right Column in RTL) */}
        <div className={`flex min-h-0 flex-col border-b border-[#c4a06a]/20 lg:border-b-0 lg:border-l custom-scrollbar ${isRamsis ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {isRamsis ? (
            <RamsisLegacyStage
              isSpeaking={isSpeaking}
              name={monument.builder}
              location={monument.display_name}
              title={monument.title}
              bio={monument.bio}
              chips={monument.chips || []}
              onChipClick={(question) => handleSendText(question)}
              onClose={handleClose}
            />
          ) : (
            <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-sand/8 flex-shrink-0 bg-espresso/50">
            <div className="flex items-center gap-3">
              <AIBadge />
              <span className="text-sand/50 text-xs font-medium hidden sm:inline">
                {monument.display_name}
              </span>
            </div>
            <button
              onClick={handleClose}
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
                idleSrc={governorate?.key === 'giza' ? '/character/khufu_idle.mp4' : monument.idle_video_url}
                talkingSrc={governorate?.key === 'giza' ? '/character/khufu_speaking.mp4' : monument.talking_video_url}
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
            </>
          )}
        </div>

        {/* Chat Side (Left Column in RTL) */}
        <div className={`relative flex min-h-0 flex-col bg-[#111010] ${isRamsis ? 'z-40 h-full overflow-hidden rounded-t-[2.25rem] border-t border-[#c4a06a]/45 shadow-[0_-18px_55px_rgba(0,0,0,0.72)] lg:z-auto lg:h-auto lg:rounded-none lg:border-t-0 lg:shadow-none' : ''}`}>

          {isRamsis && (
            <div className="relative flex h-6 shrink-0 items-center justify-center lg:hidden">
              <div
                role="separator"
                tabIndex={0}
                aria-label="تغيير حجم صورة رمسيس والمحادثة"
                aria-orientation="horizontal"
                aria-valuemin={MIN_MOBILE_HERO_SIZE}
                aria-valuemax={MAX_MOBILE_HERO_SIZE}
                aria-valuenow={Math.round(mobileHeroSize)}
                aria-valuetext={`${Math.round(mobileHeroSize)}٪ للصورة`}
                title="اسحب لتغيير الحجم، واضغط مرتين لإعادة الضبط"
                onPointerDown={handleResizePointerDown}
                onPointerMove={handleResizePointerMove}
                onPointerUp={handleResizePointerEnd}
                onPointerCancel={handleResizePointerEnd}
                onLostPointerCapture={() => setIsResizingMobile(false)}
                onDoubleClick={() => setMobileHeroSize(DEFAULT_MOBILE_HERO_SIZE)}
                onKeyDown={handleResizeKeyDown}
                className="absolute inset-x-0 top-1/2 z-50 flex h-11 -translate-y-1/2 touch-none cursor-row-resize select-none items-center justify-center"
              >
                <span className={`h-1 w-12 rounded-full transition-all ${isResizingMobile ? 'w-16 bg-[#e6b768] shadow-[0_0_12px_rgba(230,183,104,0.55)]' : 'bg-[#c4a06a]/55'}`} />
              </div>
            </div>
          )}

          {/* Chat Side Header — "محادثاتي" icon + Language Toggle */}
          <div className={`items-center justify-between px-4 py-2 border-b border-[#c4a06a]/15 bg-[#14120e]/95 backdrop-blur z-20 ${isRamsis ? 'hidden lg:flex' : 'flex'}`}>
            {/* Right side (RTL start): Chat History Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistoryDrawer(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c4a06a]/15 hover:bg-[#c4a06a]/25 text-[#f0e0c8] border border-[#c4a06a]/30 hover:border-[#c4a06a]/60 text-xs font-bold transition-all shadow-sm"
                title="عرض المحادثات السابقة لهذا المعلم"
              >
                <History className="w-3.5 h-3.5 text-[#c4a06a]" />
                <span>محادثاتي</span>
              </button>
            </div>

            {/* Left side (RTL end): Language Toggle (Aswan monuments) + منقوشاتنا */}
            <div className="flex items-center gap-3">
              {governorate?.key === 'aswan' && monument.key !== 'aswan-general' && (
                <div className="flex items-center gap-2">
                  <Languages className="w-3.5 h-3.5 text-[#c4a06a]/60" />
                  <span
                    className={`text-xs font-bold transition-colors cursor-pointer ${languageMode === 'modern' ? 'text-[#c4a06a]' : 'text-sand/40'}`}
                    onClick={() => setLanguageMode('modern')}
                  >
                    المصرية الحديثة
                  </span>

                  <button
                    onClick={() => setLanguageMode(languageMode === 'modern' ? 'ancient' : 'modern')}
                    className="relative w-10 h-5 rounded-full bg-espresso border border-[#c4a06a]/30 transition-colors flex-shrink-0"
                    aria-label="تبديل اللغة"
                  >
                    <div className={`absolute top-0.5 bottom-0.5 w-4 bg-[#c4a06a] rounded-full transition-all duration-300 ${languageMode === 'ancient' ? 'left-0.5' : 'left-[1.125rem]'}`} />
                  </button>

                  <span
                    className={`text-xs font-bold transition-colors cursor-pointer ${languageMode === 'ancient' ? 'text-[#c4a06a]' : 'text-sand/40'}`}
                    onClick={() => setLanguageMode('ancient')}
                  >
                    المصرية القديمة
                  </span>
                </div>
              )}

              {governorate?.key === 'aswan' && monument.key === 'aswan-general' && (
                <button
                  onClick={() => setShowWall((prev) => !prev)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 text-xs font-medium ${showWall ? 'bg-[#c4a06a]/20 border-[#c4a06a]/50 text-[#c4a06a]' : 'bg-transparent border-[#c4a06a]/20 text-[#c4a06a]/70 hover:bg-[#c4a06a]/10 hover:text-[#c4a06a]'}`}
                >
                  🏛️ منقوشاتنا
                </button>
              )}
            </div>
          </div>

          {/* ChatGPT-style History Drawer */}
          <ChatHistoryDrawer
            isOpen={showHistoryDrawer}
            onClose={() => setShowHistoryDrawer(false)}
            currentMonumentKey={monument.key}
            currentMonumentName={monument.builder || monument.display_name}
            activeSessionId={sessionId}
            onSelectSession={handleSelectHistorySession}
          />

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
            immersiveMobile={isRamsis}
            suggestions={monument.chips || []}
          />
        </div>
      </div>
    </Wrapper>
  );
}
