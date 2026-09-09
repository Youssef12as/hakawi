import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { MapPin, ChevronLeft, Landmark, Sparkles, ZoomIn, ZoomOut, RotateCcw, MessageCircle } from 'lucide-react';

const ASWAN_POSITIONS = {
  'abu-simbel': { left: '23.8%', top: '43.5%' },
  'philae': { left: '23.2%', top: '15.5%' },
  'unfinished-obelisk': { left: '75.6%', top: '45.4%' },
  'aga-khan': { left: '67.3%', top: '73.3%' },
};

/**
 * MonumentSelector — shown after the user picks a governorate.
 * Displays a scrollable grid of monument cards, or a special interactive map for Aswan.
 * Clicking a card/hotspot opens the chat for that monument's historical character.
 */
export default function MonumentSelector({
  governorate,
  monuments,
  onSelectMonument,
  onBack,
}) {
  const isAswan = governorate.key === 'aswan';

  return (
    <div className="h-full flex flex-col bg-[#0b0a08] animate-slide-in-end">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#c4a06a]/20 flex-shrink-0 bg-espresso/50 relative z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sand/60 hover:text-[#c4a06a] transition-colors text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          رجوع للخريطة
        </button>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#c4a06a]" />
          <span className="text-sand/70 text-sm font-bold">{governorate.name}</span>
        </div>
      </div>

      {isAswan && (
        <div className="flex justify-center bg-[#111010]/30 py-4 px-6 border-b border-[#c4a06a]/20 flex-shrink-0">
          <div className="flex bg-[#0b0a08] p-1 rounded-xl border border-[#c4a06a]/30 w-full max-w-[420px] shadow-lg">
            <button
              className="flex-1 text-center py-2.5 rounded-lg text-sm font-extrabold transition-all text-[#0b0a08] bg-[#c4a06a] shadow-md cursor-default"
            >
              خريطة المعالم
            </button>
            <button
              onClick={() => {
                const aswanGeneral = monuments.find((m) => m.key === "aswan-general") || monuments[0];
                if (aswanGeneral) onSelectMonument(aswanGeneral);
              }}
              className="flex-1 text-center py-2.5 rounded-lg text-sm font-bold transition-all text-sand/70 hover:text-[#c4a06a] hover:bg-[#c4a06a]/10"
            >
              حواري أسوان
            </button>
          </div>
        </div>
      )}

      {isAswan ? (
        /* ── Special Aswan Map View ──────────────────────── */
        <div className="flex-1 relative flex flex-col items-center overflow-hidden h-full w-full">
          <style>{`
            @keyframes hotspotPulseAswan {
              0% { box-shadow: 0 0 0 0 rgba(212,133,58,0.7); }
              70% { box-shadow: 0 0 0 15px rgba(212,133,58,0); }
              100% { box-shadow: 0 0 0 0 rgba(212,133,58,0); }
            }
            @keyframes rippleAswan {
              0% { transform: scale(0.8); opacity: 1; }
              100% { transform: scale(2.5); opacity: 0; }
            }
          `}</style>
          
          {/* Main Zoom Container */}
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={4}
            centerOnInit={true}
            wheel={{ step: 0.1 }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* Floating Map Controls */}
                <div className="absolute top-6 left-6 z-30 flex flex-col gap-2">
                  <button onClick={() => zoomIn()} className="w-10 h-10 rounded-xl bg-[#111010]/80 backdrop-blur-sm border border-[#c4a06a]/30 text-[#e8d1a7] flex items-center justify-center hover:bg-[#c4a06a]/20 transition-all shadow-lg active:scale-95">
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  <button onClick={() => zoomOut()} className="w-10 h-10 rounded-xl bg-[#111010]/80 backdrop-blur-sm border border-[#c4a06a]/30 text-[#e8d1a7] flex items-center justify-center hover:bg-[#c4a06a]/20 transition-all shadow-lg active:scale-95">
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <button onClick={() => resetTransform()} className="w-10 h-10 rounded-xl bg-[#111010]/80 backdrop-blur-sm border border-[#c4a06a]/30 text-[#e8d1a7] flex items-center justify-center hover:bg-[#c4a06a]/20 transition-all shadow-lg active:scale-95">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <div className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing p-2">
                   <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <div className="relative w-full max-w-[960px] aspect-[3/2]">
                      <img 
                        src="/map/aswan_map.svg" 
                        alt="خريطة أسوان" 
                        className="w-full h-full object-cover drop-shadow-2xl"
                      />
                       {/* Monument Hotspots */}
                      {monuments.map((monument, idx) => {
                        const pos = ASWAN_POSITIONS[monument.key];
                        if (!pos) return null; // Fallback if key missing
                        return (
                          <button
                            key={monument.key}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectMonument(monument);
                            }}
                            className="absolute z-20 flex flex-col items-center -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform duration-300"
                            style={{ left: pos.left, top: pos.top }}
                          >
                            <div className="relative flex items-center justify-center">
                              <div 
                                className="absolute w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[#c4a06a]/50 pointer-events-none"
                                style={{ animation: 'rippleAswan 2s ease-out infinite', animationDelay: `${idx * 0.4}s` }}
                              />
                              <div 
                                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#d4853a] border-[3px] border-[#fff8ee]"
                                style={{ animation: 'hotspotPulseAswan 2s infinite', animationDelay: `${idx * 0.3}s` }}
                              />
                            </div>
                            <span className="mt-2 px-3 py-1.5 rounded-lg bg-[#0b0a08]/90 backdrop-blur-md border border-[#c4a06a]/40 text-sand text-[11px] sm:text-xs font-bold shadow-xl whitespace-nowrap">
                              {monument.display_name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </TransformComponent>
                </div>
              </>
            )}
          </TransformWrapper>
        </div>
      ) : (
        /* ── Standard Grid View ──────────────────────── */
        <>
          <div className="px-6 pt-6 pb-4 flex-shrink-0">
            <h2 className="text-2xl font-bold text-[#c4a06a] mb-1">اختر الأثر</h2>
            <p className="text-sand/40 text-sm">
              {monuments.length} معالم في {governorate.name}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {monuments.map((monument) => (
                <button
                  key={monument.key}
                  onClick={() => onSelectMonument(monument)}
                  className="group text-right p-5 bg-[#111010] border border-[#c4a06a]/15 rounded-2xl hover:border-[#c4a06a]/50 hover:bg-[#c4a06a]/5 transition-all duration-300 active:scale-[0.98]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#c4a06a]/10 border border-[#c4a06a]/20 flex items-center justify-center group-hover:bg-[#c4a06a]/20 transition-colors">
                      <Landmark className="w-5 h-5 text-[#c4a06a]/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sand font-bold text-base mb-0.5 truncate">
                        {monument.display_name}
                      </h3>
                      <p className="text-[#c4a06a]/60 text-xs font-medium mb-2">
                        {monument.builder}
                      </p>
                      <p className="text-sand/40 text-xs leading-relaxed line-clamp-2">
                        {monument.bio}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
