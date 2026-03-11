import { useState, useEffect } from 'react'
import { useTrips } from '../hooks/useTrips'
import './TripItineraryView.css'

function TripItineraryView({ trip, onClose, onPinClick }) {
  const { getTripItinerary, assignPinToDay, reorderPinsInDay, formatDateRange, getTripDuration } = useTrips()

  const [itinerary, setItinerary] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [draggedPin, setDraggedPin] = useState(null)
  const [dragOverDay, setDragOverDay] = useState(null)

  const duration = getTripDuration(trip)
  const days = Array.from({ length: duration }, (_, i) => i + 1)

  useEffect(() => {
    loadItinerary()
  }, [trip.id])

  const loadItinerary = async () => {
    setIsLoading(true)
    const data = await getTripItinerary(trip.id)
    setItinerary(data)
    setIsLoading(false)
  }

  const handleDragStart = (e, pin, fromDay) => {
    setDraggedPin({ ...pin, fromDay })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, day) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDay(day)
  }

  const handleDragLeave = () => {
    setDragOverDay(null)
  }

  const handleDrop = async (e, toDay) => {
    e.preventDefault()
    setDragOverDay(null)

    if (!draggedPin) return

    const fromDay = draggedPin.fromDay
    const targetDay = toDay === 'unassigned' ? null : toDay

    if (fromDay === targetDay || (fromDay === 'unassigned' && targetDay === null)) {
      setDraggedPin(null)
      return
    }

    // Optimistically update UI
    setItinerary(prev => {
      const updated = { ...prev }

      // Remove from old day
      const oldDayKey = fromDay === null ? 'unassigned' : fromDay
      if (updated[oldDayKey]) {
        updated[oldDayKey] = updated[oldDayKey].filter(p => p.id !== draggedPin.id)
        if (updated[oldDayKey].length === 0) delete updated[oldDayKey]
      }

      // Add to new day
      const newDayKey = targetDay === null ? 'unassigned' : targetDay
      if (!updated[newDayKey]) updated[newDayKey] = []
      updated[newDayKey].push({ ...draggedPin, dayNumber: targetDay })

      return updated
    })

    // Persist to database
    await assignPinToDay(trip.id, draggedPin.id, targetDay)
    setDraggedPin(null)
  }

  const getDayDate = (dayNumber) => {
    if (!trip.start_date) return null
    const date = new Date(trip.start_date)
    date.setDate(date.getDate() + dayNumber - 1)
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const getPinsForDay = (day) => {
    return itinerary[day] || []
  }

  if (!trip) return null

  return (
    <div className="trip-itinerary-view">
      <div className="itinerary-header">
        <div className="itinerary-title">
          <span className="trip-icon" style={{ background: trip.color }}>{trip.icon}</span>
          <div className="title-info">
            <h2>{trip.name}</h2>
            <span className="trip-dates">{formatDateRange(trip.start_date, trip.end_date)}</span>
          </div>
        </div>
        <button className="btn-close-itinerary" onClick={onClose}>×</button>
      </div>

      <div className="itinerary-content">
        {isLoading ? (
          <div className="itinerary-loading">Loading itinerary...</div>
        ) : (
          <div className="days-container">
            {/* Day columns */}
            {days.map(day => (
              <div
                key={day}
                className={`day-column ${dragOverDay === day ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, day)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, day)}
              >
                <div className="day-header">
                  <span className="day-number">Day {day}</span>
                  <span className="day-date">{getDayDate(day)}</span>
                </div>
                <div className="day-pins">
                  {getPinsForDay(day).map(pin => (
                    <div
                      key={pin.id}
                      className="itinerary-pin"
                      draggable
                      onDragStart={(e) => handleDragStart(e, pin, day)}
                      onClick={() => onPinClick?.(pin)}
                    >
                      <span className="drag-handle" title="Drag to reorder">⋮⋮</span>
                      <span className="pin-icon">📍</span>
                      <div className="pin-info">
                        <span className="pin-title">{pin.title}</span>
                        {pin.location_name && (
                          <span className="pin-location">{pin.location_name}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {getPinsForDay(day).length === 0 && (
                    <div className="empty-day">
                      <span className="empty-icon">📅</span>
                      <span>Drop pins here to schedule for Day {day}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Unassigned column */}
            <div
              className={`day-column unassigned ${dragOverDay === 'unassigned' ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, 'unassigned')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'unassigned')}
            >
              <div className="day-header">
                <span className="day-number">Unassigned</span>
                <span className="day-date">Not yet scheduled</span>
              </div>
              <div className="day-pins">
                {getPinsForDay('unassigned').map(pin => (
                  <div
                    key={pin.id}
                    className="itinerary-pin"
                    draggable
                    onDragStart={(e) => handleDragStart(e, pin, 'unassigned')}
                    onClick={() => onPinClick?.(pin)}
                  >
                    <span className="drag-handle" title="Drag to reorder">⋮⋮</span>
                    <span className="pin-icon">📍</span>
                    <div className="pin-info">
                      <span className="pin-title">{pin.title}</span>
                      {pin.location_name && (
                        <span className="pin-location">{pin.location_name}</span>
                      )}
                    </div>
                  </div>
                ))}
                {getPinsForDay('unassigned').length === 0 && (
                  <div className="empty-day">
                    <span className="empty-icon">✓</span>
                    <span>All pins scheduled!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {duration === 0 && (
        <div className="no-dates-message">
          <p>Set trip dates to organize pins by day.</p>
        </div>
      )}
    </div>
  )
}

export default TripItineraryView
