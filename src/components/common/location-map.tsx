import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon (Leaflet has issues with bundlers)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

interface LocationMapProps {
  latitude: number
  longitude: number
  /** Si es true, el pin es arrastrable y llama a onChange con las nuevas coords */
  draggable?: boolean
  onChange?: (lat: number, lng: number) => void
  /** Altura del mapa en píxeles */
  height?: number
  /** Zoom inicial (default: 15) */
  zoom?: number
}

/** Componente interno para recentrar el mapa cuando cambian las coords */
function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMapEvents({})
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true })
  }, [lat, lng, map])
  return null
}

export function LocationMap({
  latitude,
  longitude,
  draggable = false,
  onChange,
  height = 240,
  zoom = 15
}: LocationMapProps) {
  const markerRef = useRef<L.Marker | null>(null)

  const handleDragEnd = () => {
    if (!markerRef.current || !onChange) return
    const pos = markerRef.current.getLatLng()
    onChange(pos.lat, pos.lng)
  }

  return (
    <div
      className='rounded-xl overflow-hidden border border-border'
      style={{ height }}
    >
      <MapContainer
        center={[latitude, longitude]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <Marker
          position={[latitude, longitude]}
          draggable={draggable}
          eventHandlers={{ dragend: handleDragEnd }}
          ref={(ref) => {
            markerRef.current = ref
          }}
        />
        <Recenter lat={latitude} lng={longitude} />
      </MapContainer>
    </div>
  )
}
