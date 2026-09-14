import { Outlet } from 'react-router-dom';
import { MapProvider } from '../../context/MapContext';

export default function MapLayout() {
  return (
    <MapProvider>
      <Outlet />
    </MapProvider>
  );
}
