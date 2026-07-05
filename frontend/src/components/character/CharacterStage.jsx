import { useState, useRef } from 'react';

export default function CharacterStage({ isSpeaking, idleSrc, talkingSrc }) {
  const [videosReady, setVideosReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const readyCount = useRef(0);

  const handleVideoReady = () => {
    readyCount.current += 1;
    if (readyCount.current >= 2) {
      setVideosReady(true);
    }
  };

  const handleVideoError = () => {
    setVideoError(true);
  };

  // Fallback animated avatar when videos aren't available
  if (videoError) {
    return (
      <div className="relative w-full aspect-video bg-gradient-to-b from-espresso to-espresso/95 rounded-2xl overflow-hidden flex items-center justify-center">
        <div className={`relative transition-all duration-700 ${isSpeaking ? 'scale-105' : 'animate-breathe'}`}>
          {/* Stylized avatar */}
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-brown/80 to-wine/60 flex items-center justify-center shadow-2xl ring-4 ring-sand/10">
            <span className="text-5xl sm:text-6xl select-none">👳</span>
          </div>

          {/* Speaking indicator waves */}
          {isSpeaking && (
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-[3px]">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-[3px] bg-wine rounded-full"
                  style={{
                    animation: `dots 0.6s ease-in-out ${i * 0.08}s infinite alternate`,
                    height: `${8 + Math.sin(i * 0.9) * 12}px`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Name tag */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <span className="text-sand/30 text-xs font-medium">الفيديو غير متوفر — يعمل بالوضع البديل</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto flex items-center justify-center p-6" id="character-stage">
      {/* Campfire Glow Behind Video */}
      <div 
        className="absolute inset-0 bg-[#c4a06a] rounded-[40px] blur-[60px] opacity-20 pointer-events-none"
        style={{ animation: 'campfire-flicker 4s infinite' }}
      />
      {isSpeaking && (
        <div 
          className="absolute inset-0 bg-[#c4a06a] rounded-[40px] blur-[80px] opacity-40 pointer-events-none transition-opacity duration-500"
          style={{ animation: 'campfire-flicker 2s infinite' }}
        />
      )}

      {/* Floating Embers */}
      <div className="absolute inset-0 overflow-hidden rounded-[40px] pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={`ember-${i}`}
            className="absolute w-1.5 h-1.5 bg-[#c4a06a] rounded-full blur-[1px]"
            style={{
              left: `${15 + Math.random() * 70}%`,
              bottom: '10%',
              animation: `ember-float ${3 + Math.random() * 4}s infinite ${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Video Container (Rectangular with rounded corners) */}
      <div className="relative w-full aspect-video overflow-hidden rounded-2xl bg-[#111010] shadow-[0_0_40px_rgba(196,160,106,0.15)] ring-1 ring-[#c4a06a]/30 z-10">
        
        {/* Loading state */}
        {!videosReady && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#111010] z-20">
            <div className="text-center">
              <div className="w-10 h-10 border-[3px] border-[#c4a06a]/20 border-t-[#c4a06a] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-[#c4a06a]/50 text-sm">جاري التحضير...</p>
            </div>
          </div>
        )}

        {/* Idle video */}
        <video
          src={idleSrc}
          autoPlay
          muted
          loop
          playsInline
          onCanPlayThrough={handleVideoReady}
          onError={handleVideoError}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isSpeaking ? 'opacity-0' : 'opacity-100'
          }`}
        />

        {/* Talking video */}
        <video
          src={talkingSrc}
          autoPlay
          muted
          loop
          playsInline
          onCanPlayThrough={handleVideoReady}
          onError={handleVideoError}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isSpeaking ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Soundwave Overlay (Only when speaking) */}
        <div className={`absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0b0a08]/90 to-transparent flex items-end justify-center pb-3 gap-1 transition-opacity duration-300 ${isSpeaking ? 'opacity-100' : 'opacity-0'}`}>
          {[...Array(12)].map((_, i) => (
            <div
              key={`wave-${i}`}
              className="w-1 bg-[#c4a06a] rounded-t-sm opacity-80"
              style={{
                height: '4px',
                animation: isSpeaking ? `soundwave-bounce 0.8s infinite ${i * 0.1}s alternate ease-in-out` : 'none'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
