import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { X } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import DialectMap from '../components/map/DialectMap';
import MonumentSelector from '../components/map/MonumentSelector';
import CharacterStage from '../components/character/CharacterStage';
import CharacterCard from '../components/character/CharacterCard';
import ChatPanel from '../components/chat/ChatPanel';
import AIBadge from '../components/consent/AIBadge';
import { useCharacterState } from '../hooks/useCharacterState';
import { useChatApi } from '../hooks/useChatApi';

export default function MapInteract() {
  const navigate = useNavigate();

  // 3-stage state: null → governorate → monument
  const [governorates, setGovernorates] = useState(null);
  const [selectedGovernorate, setSelectedGovernorate] = useState(null);
  const [selectedMonument, setSelectedMonument] = useState(null);

  const [sessionId, setSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isAncientMode, setIsAncientMode] = useState(false);

  const { isSpeaking, playResponseAudio, stopAudio } = useCharacterState();
  const { sendTextMessage, sendAncientMessage, fetchTTS, fetchGovernorates, isLoading } = useChatApi();

  // ── Fetch governorates on mount ─────────────────────────────────
  useEffect(() => {
    fetchGovernorates().then((data) => {
      if (data) setGovernorates(data.governorates || data);
    });
  }, [fetchGovernorates]);

  // ── Stage 1 → Stage 2: pick a governorate ──────────────────────
  const handleSelectGovernorate = useCallback(
    (govKey) => {
      stopAudio();
      if (isAncientMode) {
        navigate(`/ancient/${govKey}`);
        return;
      }
      const gov = governorates?.find((g) => g.key === govKey);
      if (gov) {
        setSelectedGovernorate(gov);
      }
    },
    [stopAudio, isAncientMode, navigate, governorates],
  );

  // ── Stage 2 → Stage 3: pick a monument ─────────────────────────
  const handleSelectMonument = useCallback((monument) => {
    setSelectedMonument(monument);
    setSessionId(uuidv4());
    setChatHistory([]);
  }, []);

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
        const data = await sendAncientMessage(text, sessionId, selectedMonument?.key);
        setSessionId(data.session_id);
        const aiResponseText = data.response;

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

        // TTS
        const characterName = selectedMonument?.character_name || 'am-othman';
        const audioBlob = await fetchTTS(aiResponseText, characterName);

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
    [sessionId, selectedMonument, sendAncientMessage, fetchTTS, playResponseAudio],
  );

  // ══════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════

  // ── Stage 1: Map view ───────────────────────────────────────────
  if (!selectedGovernorate) {
    return (
      <PageShell className="bg-espresso/5">
        <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row relative">
          {/* Ancient Mode Toggle */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-[#111010]/80 backdrop-blur-md px-6 py-3 rounded-full border border-[#c4a06a]/20 shadow-lg">
            <span className={`text-sm font-bold transition-colors ${!isAncientMode ? 'text-[#c4a06a]' : 'text-sand/40'}`}>اللهجة الحديثة</span>

            <button
              onClick={() => setIsAncientMode(!isAncientMode)}
              className="relative w-14 h-7 rounded-full bg-espresso border border-[#c4a06a]/30 transition-colors"
            >
              <div className={`absolute top-1 bottom-1 w-5 bg-[#c4a06a] rounded-full transition-all duration-300 ${isAncientMode ? 'left-1' : 'left-8'}`} />
            </button>

            <span className={`text-sm font-bold transition-colors ${isAncientMode ? 'text-[#c4a06a]' : 'text-sand/40'}`}>وضع الفراعنة</span>
          </div>

          {/* Map */}
          <div className="w-full h-full p-3 sm:p-4 animate-fade-in">
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

  // ── Stage 2: Monument selector ──────────────────────────────────
  if (!selectedMonument) {
    return (
      <PageShell className="bg-espresso/5">
        <div className="h-[calc(100vh-4rem)] animate-fade-in">
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

          {/* Video Container */}
          <div className="w-full">
            <CharacterStage
              isSpeaking={isSpeaking}
              idleSrc={`/character/${monument.character_name || 'am-othman'}-idle.mp4`}
              talkingSrc={`/character/${monument.character_name || 'am-othman'}-talking.mp4`}
            />
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
        <div className="flex flex-col min-h-0 bg-[#111010]">
          <ChatPanel
            chatHistory={chatHistory}
            onSendText={handleSendText}
            isLoading={isLoading}
            elderName={monument.builder}
          />
        </div>
      </div>
    </PageShell>
  );
}
