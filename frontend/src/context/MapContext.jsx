import { createContext, useContext, useState, useEffect } from 'react';
import { useChatApi } from '../hooks/useChatApi';

const MapContext = createContext(null);

export function MapProvider({ children }) {
  const { fetchGovernorates } = useChatApi();
  const [governorates, setGovernorates] = useState(null);

  useEffect(() => {
    fetchGovernorates().then((data) => {
      if (data) {
        const rawGovs = data.governorates || data;
        setGovernorates(Array.isArray(rawGovs) ? rawGovs : []);
      }
    });
  }, [fetchGovernorates]);

  return (
    <MapContext.Provider value={{ governorates }}>
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error('useMapContext must be inside MapProvider');
  return ctx;
}
