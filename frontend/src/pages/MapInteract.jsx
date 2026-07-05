import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { X } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import DialectMap from '../components/map/DialectMap';
import CharacterStage from '../components/character/CharacterStage';
import CharacterCard from '../components/character/CharacterCard';
import ChatPanel from '../components/chat/ChatPanel';
import AIBadge from '../components/consent/AIBadge';
import { useCharacterState } from '../hooks/useCharacterState';
import { useChatApi } from '../hooks/useChatApi';

const REGIONS = [
  {
    key: 'aswan',
    name: 'أسوان والنوبة',
    nameEn: 'Aswan & Nubia',
    lat: 24.0889,
    lng: 32.8998,
    elder: 'عم عثمان',
    elderEn: 'Am Othman',
    characterName: 'am-othman',
  },
  {
    key: 'luxor',
    name: 'الأقصر وصعيد مصر',
    nameEn: 'Luxor & Upper Egypt',
    lat: 25.6872,
    lng: 32.6396,
    elder: null,
    characterName: 'am-othman', // falls back to Aswan until backend adds persona
  },
  {
    key: 'cairo',
    name: 'القاهرة والجيزة',
    nameEn: 'Cairo & Giza',
    lat: 30.0444,
    lng: 31.2357,
    elder: null,
    characterName: 'am-othman',
  },
  {
    key: 'alexandria',
    name: 'الإسكندرية والدلتا',
    nameEn: 'Alexandria & Delta',
    lat: 31.2001,
    lng: 29.9187,
    elder: null,
    characterName: 'am-othman',
  },
];

