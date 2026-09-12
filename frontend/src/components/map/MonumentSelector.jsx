import { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { MapPin, ChevronLeft, Landmark, Sparkles, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const GOVERNORATE_MAPS = {
  aswan: {
    mapSrc: '/map/aswan_map.svg',
    aspectRatio: 'aspect-[3/2]',
    positions: {
      'abu-simbel': { left: '23.8%', top: '43.5%' },
      'philae': { left: '23.2%', top: '15.5%' },
      'unfinished-obelisk': { left: '75.6%', top: '45.4%' },
      'aga-khan': { left: '67.3%', top: '73.3%' },
    },
    hasGeneralTab: true,
    generalKey: 'aswan-general',
    generalLabel: 'حواري أسوان',
    accentColor: '#d4853a',
    pulseColor: 'rgba(212,133,58,0.7)',
  },
  giza: {
    mapSrc: '/map/giza_cinematic_landmarks_map.svg',
    aspectRatio: 'aspect-[1611/976]',
    positions: {
      'greatPyramid': { left: '34%', top: '16%' },
      'khufu_pyramid': { left: '34%', top: '16%' },
      'great-pyramid': { left: '34%', top: '16%' },
      'sphinx': { left: '34%', top: '33%' },
      'stepPyramid': { left: '21%', top: '54%' },
      'step-pyramid': { left: '21%', top: '54%' },
      'bentPyramid': { left: '24%', top: '77%' },
      'bent-pyramid': { left: '24%', top: '77%' },
    },
    hasGeneralTab: true,
    generalKey: 'giza-general',
    generalLabel: 'حواري الجيزة',
    accentColor: '#e8a820',
    pulseColor: 'rgba(232,168,32,0.7)',
  },
  cairo: {
    mapSrc: '/map/cairo_cinematic_landmarks_map.svg',
    aspectRatio: 'aspect-[1611/976]',
    positions: {
      'alAzharMosque': { left: '55%', top: '17%' },
      'azhar': { left: '55%', top: '17%' },
      'cairoCitadel': { left: '82%', top: '16%' },
      'citadel': { left: '82%', top: '16%' },
      'sultanHassanMosque': { left: '59%', top: '40%' },
      'sultan-hassan': { left: '59%', top: '40%' },
      'ibnTulunMosque': { left: '81%', top: '68%' },
      'ibn-tulun': { left: '81%', top: '68%' },
      'hangingChurch': { left: '37%', top: '44%' },
      'hanging-church': { left: '37%', top: '44%' },
    },
    hasGeneralTab: true,
    generalKey: 'cairo-general',
    generalLabel: 'حواري القاهرة',
    accentColor: '#4a9ab8',
    pulseColor: 'rgba(74,154,184,0.7)',
  },
};

/**
 * MonumentSelector — shown after picking a governorate.
 * Supports special interactive artwork maps for Aswan, Giza, and Cairo,
 * with a toggle between map view and hawary (general chat).
 */
export default function MonumentSelector({
  governorate,
  monuments = [],
  onSelectMonument,
  onBack,
}) {
  const govKey = governorate?.key;
  const mapConfig = GOVERNORATE_MAPS[govKey];
  const hasMap = Boolean(mapConfig);

  const [viewMode, setViewMode] = useState(hasMap ? 'map' : 'grid');

  return (
    <div className="h-full flex flex-col bg-[#0b0a08] animate-slide-in-end">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#c4a06a]/20 flex-shrink-0 bg-espresso/50 relative z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sand/60 hover:text-[#c4a06a] transition-colors text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>رجوع للخريطة</span>
        </button>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#c4a06a]" />
          <span className="text-sand/90 text-sm font-bold">{governorate?.name}</span>
        </div>
      </div>

      {/* Toggle: Map ↔ Hawary */}
      {hasMap && mapConfig.hasGeneralTab && (
        <div className="flex justify-center bg-[#111010]/40 py-3 px-6 border-b border-[#c4a06a]/20 flex-shrink-0">
          <div className="flex bg-[#0b0a08] p-1 rounded-xl border border-[#c4a06a]/30 w-full max-w-[380px] shadow-lg">
            <button
              onClick={() => setViewMode('map')}
              className={`flex-1 text-center py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                viewMode === 'map'
                  ? 'text-[#0b0a08] bg-[#c4a06a] shadow-md'
                  : 'text-sand/70 hover:text-[#c4a06a] hover:bg-[#c4a06a]/10'
              }`}
            >
              خريطة المعالم
            </button>
            <button
              onClick={() => {
                const generalMon = monuments.find((m) => m.key === mapConfig.generalKey) || monuments[0];
                if (generalMon) onSelectMonument(generalMon);
              }}
              className={`flex-1 text-center py-2 rounded-lg text-xs sm:text-sm font-bold transition-all text-sand/70 hover:text-[#c4a06a] hover:bg-[#c4a06a]/10`}
            >
              {mapConfig.generalLabel}
            </button>
          </div>
        </div>
      )}

      {hasMap && viewMode === 'map' ? (
        /* ── Special Governorate Artwork Map View ──────────────────────── */
        <div className="flex-1 relative flex flex-col items-center overflow-hidden h-full w-full">
          <style>{`
            @keyframes hotspotPulseGov {
              0% { box-shadow: 0 0 0 0 ${mapConfig.pulseColor}; }
              70% { box-shadow: 0 0 0 16px rgba(0,0,0,0); }
              100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); }
            }
            @keyframes rippleGov {
              0% { transform: scale(0.8); opacity: 1; }
              100% { transform: scale(2.6); opacity: 0; }
            }
          `}</style>

          {/* Main Zoom/Pan Container */}
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
                  <button
                    onClick={() => zoomIn()}
                    title="تكبير"
                    className="w-10 h-10 rounded-xl bg-[#111010]/85 backdrop-blur-sm border border-[#c4a06a]/30 text-[#e8d1a7] flex items-center justify-center hover:bg-[#c4a06a]/20 transition-all shadow-lg active:scale-95"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => zoomOut()}
                    title="تصغير"
                    className="w-10 h-10 rounded-xl bg-[#111010]/85 backdrop-blur-sm border border-[#c4a06a]/30 text-[#e8d1a7] flex items-center justify-center hover:bg-[#c4a06a]/20 transition-all shadow-lg active:scale-95"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => resetTransform()}
                    title="إعادة ضبط"
                    className="w-10 h-10 rounded-xl bg-[#111010]/85 backdrop-blur-sm border border-[#c4a06a]/30 text-[#e8d1a7] flex items-center justify-center hover:bg-[#c4a06a]/20 transition-all shadow-lg active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <div className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing p-2">
                  <TransformComponent
                    wrapperStyle={{ width: '100%', height: '100%' }}
                    contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <div className={`relative w-full max-w-[1020px] ${mapConfig.aspectRatio}`}>
                      <img
                        src={mapConfig.mapSrc}
                        alt={`خريطة ${governorate?.name}`}
                        className="w-full h-full object-cover drop-shadow-2xl rounded-2xl select-none pointer-events-none"
                      />

                      {/* Monument Hotspots */}
                      {monuments.map((monument, idx) => {
                        const pos = mapConfig.positions[monument.key];
                        if (!pos) return null;

                        return (
                          <button
                            key={monument.key}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectMonument(monument);
                            }}
                            className="absolute z-20 flex flex-col items-center -translate-x-1/2 -translate-y-1/2 hover:scale-110 active:scale-95 transition-all duration-300 group cursor-pointer"
                            style={{ left: pos.left, top: pos.top }}
                            id={`hotspot-${monument.key}`}
                          >
                            <div className="relative flex items-center justify-center">
                              {/* Animated outer ripple */}
                              <div
                                className="absolute w-10 h-10 sm:w-12 sm:h-12 rounded-full pointer-events-none"
                                style={{
                                  border: `2px solid ${mapConfig.accentColor}`,
                                  animation: 'rippleGov 2s ease-out infinite',
                                  animationDelay: `${idx * 0.35}s`,
                                }}
                              />
                              {/* Inner glowing dot */}
                              <div
                                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-[2.5px] border-[#fff8ee] shadow-lg"
                                style={{
                                  backgroundColor: mapConfig.accentColor,
                                  animation: 'hotspotPulseGov 2s infinite',
                                  animationDelay: `${idx * 0.25}s`,
                                }}
                              />
                            </div>

                            {/* Badge with monument title */}
                            <div className="mt-2 px-3 py-1.5 rounded-xl bg-[#0b0a08]/92 backdrop-blur-md border border-[#c4a06a]/40 text-sand text-[11px] sm:text-xs font-bold shadow-2xl whitespace-nowrap flex items-center gap-1.5 group-hover:border-[#c4a06a] group-hover:text-[#fff8ee] transition-all">
                              <Sparkles className="w-3 h-3 text-[#c4a06a]" />
                              <span>{monument.display_name}</span>
                            </div>
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
            <p className="text-sand/50 text-sm">
              {monuments.length} معالم في {governorate?.name}
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
