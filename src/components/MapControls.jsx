import { useState, useRef, useEffect } from 'react'
import { useMap } from 'react-leaflet'
import './MapControls.css'

// Map layer configurations
const MAP_LAYERS = [
  { id: 'default', name: 'Default', icon: '🗺️' },
  { id: 'satellite', name: 'Satellite', icon: '🛰️' },
  { id: 'terrain', name: 'Terrain', icon: '⛰️' },
  { id: 'minimal', name: 'Minimal', icon: '◻️' },
  { id: 'dark', name: 'Dark', icon: '🌙' }
]

// Debounce hook for search
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

function MapControls({ mapStyle = 'default', onMapStyleChange }) {
  const map = useMap()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false)
  const searchRef = useRef(null)
  const layerRef = useRef(null)

  const debouncedQuery = useDebounce(searchQuery, 300)

  // Search for locations using Nominatim
  useEffect(() => {
    const searchLocations = async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedQuery)}&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data = await response.json()
        setSearchResults(data)
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    searchLocations()
  }, [debouncedQuery])

  // Close search results and layer menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false)
      }
      if (layerRef.current && !layerRef.current.contains(e.target)) {
        setIsLayerMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleResultClick = (result) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    map.flyTo([lat, lng], 12, { duration: 1.5 })
    setSearchQuery('')
    setSearchResults([])
    setIsSearchOpen(false)
  }

  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    setIsLocating(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        map.flyTo([latitude, longitude], 13, { duration: 1.5 })
        setIsLocating(false)
      },
      (error) => {
        setIsLocating(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied')
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location unavailable')
            break
          case error.TIMEOUT:
            setLocationError('Location request timed out')
            break
          default:
            setLocationError('Unable to get location')
        }
        // Clear error after 3 seconds
        setTimeout(() => setLocationError(null), 3000)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  return (
    <div className="map-controls">
      {/* Search Bar */}
      <div className="search-container" ref={searchRef}>
        <div className="search-input-wrapper">
          <span className="search-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search location..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsSearchOpen(true)
            }}
            onFocus={() => setIsSearchOpen(true)}
            className="search-input"
          />
          {isSearching && <span className="search-spinner"></span>}
          {searchQuery && !isSearching && (
            <button
              className="search-clear"
              onClick={() => {
                setSearchQuery('')
                setSearchResults([])
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Search Results */}
        {isSearchOpen && searchResults.length > 0 && (
          <ul className="search-results">
            {searchResults.map((result) => (
              <li
                key={result.place_id}
                onClick={() => handleResultClick(result)}
                className="search-result-item"
              >
                <span className="result-icon">📍</span>
                <div className="result-content">
                  <span className="result-name">{result.display_name.split(',')[0]}</span>
                  <span className="result-address">
                    {result.display_name.split(',').slice(1, 3).join(',')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* My Location Button */}
      <button
        className={`my-location-btn ${isLocating ? 'locating' : ''}`}
        onClick={handleMyLocation}
        disabled={isLocating}
        title="Go to my location"
      >
        {isLocating ? (
          <span className="location-spinner"></span>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 2v2"></path>
            <path d="M12 20v2"></path>
            <path d="M2 12h2"></path>
            <path d="M20 12h2"></path>
          </svg>
        )}
      </button>

      {/* Location Error Toast */}
      {locationError && (
        <div className="location-error">
          {locationError}
        </div>
      )}

      {/* Layer Selector */}
      <div className="layer-selector" ref={layerRef}>
        <button
          className={`layer-btn ${isLayerMenuOpen ? 'active' : ''}`}
          onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
          title="Change map layer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
        </button>

        {isLayerMenuOpen && (
          <div className="layer-menu">
            {MAP_LAYERS.map((layer) => (
              <button
                key={layer.id}
                className={`layer-option ${mapStyle === layer.id ? 'active' : ''}`}
                onClick={() => {
                  onMapStyleChange?.(layer.id)
                  setIsLayerMenuOpen(false)
                }}
              >
                <span className="layer-icon">{layer.icon}</span>
                <span className="layer-name">{layer.name}</span>
                {mapStyle === layer.id && (
                  <span className="layer-check">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MapControls
