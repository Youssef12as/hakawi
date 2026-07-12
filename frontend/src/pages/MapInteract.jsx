import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/layout/PageShell';
import DialectMap from '../components/map/DialectMap';
import RegionWall from './RegionWall';

const REGIONS = [
  { key: 'aswan',      name: 'أسوان والنوبة',       nameEn: 'Aswan & Nubia',       lat: 24.0889, lng: 32.8998 },
  { key: 'luxor',      name: 'الأقصر وصعيد مصر',    nameEn: 'Luxor & Upper Egypt',  lat: 25.6872, lng: 32.6396 },
  { key: 'cairo',      name: 'القاهرة والجيزة',      nameEn: 'Cairo & Giza',         lat: 30.0444, lng: 31.2357 },
  { key: 'alexandria', name: 'الإسكندرية والدلتا',   nameEn: 'Alexandria & Delta',   lat: 31.2001, lng: 29.9187 },
];

export default function MapInteract() {
  const navigate = useNavigate();
  const [selectedRegionKey, setSelectedRegionKey] = useState(null);
  const [isAncientMode, setIsAncientMode] = useState(false);

  const handleSelectRegion = useCallback((regionKey) => {
    if (isAncientMode) {
      navigate(`/ancient/${regionKey}`);
      return;
    }
    setSelectedRegionKey(regionKey);
  }, [isAncientMode, navigate]);

  const handleBackToMap = useCallback(() => {
    setSelectedRegionKey(null);
  }, []);

  // ── If a region is selected, show its Wall ─────────────────────────────────
  if (selectedRegionKey) {
    return (
      <PageShell className="bg-espresso/5">
        <div className="h-[calc(100vh-4rem)]">
          <RegionWall regionKey={selectedRegionKey} onBack={handleBackToMap} />
        </div>
      </PageShell>
    );
  }

  // ── Default: show the Egypt Map ────────────────────────────────────────────
  return (
    <PageShell className="bg-espresso/5">
      <div className="h-[calc(100vh-4rem)] relative">

        {/* Ancient Mode Toggle */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-[#111010]/80 backdrop-blur-md px-6 py-3 rounded-full border border-[#c4a06a]/20 shadow-lg">
          <span className={`text-sm font-bold transition-colors ${!isAncientMode ? 'text-[#c4a06a]' : 'text-sand/40'}`}>
            اللهجة الحديثة
          </span>
          <button
            onClick={() => setIsAncientMode(v => !v)}
            className="relative w-14 h-7 rounded-full bg-espresso border border-[#c4a06a]/30"
            aria-label="تبديل وضع الفراعنة"
          >
            <div className={`absolute top-1 bottom-1 w-5 bg-[#c4a06a] rounded-full transition-all duration-300 ${isAncientMode ? 'left-1' : 'left-8'}`} />
          </button>
          <span className={`text-sm font-bold transition-colors ${isAncientMode ? 'text-[#c4a06a]' : 'text-sand/40'}`}>
            وضع الفراعنة
          </span>
        </div>

        {/* Hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <p className="text-sand/40 text-sm backdrop-blur-sm bg-black/20 px-4 py-2 rounded-full">
            اضغط على أي منطقة لتكتشف جدارها الحي ✨
          </p>
        </div>

        {/* Map */}
        <div className="w-full h-full p-3 sm:p-4">
          <DialectMap
            regions={REGIONS}
            selectedRegion={null}
            onSelectRegion={handleSelectRegion}
          />
        </div>

      </div>
    </PageShell>
  );
}
