import { useParams, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import PageShell from '../../components/layout/PageShell';
import MonumentSelector from '../../components/map/MonumentSelector';
import { useMapContext } from '../../context/MapContext';
import { keyToSlug } from '../../utils/monumentSlugs';

const crossfadeStyles = `
  @keyframes govMapReveal {
    0% { opacity: 0; transform: scale(0.96); filter: blur(4px); }
    100% { opacity: 1; transform: scale(1); filter: blur(0); }
  }
  .gov-map-reveal {
    animation: govMapReveal 420ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
`;

export default function GovernorateView() {
  const { govKey } = useParams();
  const { governorates } = useMapContext();
  const navigate = useNavigate();

  const governorate = governorates?.find((g) => g.key === govKey);

  const handleSelectMonument = useCallback((monument) => {
    const slug = keyToSlug(monument.key);
    navigate(`/map/${govKey}/${slug}`);
  }, [navigate, govKey]);

  const handleBack = useCallback(() => {
    navigate('/map');
  }, [navigate]);

  // Loading state while governorates are being fetched
  if (!governorates) {
    return (
      <PageShell className="bg-espresso/5">
        <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="w-10 h-10 border-[3px] border-[#c4a06a]/20 border-t-[#c4a06a] rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  // Invalid governorate key
  if (!governorate) {
    navigate('/map', { replace: true });
    return null;
  }

  return (
    <PageShell className="bg-espresso/5">
      <style>{crossfadeStyles}</style>
      <div className="h-[calc(100vh-4rem)] gov-map-reveal">
        <MonumentSelector
          governorate={governorate}
          monuments={governorate.monuments}
          onSelectMonument={handleSelectMonument}
          onBack={handleBack}
        />
      </div>
    </PageShell>
  );
}
