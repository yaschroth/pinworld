import { MapContainer, TileLayer, ZoomControl, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import MapControls from './MapControls'

// Fix for default marker icons in Vite/Webpack
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Category colors and icons
const CATEGORY_CONFIG = {
  general: { color: '#3b9cea', icon: '📍' },
  food: { color: '#e53935', icon: '🍽️' },
  nature: { color: '#43a047', icon: '🌲' },
  hotel: { color: '#8e24aa', icon: '🏨' },
  beach: { color: '#00acc1', icon: '🏖️' },
  culture: { color: '#6d4c41', icon: '🏛️' },
  shopping: { color: '#f4511e', icon: '🛍️' },
  nightlife: { color: '#5e35b1', icon: '🌙' }
}

// Create custom category icon
const createCategoryIcon = (category) => {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general

  return L.divIcon({
    html: `
      <div class="category-marker" style="--marker-color: ${config.color}">
        <div class="marker-pin"></div>
        <span class="marker-icon">${config.icon}</span>
      </div>
    `,
    className: 'custom-category-marker',
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44]
  })
}

// Component to fly to a position
function FlyToPosition({ position, zoom = 10 }) {
  const map = useMap()

  useEffect(() => {
    if (position) {
      map.flyTo(position, zoom, { duration: 1.5 })
    }
  }, [position, zoom, map])

  return null
}

// Marker component that can be opened programmatically
function PinMarker({ marker, isSelected, onPopupClose }) {
  const markerRef = useRef(null)
  const icon = createCategoryIcon(marker.category)

  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup()
    }
  }, [isSelected])

  const categoryConfig = CATEGORY_CONFIG[marker.category] || CATEGORY_CONFIG.general

  return (
    <Marker
      ref={markerRef}
      position={[marker.lat, marker.lng]}
      icon={icon}
      eventHandlers={{
        popupclose: onPopupClose
      }}
    >
      <Popup>
        <div className="marker-popup">
          <strong>{marker.title}</strong>
          <p>{marker.location}</p>
          <div className="marker-badges">
            <span className="category-badge" style={{ background: categoryConfig.color }}>
              {categoryConfig.icon} {marker.category}
            </span>
            <span className="source-badge">{marker.sourceType}</span>
          </div>
          {marker.url && (
            <a href={marker.url} target="_blank" rel="noopener noreferrer">
              View Source
            </a>
          )}
        </div>
      </Popup>
    </Marker>
  )
}

// World bounds to prevent panning outside the map
const worldBounds = [
  [-85, -180], // Southwest corner
  [85, 180]    // Northeast corner
]

// Map tile layer configurations
const MAP_TILES = {
  default: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri'
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
  },
  minimal: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
  }
}

// Custom cluster icon
const createClusterIcon = (cluster) => {
  const count = cluster.getChildCount()
  let size = 'small'
  let dimensions = 36

  if (count >= 10 && count < 50) {
    size = 'medium'
    dimensions = 44
  } else if (count >= 50) {
    size = 'large'
    dimensions = 52
  }

  return L.divIcon({
    html: `<div class="cluster-icon cluster-${size}"><span>${count}</span></div>`,
    className: 'custom-cluster',
    iconSize: L.point(dimensions, dimensions, true),
  })
}

function MapView({ markers = [], lastPosition, selectedPinId, onPopupClose, mapStyle = 'default', onMapStyleChange }) {
  // Find selected marker position
  const selectedMarker = markers.find(m => m.id === selectedPinId)
  const flyToPosition = selectedMarker
    ? [selectedMarker.lat, selectedMarker.lng]
    : lastPosition

  const tileConfig = MAP_TILES[mapStyle] || MAP_TILES.default

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      minZoom={2}
      maxBounds={worldBounds}
      maxBoundsViscosity={1.0}
      zoomControl={false}
      style={{ height: '100vh', width: '100vw' }}
    >
      <TileLayer
        key={mapStyle}
        attribution={tileConfig.attribution}
        url={tileConfig.url}
      />
      <ZoomControl position="bottomleft" />
      <MapControls mapStyle={mapStyle} onMapStyleChange={onMapStyleChange} />

      <FlyToPosition position={flyToPosition} />

      <MarkerClusterGroup
        chunkedLoading
        iconCreateFunction={createClusterIcon}
        maxClusterRadius={60}
        spiderfyOnMaxZoom={true}
        showCoverageOnHover={false}
        zoomToBoundsOnClick={true}
      >
        {markers.map((marker) => (
          <PinMarker
            key={marker.id}
            marker={marker}
            isSelected={marker.id === selectedPinId}
            onPopupClose={onPopupClose}
          />
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  )
}

export default MapView
