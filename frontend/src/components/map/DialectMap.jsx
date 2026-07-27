import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const CITY_TO_REGION = {
  alexandria: 'alexandria',
  cairo: 'cairo',
  giza: 'cairo',
  luxor: 'luxor',
  aswan: 'aswan',
};

export default function DialectMap({ regions, selectedRegion, onSelectRegion }) {
  const [svgContent, setSvgContent] = useState('');
  const [popup, setPopup] = useState(null);
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);
  const transformRef = useRef(null);

  // 1. Fetch SVG and render inline
  useEffect(() => {
    fetch('/map/hikawi-egypt-map-interactive.svg')
      .then((res) => res.text())
      .then((data) => setSvgContent(data))
      .catch((err) => console.error('Error fetching SVG map:', err));
  }, []);

  // 2. Handle map clicks (event delegation)
  const handleMapClick = useCallback((e) => {
    // Traverse up to find if we clicked a marker group
    let target = e.target;
    let cityMarker = null;

    while (target && target !== e.currentTarget) {
      if (target.classList && target.classList.contains('city-marker')) {
        cityMarker = target;
        break;
      }
      target = target.parentNode;
    }

    if (cityMarker) {
      const cityKey = cityMarker.getAttribute('data-city');
      if (!cityKey) return;

      const regionKey = CITY_TO_REGION[cityKey];
      if (!regionKey) return;

      const region = regions.find((r) => r.key === regionKey);
      if (!region) return;

      // Position the popup based on mouse click or bounding rect
      const rect = cityMarker.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      setPopup({
        regionKey,
        region,
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top - containerRect.top,
        isTopHalf: (rect.top - containerRect.top) < (containerRect.height / 2),
      });
    } else {
      // Clicked outside a marker, close popup
      setPopup(null);
    }
  }, [regions]);

  const handleConfirm = () => {
    if (popup) {
      if (popup.regionKey === 'aswan' && transformRef.current) {
        setPopup(null); // Hide popup before zooming
        const aswanNode = document.querySelector('[data-city="aswan"]');
        if (aswanNode) {
          const { zoomToElement } = transformRef.current;
          // Zoom into Aswan region
          zoomToElement(aswanNode, 3.5, 900, 'easeOut');
          
          // Wait for zoom to finish before changing the view
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
    >
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
            'hover:bg-[#c4a06a]/20 hover:border-[#c4a06a]/60 transition-all active:scale-90';
          
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

              <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%' }}>
                {/* The SVG Container */}
                <div 
                  className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                  onClick={handleMapClick}
                  onWheel={() => setPopup(null)}
                  onMouseDown={() => setPopup(null)}
                >
                  {svgContent ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: svgContent }}
                      className="flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-[1400px] [&>svg]:max-h-[800px]"
                      style={{
                        width: '100%',
                        height: '100%',
                        filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))'
                      }}
                    />
                  ) : (
                    <div className="text-[#c4a06a] loading-dots font-bold">جاري تحميل الخريطة<span></span><span></span><span></span></div>
                  )}
                </div>
              </TransformComponent>
            </>
          );
        }}
      </TransformWrapper>

      {/* ── Marker Popup (confirmation before chat) ── */}
      {popup && (
        <div
          className="absolute z-40 flex flex-col items-center"
          style={{
            left: popup.x,
            top: popup.y,
            transform: popup.isTopHalf ? 'translate(-50%, 22px)' : 'translate(-50%, calc(-100% - 22px))',
            animation: 'popupAppear 0.25s ease-out both',
          }}
        >
          {/* Top Triangle (pops downward) */}
          {popup.isTopHalf && (
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                borderBottom: '10px solid rgba(17, 16, 16, 0.95)',
                marginBottom: '-1px', // overlap border slightly
              }}
            />
          )}

          <div className="bg-[#111010]/95 backdrop-blur-md border border-[#c4a06a]/40 rounded-2xl px-6 py-4 shadow-2xl min-w-[185px] text-center">
            <h3 className="font-bold text-base mb-0.5 text-[#f4e1bd]">
              {popup.region.name}
            </h3>
            <p className="text-xs text-[#c4a06a]/70 mb-3 font-medium">
              {(popup.region.monuments?.length || 0) > 0
                ? `${popup.region.monuments.length} معالم أثرية`
                : 'قريبًا...'}
            </p>
            <button
              onClick={handleConfirm}
              disabled={!popup.region.monuments?.length}
              id={`region-btn-${popup.regionKey}`}
              className="bg-[#7a2e2e] text-[#f4e1bd] px-5 py-2.5 rounded-xl text-sm font-bold
                         hover:bg-[#8a3636] transition-all w-full active:scale-95 shadow-lg
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              اختر الأثر
            </button>
          </div>

          {/* Bottom Triangle (pops upward) */}
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
