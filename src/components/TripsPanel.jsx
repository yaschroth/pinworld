import { useState } from 'react'
import { useTrips } from '../hooks/useTrips'
import './TripsPanel.css'

function TripsPanel({ isOpen, onClose, onSelectTrip, onViewItinerary, selectedTripId }) {
  const {
    trips,
    isLoading,
    createTrip,
    deleteTrip,
    getTripDuration,
    formatDateRange,
    TRIP_COLORS,
    TRIP_ICONS
  } = useTrips()

  const [isCreating, setIsCreating] = useState(false)
  const [newTrip, setNewTrip] = useState({
    name: '',
    description: '',
    color: TRIP_COLORS[0],
    icon: TRIP_ICONS[0],
    startDate: '',
    endDate: ''
  })

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newTrip.name.trim()) return

    const result = await createTrip(newTrip)
    if (result) {
      setNewTrip({
        name: '',
        description: '',
        color: TRIP_COLORS[0],
        icon: TRIP_ICONS[0],
        startDate: '',
        endDate: ''
      })
      setIsCreating(false)
    }
  }

  const handleDelete = async (e, tripId) => {
    e.stopPropagation()
    if (confirm('Delete this trip? Pins will not be deleted.')) {
      await deleteTrip(tripId)
    }
  }

  const handleViewItinerary = (e, trip) => {
    e.stopPropagation()
    onViewItinerary?.(trip)
  }

  if (!isOpen) return null

  return (
    <div className="trips-panel">
      <div className="trips-header">
        <h3>My Trips</h3>
        <button className="btn-close" onClick={onClose}>×</button>
      </div>

      <div className="trips-content">
        {/* Create New Trip */}
        {!isCreating ? (
          <button
            className="btn-new-trip"
            onClick={() => setIsCreating(true)}
          >
            <span className="plus-icon">+</span>
            Create New Trip
          </button>
        ) : (
          <form className="new-trip-form" onSubmit={handleCreate}>
            <div className="form-section">
              <label className="section-label">Icon</label>
              <div className="icon-picker">
                {TRIP_ICONS.slice(0, 5).map(icon => (
                  <button
                    key={icon}
                    type="button"
                    className={`icon-option ${newTrip.icon === icon ? 'active' : ''}`}
                    onClick={() => setNewTrip(prev => ({ ...prev, icon }))}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-section">
              <label className="section-label">Details</label>
              <input
                type="text"
                placeholder="Trip name"
                value={newTrip.name}
                onChange={(e) => setNewTrip(prev => ({ ...prev, name: e.target.value }))}
                autoFocus
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newTrip.description}
                onChange={(e) => setNewTrip(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="form-section">
              <label className="section-label">Dates</label>
              <div className="date-inputs">
                <div className="date-field">
                  <label>Start</label>
                  <input
                    type="date"
                    value={newTrip.startDate}
                    onChange={(e) => setNewTrip(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="date-field">
                  <label>End</label>
                  <input
                    type="date"
                    value={newTrip.endDate}
                    onChange={(e) => setNewTrip(prev => ({ ...prev, endDate: e.target.value }))}
                    min={newTrip.startDate}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <label className="section-label">Color</label>
              <div className="color-picker">
                {TRIP_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`color-option ${newTrip.color === color ? 'active' : ''}`}
                    style={{ background: color }}
                    onClick={() => setNewTrip(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-create">Create Trip</button>
              <button type="button" className="btn-cancel" onClick={() => setIsCreating(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* All Pins option */}
        <button
          className={`trip-item ${!selectedTripId ? 'active' : ''}`}
          onClick={() => onSelectTrip(null)}
        >
          <span className="trip-icon-badge">📍</span>
          <div className="trip-info">
            <span className="trip-name">All Pins</span>
            <span className="trip-meta">Show all pins</span>
          </div>
        </button>

        {/* Trip List */}
        {isLoading ? (
          <p className="loading-text">Loading trips...</p>
        ) : trips.length === 0 ? (
          <p className="empty-text">No trips yet. Create your first trip!</p>
        ) : (
          trips.map(trip => {
            const duration = getTripDuration(trip)
            return (
              <button
                key={trip.id}
                className={`trip-item ${selectedTripId === trip.id ? 'active' : ''}`}
                onClick={() => onSelectTrip(trip.id)}
              >
                <span
                  className="trip-icon-badge"
                  style={{ background: trip.color }}
                >
                  {trip.icon}
                </span>
                <div className="trip-info">
                  <span className="trip-name">{trip.name}</span>
                  <span className="trip-meta">
                    {trip.start_date ? formatDateRange(trip.start_date, trip.end_date) : 'No dates'}
                    {duration > 0 && ` · ${duration} days`}
                  </span>
                  <span className="trip-pins">
                    {trip.pinCount} {trip.pinCount === 1 ? 'pin' : 'pins'}
                  </span>
                </div>
                <div className="trip-actions">
                  {trip.start_date && (
                    <button
                      className="btn-view-itinerary"
                      onClick={(e) => handleViewItinerary(e, trip)}
                      title="View day-by-day itinerary"
                    >
                      📅 <span>Itinerary</span>
                    </button>
                  )}
                  <button
                    className="btn-delete-trip"
                    onClick={(e) => handleDelete(e, trip.id)}
                    title="Delete this trip"
                  >
                    🗑️
                  </button>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

export default TripsPanel
