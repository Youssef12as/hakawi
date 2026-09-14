import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import PageShell from '../../components/layout/PageShell';
import DialectMap from '../../components/map/DialectMap';
import { useMapContext } from '../../context/MapContext';

export default function MapOverview() {
  const { governorates } = useMapContext();
  const navigate = useNavigate();

  const handleSelectGovernorate = useCallback((govKey) => {
    navigate(`/map/${govKey}`);
  }, [navigate]);

  return (
    <PageShell className="bg-espresso/5">
      <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row relative">
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
