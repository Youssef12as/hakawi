import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon path (known Leaflet + bundler issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function DialectMap({ regions, selectedRegion, onSelectRegion }) {
  return (
    <div className="map-container h-full min-h-[400px]" id="dialect-map">
      <MapContainer
        center={[26.8, 30.8]}
        zoom={6}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <ZoomControl position="topleft" />

        {regions.map((region) => (
          <Marker
            key={region.key}
            position={[region.lat, region.lng]}
          >
            <Popup>
              <div className="text-center py-1 min-w-[160px]">
                <h3 className="font-bold text-base mb-0.5 text-espresso">{region.name}</h3>
                <p className="text-xs text-olive mb-3 font-medium">
                  {region.elder || 'قريبًا...'}
                </p>
                <button
                  onClick={() => onSelectRegion(region.key)}
                  className="bg-wine text-sand px-4 py-2 rounded-lg text-sm font-bold hover:bg-wine/90 transition-colors w-full active:scale-95"
                  id={`region-btn-${region.key}`}
                >
                  ابدأ المحادثة
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
