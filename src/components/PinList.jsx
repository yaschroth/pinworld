import { useState, useEffect, useRef } from 'react'
import { groupPinsByLocation } from '../lib/continents'
import { CATEGORIES } from '../lib/constants'
import SourceIcon from './SourceIcon'
import TripsPanel from './TripsPanel'
import { useTrips } from '../hooks/useTrips'
import './PinList.css'

// Helper to get category icon
const getCategoryIcon = (category) => {
  const cat = CATEGORIES.find(c => c.value === category)
  return cat?.icon || '📍'
}

const FILTERS = [
  { id: 'all', label: 'All', icon: '📍' },
  { id: 'favorites', label: 'Favorites', icon: '⭐' },
  { id: 'visited', label: 'Visited', icon: '✓' },
  { id: 'unvisited', label: 'To Visit', icon: '📌' }
]

function PinList({ pins, onPinClick, onToggleFavorite, onToggleVisited, onUpdateCategory, onUpdateNotes, onUpdateVisitedDate, onDeletePin, isOpen, onToggle, onViewItinerary }) {
  const { trips, addPinToTrip, removePinFromTrip, assignPinToDay, getPinTrips, getTripDuration } = useTrips()

  const [expandedContinents, setExpandedContinents] = useState({})
  const [expandedCountries, setExpandedCountries] = useState({})
  const [expandedCities, setExpandedCities] = useState({})
  const [activeFilter, setActiveFilter] = useState('all')
  const [showTrips, setShowTrips] = useState(false)
  const [selectedTripId, setSelectedTripId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingPinId, setEditingPinId] = useState(null)
  const [detailsPin, setDetailsPin] = useState(null)
  const [editingNotes, setEditingNotes] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pinTrips, setPinTrips] = useState([])
  const [selectedTripForPin, setSelectedTripForPin] = useState('')
  const [selectedDayForPin, setSelectedDayForPin] = useState('')

  // Filter pins based on active filter and search query
  const filterPin = (pin) => {
    // First apply status filter
    let passesFilter = true
    switch (activeFilter) {
      case 'favorites':
        passesFilter = pin.is_favorite
        break
      case 'visited':
        passesFilter = pin.is_visited
        break
      case 'unvisited':
        passesFilter = !pin.is_visited
        break
      default:
        passesFilter = true
    }

    // Then apply search filter
    if (passesFilter && searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matchesTitle = pin.title?.toLowerCase().includes(query)
      const matchesLocation = pin.location_name?.toLowerCase().includes(query)
      const matchesTags = pin.tags?.some(tag => tag.toLowerCase().includes(query))
      passesFilter = matchesTitle || matchesLocation || matchesTags
    }

    return passesFilter
  }

  // Get pins that pass the filter
  const directlyFilteredPins = pins.filter(filterPin)

  // Also include parent pins for any filtered children (so hierarchy is preserved)
  const filteredChildIds = directlyFilteredPins.filter(p => p.parent_id).map(p => p.parent_id)
  const parentPinsToInclude = pins.filter(p =>
    filteredChildIds.includes(p.id) && !directlyFilteredPins.some(fp => fp.id === p.id)
  )

  // Combine: filtered pins + their parents (if not already included)
  const filteredPins = [...directlyFilteredPins, ...parentPinsToInclude]

  // For grouping, we need to filter children within their parents too
  const groupedPins = groupPinsByLocation(filteredPins, activeFilter !== 'all' || searchQuery ? filterPin : null)
  const continents = Object.keys(groupedPins)
  const totalPins = pins.length
  const filteredCount = filteredPins.length

  // Track if we're filtering
  const isFiltering = activeFilter !== 'all' || searchQuery.trim()
  const prevIsFiltering = useRef(false)

  // Auto-expand all sections when filtering becomes active
  useEffect(() => {
    if (isFiltering && !prevIsFiltering.current && continents.length > 0) {
      const newExpandedContinents = {}
      const newExpandedCountries = {}
      const newExpandedCities = {}

      continents.forEach(continent => {
        newExpandedContinents[continent] = true
        Object.entries(groupedPins[continent]).forEach(([country, countryPins]) => {
          newExpandedCountries[`${continent}-${country}`] = true
          countryPins.forEach(pin => {
            if (pin.children?.length > 0) {
              newExpandedCities[pin.id] = true
            }
          })
        })
      })

      setExpandedContinents(newExpandedContinents)
      setExpandedCountries(newExpandedCountries)
      setExpandedCities(newExpandedCities)
    }
    prevIsFiltering.current = isFiltering
  }, [isFiltering, continents.length])

  const toggleContinent = (continent) => {
    setExpandedContinents(prev => ({
      ...prev,
      [continent]: !prev[continent]
    }))
  }

  const toggleCountry = (continent, country) => {
    const key = `${continent}-${country}`
    setExpandedCountries(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const toggleCity = (pinId) => {
    setExpandedCities(prev => ({
      ...prev,
      [pinId]: !prev[pinId]
    }))
  }

  const countPinsInContinent = (continent) => {
    return Object.values(groupedPins[continent]).reduce(
      (sum, countryPins) => sum + countryPins.length, 0
    )
  }

  const openPinDetails = async (pin) => {
    setDetailsPin(pin)
    setEditingNotes(pin.notes || '')
    setShowDeleteConfirm(false)
    setSelectedTripForPin('')
    setSelectedDayForPin('')

    // Load pin's trip associations
    const tripAssocs = await getPinTrips(pin.id)
    setPinTrips(tripAssocs)
  }

  const closePinDetails = () => {
    setDetailsPin(null)
    setEditingNotes('')
    setShowDeleteConfirm(false)
    setPinTrips([])
    setSelectedTripForPin('')
    setSelectedDayForPin('')
  }

  const handleSaveNotes = () => {
    if (detailsPin) {
      onUpdateNotes?.(detailsPin.id, editingNotes)
      // Update local state to reflect the change
      setDetailsPin(prev => prev ? { ...prev, notes: editingNotes } : null)
    }
  }

  const handleVisitedDateChange = (date) => {
    if (detailsPin) {
      onUpdateVisitedDate?.(detailsPin.id, date || null)
      setDetailsPin(prev => prev ? { ...prev, visited_date: date } : null)
    }
  }

  const handleDelete = () => {
    if (detailsPin) {
      onDeletePin?.(detailsPin.id)
      closePinDetails()
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const handleAddToTrip = async () => {
    if (!detailsPin || !selectedTripForPin) return

    const dayNum = selectedDayForPin ? parseInt(selectedDayForPin) : null
    const success = await addPinToTrip(detailsPin.id, selectedTripForPin, dayNum)

    if (success) {
      const tripAssocs = await getPinTrips(detailsPin.id)
      setPinTrips(tripAssocs)
      setSelectedTripForPin('')
      setSelectedDayForPin('')
    }
  }

  const handleRemoveFromTrip = async (tripId) => {
    if (!detailsPin) return

    const success = await removePinFromTrip(detailsPin.id, tripId)
    if (success) {
      setPinTrips(prev => prev.filter(t => t.trip_id !== tripId))
    }
  }

  const handleUpdateDay = async (tripId, dayNumber) => {
    if (!detailsPin) return

    await assignPinToDay(tripId, detailsPin.id, dayNumber ? parseInt(dayNumber) : null)
    setPinTrips(prev => prev.map(t =>
      t.trip_id === tripId ? { ...t, day_number: dayNumber ? parseInt(dayNumber) : null } : t
    ))
  }

  const getAvailableTrips = () => {
    const assignedTripIds = pinTrips.map(pt => pt.trip_id)
    return trips.filter(t => !assignedTripIds.includes(t.id))
  }

  return (
    <>
      <button
        className={`pin-list-toggle ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
        aria-label={isOpen ? 'Close pin list' : 'Open pin list'}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
        <span className="toggle-label">My Pins ({totalPins})</span>
      </button>

      <aside className={`pin-list ${isOpen ? 'open' : ''}`}>
        <div className="pin-list-header">
          <h2>My Pins</h2>
          <div className="header-actions">
            <button
              className="btn-trips"
              onClick={() => setShowTrips(true)}
              title="Manage trips"
            >
              ✈️ <span>Trips</span>
            </button>
            <span className="pin-count">{totalPins} pins</span>
          </div>
        </div>

        {showTrips && (
          <TripsPanel
            isOpen={showTrips}
            onClose={() => setShowTrips(false)}
            onSelectTrip={(id) => {
              setSelectedTripId(id)
              setShowTrips(false)
            }}
            onViewItinerary={(trip) => {
              setShowTrips(false)
              onViewItinerary?.(trip)
            }}
            selectedTripId={selectedTripId}
          />
        )}

        <div className="pin-list-search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search pins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="pin-list-filters">
          {FILTERS.map(filter => (
            <button
              key={filter.id}
              className={`filter-btn ${activeFilter === filter.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter.id)}
            >
              <span className="filter-icon">{filter.icon}</span>
              <span className="filter-label">{filter.label}</span>
            </button>
          ))}
        </div>

        {(activeFilter !== 'all' || searchQuery) && (
          <div className="filter-status">
            Showing {filteredCount} of {totalPins} pins
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        )}

        <div className="pin-list-content">
          {continents.length === 0 ? (
            <p className="no-pins">No pins saved yet. Add your first pin!</p>
          ) : (
            continents.map(continent => (
              <div key={continent} className="continent-group">
                <button
                  className="continent-header"
                  onClick={() => toggleContinent(continent)}
                >
                  <span className={`expand-icon ${expandedContinents[continent] ? 'expanded' : ''}`}>
                    ▶
                  </span>
                  <span className="continent-name">{continent}</span>
                  <span className="continent-count">{countPinsInContinent(continent)}</span>
                </button>

                {expandedContinents[continent] && (
                  <div className="countries">
                    {Object.entries(groupedPins[continent]).map(([country, countryPins]) => (
                      <div key={country} className="country-group">
                        <button
                          className="country-header"
                          onClick={() => toggleCountry(continent, country)}
                        >
                          <span className={`expand-icon ${expandedCountries[`${continent}-${country}`] ? 'expanded' : ''}`}>
                            ▶
                          </span>
                          <span className="country-name">{country}</span>
                          <span className="country-count">{countryPins.length}</span>
                        </button>

                        {expandedCountries[`${continent}-${country}`] && (
                          <div className="pins">
                            {countryPins.map(pin => (
                              <div key={pin.id} className="city-group">
                                <div className={`pin-item ${pin.is_visited ? 'visited' : ''} ${pin.children?.length > 0 ? 'has-children' : ''}`}>
                                  {pin.children?.length > 0 && (
                                    <button
                                      className="city-expand-btn"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        toggleCity(pin.id)
                                      }}
                                    >
                                      <span className={`expand-icon ${expandedCities[pin.id] ? 'expanded' : ''}`}>
                                        ▶
                                      </span>
                                    </button>
                                  )}
                                  <button
                                    className="pin-main"
                                    onClick={() => openPinDetails(pin)}
                                  >
                                    <SourceIcon type={pin.source_type} size={18} />
                                    <div className="pin-info">
                                      <span className="pin-title">{pin.title}</span>
                                      {pin.children?.length > 0 && (
                                        <span className="pin-children-count">{pin.children.length} sights</span>
                                      )}
                                    </div>
                                  </button>
                                  <div className="pin-actions">
                                    <button
                                      className={`pin-action-btn favorite ${pin.is_favorite ? 'active' : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onToggleFavorite?.(pin.id)
                                      }}
                                      title={pin.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                                    >
                                      {pin.is_favorite ? '★' : '☆'}
                                    </button>
                                    <button
                                      className={`pin-action-btn visited ${pin.is_visited ? 'active' : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onToggleVisited?.(pin.id)
                                      }}
                                      title={pin.is_visited ? 'Mark as not visited' : 'Mark as visited'}
                                    >
                                      {pin.is_visited ? '✓' : '○'}
                                    </button>
                                  </div>
                                </div>
                                {pin.children?.length > 0 && expandedCities[pin.id] && (
                                  <div className="sight-list">
                                    {pin.children.map(sight => (
                                      <div key={sight.id} className={`pin-item sight-item ${sight.is_visited ? 'visited' : ''}`}>
                                        <button
                                          className="pin-main"
                                          onClick={() => openPinDetails(sight)}
                                        >
                                          <span className="sight-icon">{getCategoryIcon(sight.category)}</span>
                                          <div className="pin-info">
                                            <span className="pin-title">{sight.title || sight.location_name}</span>
                                          </div>
                                        </button>
                                        <div className="pin-actions">
                                          <button
                                            className={`pin-action-btn favorite ${sight.is_favorite ? 'active' : ''}`}
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              onToggleFavorite?.(sight.id)
                                            }}
                                            title={sight.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                                          >
                                            {sight.is_favorite ? '★' : '☆'}
                                          </button>
                                          <button
                                            className={`pin-action-btn visited ${sight.is_visited ? 'active' : ''}`}
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              onToggleVisited?.(sight.id)
                                            }}
                                            title={sight.is_visited ? 'Mark as not visited' : 'Mark as visited'}
                                          >
                                            {sight.is_visited ? '✓' : '○'}
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Pin Details Panel */}
      {detailsPin && (
        <div className="pin-details-overlay" onClick={closePinDetails}>
          <div className="pin-details-panel" onClick={(e) => e.stopPropagation()}>
            <div className="pin-details-header">
              <h3>{detailsPin.title || detailsPin.location_name}</h3>
              <button className="close-btn" onClick={closePinDetails}>×</button>
            </div>

            <div className="pin-details-content">
              <div className="detail-row">
                <span className="detail-label">Location</span>
                <span className="detail-value">{detailsPin.location_name}</span>
              </div>

              {detailsPin.url && (
                <div className="detail-row">
                  <span className="detail-label">Source</span>
                  <a href={detailsPin.url} target="_blank" rel="noopener noreferrer" className="detail-link">
                    View original →
                  </a>
                </div>
              )}

              <div className="detail-section">
                <label className="detail-label">Category</label>
                <div className="category-select">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      className={`category-chip ${detailsPin.category === cat.value ? 'active' : ''}`}
                      onClick={() => {
                        onUpdateCategory?.(detailsPin.id, cat.value)
                        setDetailsPin(prev => prev ? { ...prev, category: cat.value } : null)
                      }}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="detail-section">
                <label className="detail-label">Status</label>
                <div className="status-toggles">
                  <button
                    className={`status-btn ${detailsPin.is_visited ? 'active visited' : ''}`}
                    onClick={() => {
                      onToggleVisited?.(detailsPin.id)
                      setDetailsPin(prev => prev ? { ...prev, is_visited: !prev.is_visited } : null)
                    }}
                  >
                    {detailsPin.is_visited ? '✓ Visited' : '○ Not Visited'}
                  </button>
                  <button
                    className={`status-btn ${detailsPin.is_favorite ? 'active favorite' : ''}`}
                    onClick={() => {
                      onToggleFavorite?.(detailsPin.id)
                      setDetailsPin(prev => prev ? { ...prev, is_favorite: !prev.is_favorite } : null)
                    }}
                  >
                    {detailsPin.is_favorite ? '★ Favorite' : '☆ Not Favorite'}
                  </button>
                </div>
              </div>

              <div className="detail-section">
                <label className="detail-label">Visit Date</label>
                <input
                  type="date"
                  className="visit-date-input"
                  value={detailsPin.visited_date || ''}
                  onChange={(e) => handleVisitedDateChange(e.target.value)}
                />
                {detailsPin.visited_date && (
                  <span className="date-display">{formatDate(detailsPin.visited_date)}</span>
                )}
              </div>

              <div className="detail-section">
                <label className="detail-label">Notes</label>
                <textarea
                  className="notes-textarea"
                  placeholder="Add personal notes about this place..."
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  rows={4}
                />
                {editingNotes !== (detailsPin.notes || '') && (
                  <button className="save-notes-btn" onClick={handleSaveNotes}>
                    Save Notes
                  </button>
                )}
              </div>

              {detailsPin.tags?.length > 0 && (
                <div className="detail-section">
                  <span className="detail-label">Tags</span>
                  <div className="tags-list">
                    {detailsPin.tags.map((tag, i) => (
                      <span key={i} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Trip Assignment */}
              <div className="detail-section">
                <label className="detail-label">Trips</label>

                {/* Current trip assignments */}
                {pinTrips.length > 0 && (
                  <div className="assigned-trips">
                    {pinTrips.map(pt => {
                      const trip = trips.find(t => t.id === pt.trip_id)
                      if (!trip) return null
                      const duration = getTripDuration(trip)
                      return (
                        <div key={pt.trip_id} className="assigned-trip">
                          <span className="trip-badge" style={{ background: trip.color }}>
                            {trip.icon} {trip.name}
                          </span>
                          {duration > 0 && (
                            <select
                              className="day-select"
                              value={pt.day_number || ''}
                              onChange={(e) => handleUpdateDay(pt.trip_id, e.target.value)}
                            >
                              <option value="">Unassigned</option>
                              {Array.from({ length: duration }, (_, i) => (
                                <option key={i + 1} value={i + 1}>Day {i + 1}</option>
                              ))}
                            </select>
                          )}
                          <button
                            className="btn-remove-trip"
                            onClick={() => handleRemoveFromTrip(pt.trip_id)}
                            title="Remove from trip"
                          >
                            ×
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add to trip */}
                {getAvailableTrips().length > 0 && (
                  <div className="add-to-trip">
                    <select
                      className="trip-select"
                      value={selectedTripForPin}
                      onChange={(e) => {
                        setSelectedTripForPin(e.target.value)
                        setSelectedDayForPin('')
                      }}
                    >
                      <option value="">Add to trip...</option>
                      {getAvailableTrips().map(trip => (
                        <option key={trip.id} value={trip.id}>
                          {trip.icon} {trip.name}
                        </option>
                      ))}
                    </select>

                    {selectedTripForPin && (() => {
                      const trip = trips.find(t => t.id === selectedTripForPin)
                      const duration = trip ? getTripDuration(trip) : 0
                      return duration > 0 ? (
                        <select
                          className="day-select"
                          value={selectedDayForPin}
                          onChange={(e) => setSelectedDayForPin(e.target.value)}
                        >
                          <option value="">Unassigned</option>
                          {Array.from({ length: duration }, (_, i) => (
                            <option key={i + 1} value={i + 1}>Day {i + 1}</option>
                          ))}
                        </select>
                      ) : null
                    })()}

                    {selectedTripForPin && (
                      <button className="btn-add-trip" onClick={handleAddToTrip}>
                        Add
                      </button>
                    )}
                  </div>
                )}

                {getAvailableTrips().length === 0 && pinTrips.length === 0 && (
                  <p className="no-trips-hint">No trips created yet</p>
                )}
              </div>
            </div>

            <div className="pin-details-actions">
              <button
                className="action-btn view-on-map"
                onClick={() => {
                  onPinClick(detailsPin)
                  closePinDetails()
                }}
              >
                📍 View on Map
              </button>
              {!showDeleteConfirm ? (
                <button
                  className="action-btn delete"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  🗑️ Delete
                </button>
              ) : (
                <div className="delete-confirm-group">
                  <span className="delete-confirm-text">Delete this pin?</span>
                  <button
                    className="action-btn delete confirm"
                    onClick={handleDelete}
                  >
                    Yes, Delete
                  </button>
                  <button
                    className="action-btn cancel-delete"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default PinList
