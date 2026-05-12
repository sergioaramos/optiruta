import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix default Leaflet icon issue with Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function createNumberedIcon(number, color = '#6c63ff', isOrigin = false) {
  const bg = isOrigin ? '#2dd4bf' : color
  const label = isOrigin ? '🏠' : number
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:36px;height:36px;
        background:${bg};
        border:2.5px solid #fff;
        border-radius:50% 50% 50% 4px;
        transform:rotate(-45deg);
        box-shadow:0 3px 12px rgba(0,0,0,0.4);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="transform:rotate(45deg);font-size:${isOrigin?'14px':'13px'};font-weight:700;color:#fff;line-height:1">${label}</span>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  })
}

function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points.length < 1) return
    if (points.length === 1) { map.setView([points[0].lat, points[0].lng], 14); return }
    const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [points, map])
  return null
}

export default function RouteMap({ origin, stops = [], polyline = [] }) {
  const center = origin
    ? [origin.lat, origin.lng]
    : stops.length > 0 ? [stops[0].lat, stops[0].lng] : [5.0689, -75.5174] // Manizales default

  const allPoints = [
    ...(origin ? [origin] : []),
    ...stops.filter(s => s.lat && s.lng),
  ]

  return (
    <div className="map-container" style={{ height: '340px' }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />

        {origin && origin.lat && (
          <Marker position={[origin.lat, origin.lng]} icon={createNumberedIcon(0, '#2dd4bf', true)}>
            <Popup><strong>📍 Punto de inicio</strong><br />{origin.address}</Popup>
          </Marker>
        )}

        {stops.map((stop, i) => stop.lat && (
          <Marker key={stop.id || i} position={[stop.lat, stop.lng]} icon={createNumberedIcon(i + 1)}>
            <Popup>
              <strong>{i + 1}. {stop.name}</strong><br />
              {stop.address}
              {stop.phone && <><br />📞 {stop.phone}</>}
            </Popup>
          </Marker>
        ))}

        {polyline.length > 1 && (
          <Polyline
            positions={polyline}
            pathOptions={{ color: '#6c63ff', weight: 4, opacity: 0.85, dashArray: null }}
          />
        )}

        <FitBounds points={allPoints} />
      </MapContainer>
    </div>
  )
}
