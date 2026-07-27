import React, { useState, useCallback, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const MARKERS = [
  { key: 'alexandria', label: 'الإسكندرية', top: '13.5%', left: '46%' },
  { key: 'cairo', label: 'القاهرة والجيزة', top: '24.5%', left: '57.5%' },
  { key: 'luxor', label: 'الأقصر وطيبة', top: '62.0%', left: '69.5%' },
  { key: 'aswan', label: 'أسوان والنوبة', top: '81.5%', left: '63.0%' },
];

export default function DialectMap({ regions, selectedRegion, onSelectRegion }) {
  const [popup, setPopup] = useState(null);
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);
  const transformRef = useRef(null);

  const handleMarkerClick = useCallback((e, markerKey) => {
    e.stopPropagation();
    const region = regions?.find((r) => r.key === markerKey) || {
      key: markerKey,
      name: MARKERS.find((m) => m.key === markerKey)?.label || markerKey,
      monuments: [1, 2, 3], // fallback if regions array not populated yet
    };

    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    setPopup({
      regionKey: markerKey,
      region,
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top - containerRect.top,
      isTopHalf: (rect.top - containerRect.top) < (containerRect.height / 2),
    });
  }, [regions]);

  const handleConfirm = () => {
    if (popup) {
      if (popup.regionKey === 'aswan' && transformRef.current) {
        setPopup(null);
        const aswanNode = document.querySelector('[data-city="aswan"]');
        if (aswanNode) {
          const { zoomToElement } = transformRef.current;
          zoomToElement(aswanNode, 3.5, 900, 'easeOut');
          setTimeout(() => {
            onSelectRegion(popup.regionKey);
          }, 900);
          return;
        }
      }
      onSelectRegion(popup.regionKey);
      setPopup(null);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center h-full w-full overflow-hidden rounded-xl select-none bg-[#0b0a08]"
      id="dialect-map"
      onClick={() => setPopup(null)}
    >
      <style>{`
        @keyframes markerRipple {
          0% { transform: scale(0.8); opacity: 0.9; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes markerGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(212,133,58,0.8), 0 0 20px rgba(196,160,106,0.5); }
          50% { box-shadow: 0 0 20px rgba(212,133,58,1), 0 0 35px rgba(232,209,167,0.8); }
        }
        @keyframes popupAppear {
          0% { opacity: 0; transform: translate(-50%, 10px) scale(0.95); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
      `}</style>

      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={1}
        maxScale={4}
        centerOnInit={true}
        onTransformed={(ref) => setScale(ref.state.scale)}
        wheel={{ step: 0.1 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => {
          const zoomBtnClass =
            'w-9 h-9 rounded-lg bg-[#111010]/80 backdrop-blur-sm border border-[#c4a06a]/30 ' +
            'text-[#e8d1a7] flex items-center justify-center ' +
            'hover:bg-[#c4a06a]/20 hover:border-[#c4a06a]/60 transition-all active:scale-90 shadow-lg';

          return (
            <>
              {/* Zoom Controls */}
              <div className="absolute top-4 left-4 z-30 flex flex-col gap-1.5">
                <button onClick={() => zoomIn()} title="تكبير" className={zoomBtnClass}>
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={() => zoomOut()} title="تصغير" className={zoomBtnClass}>
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button onClick={() => resetTransform()} title="إعادة ضبط" className={zoomBtnClass}>
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {scale > 1 && (
                <div className="absolute bottom-4 left-4 z-30 text-[11px] text-[#c4a06a]/60 bg-[#111010]/60 px-2 py-0.5 rounded-md backdrop-blur-sm">
                  {Math.round(scale * 100)}%
                </div>
              )}

              <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
                <div className="relative w-full h-full max-w-[1000px] max-h-[800px] flex items-center justify-center p-4">
                  {/* Map Image */}
                  <img
                    src="/map/egypt_map.png"
                    alt="خريطة مصر"
                    className="w-full h-full object-contain drop-shadow-[0_0_35px_rgba(196,160,106,0.15)] pointer-events-none"
                  />

                  {/* Interactive City Markers */}
                  {MARKERS.map((marker) => {
                    const region = regions?.find((r) => r.key === marker.key);
                    const displayName = region?.name || marker.label;

                    return (
                      <div
                        key={marker.key}
                        data-city={marker.key}
                        onClick={(e) => handleMarkerClick(e, marker.key)}
                        className="absolute z-20 flex flex-col items-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group hover:scale-110 transition-transform duration-300"
                        style={{ top: marker.top, left: marker.left }}
                      >
                        {/* Ripple Effect Ring */}
                        <div
                          className="absolute w-10 h-10 rounded-full border-2 border-[#d4853a]/60 pointer-events-none"
                          style={{ animation: 'markerRipple 2.2s ease-out infinite' }}
                        />

                        {/* Pin Dot */}
                        <div
                          className="w-5 h-5 rounded-full bg-gradient-to-br from-[#f1d7a6] via-[#d4853a] to-[#84592b] border-2 border-[#fff8ee] shadow-xl"
                          style={{ animation: 'markerGlow 2.5s infinite alternate' }}
                        />

                        {/* Label Badge */}
                        <span className="mt-2 px-3 py-1 rounded-lg bg-[#0b0a08]/90 backdrop-blur-md border border-[#c4a06a]/40 text-[#f4e1bd] text-xs font-bold shadow-2xl whitespace-nowrap group-hover:border-[#c4a06a] group-hover:text-amber-300 transition-colors">
                          {displayName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </TransformComponent>
            </>
          );
        }}
      </TransformWrapper>

      {/* ── Marker Popup (confirmation before selection) ── */}
      {popup && (
        <div
          className="absolute z-40 flex flex-col items-center"
          style={{
            left: popup.x,
            top: popup.y,
            transform: popup.isTopHalf ? 'translate(-50%, 25px)' : 'translate(-50%, calc(-100% - 25px))',
            animation: 'popupAppear 0.25s ease-out both',
          }}
        >
          {popup.isTopHalf && (
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                borderBottom: '10px solid rgba(17, 16, 16, 0.95)',
                marginBottom: '-1px',
              }}
            />
          )}

          <div className="bg-[#111010]/95 backdrop-blur-md border border-[#c4a06a]/40 rounded-2xl px-6 py-4 shadow-2xl min-w-[190px] text-center">
            <h3 className="font-bold text-base mb-1 text-[#f4e1bd]">
              {popup.region.name}
            </h3>
            <p className="text-xs text-[#c4a06a]/70 mb-3 font-medium">
              {(popup.region.monuments?.length || 0) > 0
                ? `${popup.region.monuments.length} معالم أثرية`
                : 'استكشف معالم المنطقة'}
            </p>
            <button
              onClick={handleConfirm}
              id={`region-btn-${popup.regionKey}`}
              className="bg-[#7a2e2e] text-[#f4e1bd] px-5 py-2.5 rounded-xl text-sm font-bold
                         hover:bg-[#8a3636] transition-all w-full active:scale-95 shadow-lg"
            >
              اختر الأثر
            </button>
          </div>

          {!popup.isTopHalf && (
            <div className="flex justify-center -mt-px">
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '10px solid transparent',
                  borderRight: '10px solid transparent',
                  borderTop: '10px solid rgba(17, 16, 16, 0.95)',
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
