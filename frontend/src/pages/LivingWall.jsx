import React, { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import CharacterStage from '../components/character/CharacterStage';
import ChatPanel from '../components/chat/ChatPanel';
import { useCharacterState } from '../hooks/useCharacterState';
import { useChatApi } from '../hooks/useChatApi';
import PageShell from '../components/layout/PageShell';

export default function LivingWall() {
  const [isCracked, setIsCracked] = useState(false);
  const [showCharacter, setShowCharacter] = useState(false);

  // Chat State
  const [sessionId, setSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);

  const { isSpeaking, playResponseAudio, stopAudio } = useCharacterState();
  const { sendTextMessage, sendAudioMessage, fetchTTS, createSession, isLoading } = useChatApi();

  // Handle clicking a hotspot on the wall
  const handleHotspotClick = useCallback(async (symbolId, storyText) => {
    setIsCracked(true);

    // Set up new session
    let newSessionId = uuidv4();
    try {
      const created = await createSession({
        chat_mode: 'regional',
        title: 'الجدار الحي',
      });
      if (created?.session_id) newSessionId = created.session_id;
    } catch {
      // fallback to uuidv4()
    }
    setSessionId(newSessionId);

    // Add the initial story as AI message
    const msgId = Date.now();
    setChatHistory([
      { id: msgId, sender: 'ai', text: storyText, timestamp: msgId }
    ]);

    // Sequence the animation reveal
    setTimeout(async () => {
      setShowCharacter(true);
      // Fetch and play TTS for the story
      const audioBlob = await fetchTTS(storyText, 'am-othman');
      if (audioBlob) {
        setChatHistory((prev) =>
          prev.map((msg) => (msg.id === msgId ? { ...msg, audioBlob } : msg))
        );
        await playResponseAudio(audioBlob);
      }
    }, 1500);
  }, [fetchTTS, playResponseAudio, createSession]);

  const handleBackToWall = useCallback(() => {
    stopAudio();
    setShowCharacter(false);
    setChatHistory([]);
    setSessionId(null);
    setTimeout(() => setIsCracked(false), 1000);
  }, [stopAudio]);

  // ── Text Chat ────────────────────────────────────────────────────
  const handleSendText = useCallback(
    async (text) => {
      setChatHistory((prev) => [...prev, { sender: 'user', text, timestamp: Date.now() }]);
      try {
        const data = await sendTextMessage(text, sessionId);
        setSessionId(data.session_id);

        const msgId = Date.now();
        setChatHistory((prev) => [...prev, { id: msgId, sender: 'ai', text: data.response, timestamp: msgId }]);

        const audioBlob = await fetchTTS(data.response, 'am-othman');
        if (audioBlob) {
          setChatHistory((prev) => prev.map((msg) => msg.id === msgId ? { ...msg, audioBlob } : msg));
          await playResponseAudio(audioBlob);
        }
      } catch {
        setChatHistory((prev) => [...prev, { sender: 'ai', text: 'عذرًا، حدث خطأ.', timestamp: Date.now(), isError: true }]);
      }
    },
    [sessionId, sendTextMessage, fetchTTS, playResponseAudio],
  );



  const hotspots = [
    {
      id: 'triangle',
      top: '40%',
      left: '35%',
      label: 'رمز الحماية',
      story: 'أهلاً يا ولدي! المثلث اللي ضغطت عليه ده مش مجرد شكل.. أجدادنا النوبيين كانوا بينسجوه في الكليم عشان يعكس العين ويحمي البيت من الحسد.'
    },
    {
      id: 'wave',
      top: '60%',
      left: '70%',
      label: 'نهر النيل',
      story: 'الخط المتعرج ده هو شريان الحياة.. نهر النيل. النوبة كلها اتربت على ضفافه، وكل كليم لازم يكون فيه ذكر للنيل اللي سقانا.'
    }
  ];

  return (
    <PageShell className="bg-espresso/5">
      <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-sand-900">
        {/* 1. The Living Wall (Carpet Background) */}
        <div
          className={`absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-[2000ms] ease-in-out ${isCracked ? 'scale-110 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
          style={{ backgroundImage: 'url(/assets/nubian-carpet-bg.png)' }}
        >
          <div className="absolute inset-0 bg-black/40 mix-blend-overlay"></div>

          <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center text-white/90 drop-shadow-lg pointer-events-none">
            <h1 className="text-5xl font-bold font-cairo mb-3 tracking-wide text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">الجدار الحي</h1>
            <p className="text-xl opacity-90 font-medium">اضغط على أي رمز لتكتشف حكايته</p>
          </div>

          {/* Glowing Hotspots */}
          {hotspots.map((spot) => (
            <button
              key={spot.id}
              onClick={() => handleHotspotClick(spot.id, spot.story)}
              className="absolute z-10 w-20 h-20 -translate-x-1/2 -translate-y-1/2 group outline-none cursor-pointer"
              style={{ top: spot.top, left: spot.left }}
            >
              <div className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-75"></div>
              <div className="relative w-full h-full bg-amber-500/60 rounded-full border-2 border-amber-200/80 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.6)] transition-transform duration-300 group-hover:scale-110">
                <span className="text-white text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap absolute -top-10 bg-black/80 px-3 py-1.5 rounded-lg border border-amber-500/30">
                  {spot.label}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* 2. Crack / Light Overlay Effect */}
        <div className={`absolute inset-0 pointer-events-none flex items-center justify-center transition-opacity duration-1000 ${isCracked && !showCharacter ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-[150vw] h-[150vh] bg-amber-200 animate-pulse mix-blend-screen blur-[100px] rounded-full scale-0 animate-[grow_1.5s_ease-out_forwards]"></div>
        </div>

        {/* 3. The Revealed Character Stage & Chat */}
        <div className={`absolute inset-0 transition-opacity duration-1000 delay-500 flex ${showCharacter ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="w-full h-full grid lg:grid-cols-[1.15fr_0.85fr]" style={{ background: 'radial-gradient(circle at center, #111010 0%, #0b0a08 100%)' }}>

            {/* Left Side (Character) */}
            <div className="flex flex-col relative border-l border-[#c4a06a]/20">
              <CharacterStage
                isSpeaking={isSpeaking}
                idleSrc="https://hueymfgudrgdlmyaxeoi.supabase.co/storage/v1/object/public/characters/videos/am-othman-idle.mp4"
                talkingSrc="https://hueymfgudrgdlmyaxeoi.supabase.co/storage/v1/object/public/characters/videos/am-othman-talking.mp4"
              />
              <button
                onClick={handleBackToWall}
                className="absolute top-6 left-6 z-50 bg-black/50 hover:bg-black/80 text-sand px-5 py-2.5 rounded-full border border-sand/20 backdrop-blur-md transition-all hover:scale-105 hover:border-sand/40 font-medium flex items-center gap-2"
              >
                <span>العودة للجدار</span>
                <span className="text-lg">↩</span>
              </button>
            </div>

            {/* Right Side (Chat) */}
            <div className="flex flex-col min-h-0 bg-[#111010]">
              <ChatPanel
                chatHistory={chatHistory}
                onSendText={handleSendText}
                isLoading={isLoading}
                elderName="عم عثمان"
              />
            </div>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes grow {
            0% { transform: scale(0); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: scale(1); opacity: 0; }
          }
        `}} />
      </div>
    </PageShell>
  );
}
