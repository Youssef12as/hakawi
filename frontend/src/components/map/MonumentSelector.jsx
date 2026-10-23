import { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { MapPin, ChevronLeft, Landmark, Sparkles, ZoomIn, ZoomOut, RotateCcw, Clock3 } from 'lucide-react';
import ComingSoonCharacter from '../character/ComingSoonCharacter';
import { findAvailableCharacter, isCharacterAvailable } from '../../utils/characterAvailability';

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
  luxor: {
    mapSrc: '/map/luxor_map.svg',
    aspectRatio: 'aspect-[3/2]',
    positions: {
      'hatshepsut-temple': { left: '31%', top: '25%' },
      'tutankhamun-tomb': { left: '14%', top: '14%' },
      'karnak': { left: '81%', top: '43%' },
      'nefertari-tomb': { left: '10%', top: '65%' },
      'deir-el-medina': { left: '31%', top: '69%' },
    },
    hasGeneralTab: false,
    accentColor: '#d99a4e',
    pulseColor: 'rgba(217,154,78,0.65)',
  },
  alexandria: {
    mapSrc: '/map/alexandria_map.svg',
    aspectRatio: 'aspect-[3/2]',
    positions: {
      'qaitbay': { left: '17%', top: '18%' },
      'pompeys-pillar': { left: '18%', top: '65%' },
      'ancient-library': { left: '81%', top: '43%' },
    },
    hasGeneralTab: false,
    accentColor: '#54a6b5',
    pulseColor: 'rgba(84,166,181,0.65)',
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
  onExploreAvailable,
  onBack,
}) {
  const govKey = governorate?.key;
  const mapConfig = GOVERNORATE_MAPS[govKey];
  const hasMap = Boolean(mapConfig);

  const [viewMode, setViewMode] = useState(hasMap ? 'map' : 'grid');
  const [comingSoonMonument, setComingSoonMonument] = useState(null);
  const generalMonument = mapConfig?.generalKey
    ? monuments.find((monument) => monument.key === mapConfig.generalKey) || monuments[0]
    : null;
  const generalIsAvailable = isCharacterAvailable(generalMonument?.key);

  const handleMonumentClick = (monument) => {
    if (isCharacterAvailable(monument?.key)) {
      onSelectMonument(monument);
      return;
    }
    setComingSoonMonument(monument);
  };

  const handleExploreAvailable = () => {
    const availableHere = findAvailableCharacter(monuments);
    setComingSoonMonument(null);
    if (availableHere) {
      onSelectMonument(availableHere);
      return;
    }
    if (onExploreAvailable) {
      onExploreAvailable();
      return;
    }
    onBack();
  };

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
                if (generalMonument) handleMonumentClick(generalMonument);
              }}
              className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-center text-xs font-bold text-sand/70 transition-all hover:bg-[#c4a06a]/10 hover:text-[#c4a06a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d9b875] sm:text-sm"
              aria-label={`${mapConfig.generalLabel}، ${generalIsAvailable ? 'متاح الآن' : 'قريبًا'}`}
            >
              <span>{mapConfig.generalLabel}</span>
              {!generalIsAvailable && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#c4a06a]/10 px-1.5 py-0.5 text-[9px] text-[#e0c89b]">
                  <Clock3 className="h-2.5 w-2.5" aria-hidden="true" />
                  قريبًا
                </span>
              )}
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
                <div className="absolute left-2 top-2 z-30 flex flex-col gap-0.5 sm:left-6 sm:top-6 sm:gap-2">
                  <button
                    onClick={() => zoomIn()}
                    title="تكبير"
                    aria-label="تكبير الخريطة"
                    className="flex h-11 w-11 items-center justify-center text-[#e8d1a7] transition-opacity hover:opacity-100 active:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d9b875]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#c4a06a]/30 bg-[#111010]/85 shadow-lg backdrop-blur-sm transition-colors hover:bg-[#c4a06a]/20 sm:h-10 sm:w-10 sm:rounded-xl">
                      <ZoomIn className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    </span>
                  </button>
                  <button
                    onClick={() => zoomOut()}
                    title="تصغير"
                    aria-label="تصغير الخريطة"
                    className="flex h-11 w-11 items-center justify-center text-[#e8d1a7] transition-opacity hover:opacity-100 active:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d9b875]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#c4a06a]/30 bg-[#111010]/85 shadow-lg backdrop-blur-sm transition-colors hover:bg-[#c4a06a]/20 sm:h-10 sm:w-10 sm:rounded-xl">
                      <ZoomOut className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    </span>
                  </button>
                  <button
                    onClick={() => resetTransform()}
                    title="إعادة ضبط"
                    aria-label="إعادة ضبط الخريطة"
                    className="flex h-11 w-11 items-center justify-center text-[#e8d1a7] transition-opacity hover:opacity-100 active:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d9b875]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#c4a06a]/30 bg-[#111010]/85 shadow-lg backdrop-blur-sm transition-colors hover:bg-[#c4a06a]/20 sm:h-10 sm:w-10 sm:rounded-xl">
                      <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                    </span>
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
                        const isAvailable = isCharacterAvailable(monument.key);

                        return (
                          <button
                            key={monument.key}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMonumentClick(monument);
                            }}
                            className={`absolute z-20 flex min-h-12 min-w-12 flex-col items-center -translate-x-1/2 -translate-y-1/2 active:scale-95 transition-all duration-300 group cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f2d092] ${isAvailable ? 'hover:scale-110' : 'opacity-90 hover:opacity-100'}`}
                            style={{ left: pos.left, top: pos.top }}
                            id={`hotspot-${monument.key}`}
                            aria-label={`${monument.display_name}، ${isAvailable ? 'متاح الآن' : 'قريبًا'}`}
                          >
                            <div className="relative flex items-center justify-center">
                              {/* Animated outer ripple */}
                              <div
                                className="pointer-events-none absolute h-7 w-7 rounded-full sm:h-12 sm:w-12"
                                style={{
                                  border: `2px solid ${mapConfig.accentColor}`,
                                  animation: isAvailable ? 'rippleGov 2s ease-out infinite' : 'none',
                                  animationDelay: `${idx * 0.35}s`,
                                  opacity: isAvailable ? 1 : 0.55,
                                }}
                              />
                              {/* Inner glowing dot */}
                              <div
                                className="h-3.5 w-3.5 rounded-full border-2 border-[#fff8ee] shadow-lg sm:h-6 sm:w-6 sm:border-[2.5px]"
                                style={{
                                  backgroundColor: mapConfig.accentColor,
                                  animation: isAvailable ? 'hotspotPulseGov 2s infinite' : 'none',
                                  animationDelay: `${idx * 0.25}s`,
                                  filter: isAvailable ? 'none' : 'saturate(0.45)',
                                }}
                              />
                            </div>

                            {/* Badge with monument title */}
                            <div className="mt-1 flex max-w-[6.5rem] items-center justify-center gap-1 rounded-lg border border-[#c4a06a]/40 bg-[#0b0a08]/92 px-1.5 py-1 text-center text-[9px] font-bold leading-tight text-sand shadow-2xl backdrop-blur-md transition-all group-hover:border-[#c4a06a] group-hover:text-[#fff8ee] sm:mt-2 sm:max-w-none sm:gap-1.5 sm:whitespace-nowrap sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-xs">
                              {isAvailable ? (
                                <Sparkles className="h-2.5 w-2.5 shrink-0 text-[#c4a06a] sm:h-3 sm:w-3" aria-hidden="true" />
                              ) : (
                                <Clock3 className="h-2.5 w-2.5 shrink-0 text-[#d7bd8b] sm:h-3 sm:w-3" aria-hidden="true" />
                              )}
                              <span className="line-clamp-2 sm:line-clamp-none">{monument.display_name}</span>
                              <span className={`hidden rounded-full px-1.5 py-0.5 text-[9px] sm:inline-flex ${isAvailable ? 'bg-emerald-400/15 text-emerald-200' : 'bg-[#c4a06a]/15 text-[#e0c89b]'}`}>
                                {isAvailable ? 'متاح الآن' : 'قريبًا'}
                              </span>
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
              {monuments.map((monument) => {
                const isAvailable = isCharacterAvailable(monument.key);
                return (
                  <button
                    key={monument.key}
                    onClick={() => handleMonumentClick(monument)}
                    className="group min-h-32 text-right p-5 bg-[#111010] border border-[#c4a06a]/15 rounded-2xl hover:border-[#c4a06a]/50 hover:bg-[#c4a06a]/5 transition-all duration-300 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d9b875]"
                    aria-label={`${monument.display_name}، ${isAvailable ? 'متاح الآن' : 'قريبًا'}`}
                  >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#c4a06a]/10 border border-[#c4a06a]/20 flex items-center justify-center group-hover:bg-[#c4a06a]/20 transition-colors">
                      {isAvailable ? (
                        <Landmark className="w-5 h-5 text-[#c4a06a]/70" aria-hidden="true" />
                      ) : (
                        <Clock3 className="w-5 h-5 text-[#c4a06a]/70" aria-hidden="true" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <h3 className="truncate text-base font-bold text-sand">{monument.display_name}</h3>
                        <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${isAvailable ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200' : 'border-[#c4a06a]/25 bg-[#c4a06a]/10 text-[#e0c89b]'}`}>
                          {isAvailable ? 'متاح الآن' : 'قريبًا'}
                        </span>
                      </div>
                      <p className="text-[#c4a06a]/60 text-xs font-medium mb-2">
                        {monument.builder}
                      </p>
                      <p className="text-sand/40 text-xs leading-relaxed line-clamp-2">
                        {monument.bio}
                      </p>
                    </div>
                  </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <ComingSoonCharacter
        monument={comingSoonMonument}
        isOpen={Boolean(comingSoonMonument)}
        onClose={() => setComingSoonMonument(null)}
        onExploreAvailable={handleExploreAvailable}
      />
    </div>
  );
}
