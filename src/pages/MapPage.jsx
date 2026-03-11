import { useState, useEffect } from 'react'
import MapView from '../components/MapView'
import Sidebar from '../components/Sidebar'
import PinList from '../components/PinList'
import Loading from '../components/Loading'
import LogoutButton from '../components/LogoutButton'
import SettingsPanel from '../components/SettingsPanel'
import StatsPanel from '../components/StatsPanel'
import MapFilters from '../components/MapFilters'
import TripItineraryView from '../components/TripItineraryView'
import { useGeocoding } from '../hooks/useGeocoding'
import { usePins } from '../hooks/usePins'
import { useTrips } from '../hooks/useTrips'
import { CATEGORIES } from '../lib/constants'

function MapPage() {
  const [lastPosition, setLastPosition] = useState(null)
  const [selectedPinId, setSelectedPinId] = useState(null)
  const [isPinListOpen, setIsPinListOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showItinerary, setShowItinerary] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [mapStyle, setMapStyle] = useState(() => {
    return localStorage.getItem('pinworld-map-style') || 'default'
  })
  const [selectedCategories, setSelectedCategories] = useState(() => {
    // Default to all categories selected
    return CATEGORIES.map(c => c.value)
  })
  const { geocode, isLoading: isGeocoding, error: geocodeError } = useGeocoding()
  const { pins, isLoading, isSaving, error: pinsError, addPin, deletePin, toggleFavorite, toggleVisited, updateCategory, updateNotes, updateVisitedDate, clearError } = usePins()
  const { trips } = useTrips()

  // Save map style preference
  useEffect(() => {
    localStorage.setItem('pinworld-map-style', mapStyle)
  }, [mapStyle])

  // Convert pins from Supabase format to marker format and filter by category
  const markers = pins
    .filter(pin => selectedCategories.includes(pin.category || 'general'))
    .map(pin => ({
      id: pin.id,
      title: pin.title,
      url: pin.url,
      location: pin.location_name,
      sourceType: pin.source_type,
      category: pin.category || 'general',
      lat: pin.latitude,
      lng: pin.longitude
    }))

  const handleSubmit = async (formData) => {
    clearError()

    const result = await geocode(formData.location)

    if (result) {
      const savedPin = await addPin({
        title: formData.title,
        url: formData.url,
        location: formData.location,
        sourceType: formData.sourceType,
        category: formData.category,
        tags: formData.tags || [],
        lat: result.lat,
        lng: result.lng,
        country: formData.country,
        continent: formData.continent,
        locationType: formData.locationType
      })

      if (savedPin) {
        setLastPosition([result.lat, result.lng])
      }
    }
  }

  const handlePinClick = (pin) => {
    setSelectedPinId(pin.id)
    // Close pin list on mobile after selection
    if (window.innerWidth <= 768) {
      setIsPinListOpen(false)
    }
  }

  const handlePopupClose = () => {
    setSelectedPinId(null)
  }

  const togglePinList = () => {
    setIsPinListOpen(prev => !prev)
  }

  const handleViewItinerary = (trip) => {
    setSelectedTrip(trip)
    setShowItinerary(true)
  }

  const handleCloseItinerary = () => {
    setShowItinerary(false)
    setSelectedTrip(null)
  }

  const handleItineraryPinClick = (pin) => {
    // Close itinerary view and focus on the pin on the map
    setShowItinerary(false)
    setSelectedPinId(pin.id)
    setLastPosition([pin.latitude, pin.longitude])
  }

  // Combine errors from geocoding and pins
  const error = geocodeError || pinsError

  if (isLoading) {
    return <Loading message="Loading pins..." />
  }

  return (
    <>
      <LogoutButton
        onSettingsClick={() => setShowSettings(true)}
        onStatsClick={() => setShowStats(true)}
      />
      <MapFilters
        selectedCategories={selectedCategories}
        onCategoryChange={setSelectedCategories}
      />
      <PinList
        pins={pins}
        onPinClick={handlePinClick}
        onToggleFavorite={toggleFavorite}
        onToggleVisited={toggleVisited}
        onUpdateCategory={updateCategory}
        onUpdateNotes={updateNotes}
        onUpdateVisitedDate={updateVisitedDate}
        onDeletePin={deletePin}
        isOpen={isPinListOpen}
        onToggle={togglePinList}
        onViewItinerary={handleViewItinerary}
      />
      <MapView
        markers={markers}
        lastPosition={lastPosition}
        selectedPinId={selectedPinId}
        onPopupClose={handlePopupClose}
        mapStyle={mapStyle}
        onMapStyleChange={setMapStyle}
      />
      <Sidebar
        onSubmit={handleSubmit}
        isLoading={isGeocoding || isSaving}
        error={error}
      />
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        mapStyle={mapStyle}
        onMapStyleChange={setMapStyle}
      />
      <StatsPanel
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        pins={pins}
      />
      {showItinerary && selectedTrip && (
        <TripItineraryView
          trip={selectedTrip}
          onClose={handleCloseItinerary}
          onPinClick={handleItineraryPinClick}
        />
      )}
    </>
  )
}

export default MapPage