export default function MapInteract() {
  const navigate = useNavigate();
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isAncientMode, setIsAncientMode] = useState(false);
  const { isSpeaking, playResponseAudio, stopAudio } = useCharacterState();
  const { sendTextMessage, sendAudioMessage, fetchTTS, isLoading } = useChatApi();

  // ── Region Selection ─────────────────────────────────────────────
  const handleSelectRegion = useCallback(
    (regionKey) => {
      stopAudio();
      if (isAncientMode) {
        navigate(`/ancient/${regionKey}`);
        return;
      }
      const region = REGIONS.find((r) => r.key === regionKey);
      setSelectedRegion(region);
      setSessionId(uuidv4());
      setChatHistory([]);
    },
    [stopAudio, isAncientMode, navigate],
  );

  const handleClosePanel = useCallback(() => {
    stopAudio();
    setSelectedRegion(null);
    setSessionId(null);
    setChatHistory([]);
  }, [stopAudio]);

  // ── Text Chat ────────────────────────────────────────────────────
  const handleSendText = useCallback(
    async (text, isHardcoded = false) => {
      setChatHistory((prev) => [
        ...prev,
        { sender: 'user', text, timestamp: Date.now() },
      ]);

      try {
        let aiResponseText = '';

        if (isHardcoded) {
          // Hardcoded responses bypass Gemini
          switch (text) {
            case 'حكايات الصحراء':
              aiResponseText = 'الصحراء يا ولدي كتاب مفتوح للي يعرف يقرأ رمالها. كل كُثبان رملية ليها قصة، والرياح بتحمل أصوات اللي مروا من هنا قبلينا. زمان، كانت القوافل تمشي أسابيع مفيش دليل ليها غير النجوم والخبرة.';
              break;
            case 'النجوم والملاحة':
              aiResponseText = 'النجوم دي بوصلة البدوي. نجم القطب الشمالي ثابت ميتغيرش، ومنه نعرف طريقنا في ليل الصحرا العتمة. كل نجم ليه اسم وحكاية، وهم رفقائنا في السفر الطويل.';
              break;
            case 'رموز الكليم':
              aiResponseText = 'الكليم مش بس نسيج، ده لغة. كل رمز فيه بيحكي حاجة: المثلثات للحماية من الحسد، والخطوط المتعرجة بتمثل الميه، والشجر بيمثل الحياة والخصوبة. دي رسايل من جداتنا.';
              break;
            default:
              aiResponseText = 'أهلاً بك يا ولدي. اسألني عما شئت من تراثنا.';
          }
        } else {
          // Regular flow: Send to Gemini
          const data = await sendTextMessage(text, sessionId);
          setSessionId(data.session_id);
          aiResponseText = data.response;
        }

        // Add message without audio first (so it appears immediately)
        const msgId = Date.now();
        setChatHistory((prev) => [
          ...prev,
          { id: msgId, sender: 'ai', text: aiResponseText, timestamp: msgId },
        ]);

        // TTS — separate second call
        const characterName = selectedRegion?.characterName || 'am-othman';
        const audioBlob = await fetchTTS(aiResponseText, characterName);
        
        if (audioBlob) {
          // Update the message with the audio blob for later replay
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
            text: 'عذرًا، حدث خطأ. يرجى المحاولة مرة أخرى.',
            timestamp: Date.now(),
            isError: true,
          },
        ]);
      }
    },
    [sessionId, selectedRegion, sendTextMessage, fetchTTS, playResponseAudio],
  );

  // ── Audio Chat ───────────────────────────────────────────────────
  const handleSendAudio = useCallback(
    async (blob) => {
      try {
        const data = await sendAudioMessage(blob, sessionId);
        setSessionId(data.session_id);

        const msgId = Date.now();
        setChatHistory((prev) => [
          ...prev,
          { sender: 'user', text: data.transcribed_text, timestamp: msgId - 1 },
          { id: msgId, sender: 'ai', text: data.response, timestamp: msgId },
        ]);

        const characterName = selectedRegion?.characterName || 'am-othman';
        const audioBlob = await fetchTTS(data.response, characterName);
        if (audioBlob) {
          // Store the blob for replay
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
            text: 'عذرًا، لم نتمكن من فهم التسجيل. حاول مرة أخرى.',
            timestamp: Date.now(),
            isError: true,
          },
        ]);
      }
    },
    [sessionId, selectedRegion, sendAudioMessage, fetchTTS, playResponseAudio],
  );

  // ── Render ───────────────────────────────────────────────────────
  return (
    <PageShell className="bg-espresso/5">
      <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row relative">
        {/* Ancient Mode Toggle */}
        {!selectedRegion && (
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
        )}

        {/* Map Panel */}
        {!selectedRegion && (
          <div className="w-full h-full p-3 sm:p-4 animate-fade-in">
            <DialectMap
              regions={REGIONS}
              selectedRegion={selectedRegion}
              onSelectRegion={handleSelectRegion}
            />
          </div>
        )}

        {/* Character Panel — appears on region selection */}
        {selectedRegion && (
          <div 
            className="w-full h-full grid lg:grid-cols-[1.15fr_0.85fr] animate-slide-in-end overflow-hidden"
            style={{ background: 'radial-gradient(circle at center, #111010 0%, #0b0a08 100%)' }}
          >
            {/* Character Portal & Bio Side (Right Column in RTL) */}
            <div className="flex flex-col border-b lg:border-b-0 lg:border-l border-[#c4a06a]/20 overflow-y-auto custom-scrollbar">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-sand/8 flex-shrink-0 bg-espresso/50">
                <div className="flex items-center gap-3">
                  <AIBadge />
                  <span className="text-sand/50 text-xs font-medium hidden sm:inline">
                    {selectedRegion.name}
                  </span>
                </div>
                <button
                  onClick={handleClosePanel}
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
                  idleSrc={`/character/${selectedRegion.characterName || 'am-othman'}-idle.mp4`}
                  talkingSrc={`/character/${selectedRegion.characterName || 'am-othman'}-talking.mp4`}
                />
              </div>

              {/* Bio Card */}
              <CharacterCard
                name={selectedRegion.elder || selectedRegion.name}
                location={selectedRegion.name}
                title="حارس تراث وحكيم"
                bio="يحفظ تاريخ المنطقة ويفك رموز الحكايات القديمة المنسوجة عبر الأجيال."
                onChipClick={(topic) => handleSendText(topic, true)}
              />
            </div>

            {/* Chat Side (Left Column in RTL) */}
            <div className="flex flex-col min-h-0 bg-[#111010]">
              <ChatPanel
                chatHistory={chatHistory}
                onSendText={handleSendText}
                onSendAudio={handleSendAudio}
                isLoading={isLoading}
                elderName={selectedRegion.elder || selectedRegion.name}
              />
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
