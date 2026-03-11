import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const TRIP_COLORS = [
  '#3b9cea', '#e53935', '#43a047', '#8e24aa',
  '#00acc1', '#f4511e', '#5e35b1', '#fdd835'
]

export const TRIP_ICONS = [
  '✈️', '🏖️', '🏔️', '🌆', '🗺️', '🧳', '🚗', '⛵', '🏕️', '🎒'
]

export function useTrips() {
  const [trips, setTrips] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTrips()
  }, [])

  const fetchTrips = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('trips')
        .select(`
          *,
          trip_pins (
            pin_id,
            day_number,
            order_in_day
          )
        `)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      // Add pin count to each trip
      const tripsWithCount = (data || []).map(trip => ({
        ...trip,
        pinCount: trip.trip_pins?.length || 0
      }))

      setTrips(tripsWithCount)
    } catch (err) {
      setError(err.message || 'Failed to fetch trips')
    } finally {
      setIsLoading(false)
    }
  }

  const createTrip = async ({ name, description, color, icon, startDate, endDate }) => {
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Please sign in')

      const { data, error: insertError } = await supabase
        .from('trips')
        .insert([{
          user_id: user.id,
          name,
          description: description || null,
          color: color || TRIP_COLORS[0],
          icon: icon || TRIP_ICONS[0],
          start_date: startDate || null,
          end_date: endDate || null
        }])
        .select()
        .single()

      if (insertError) throw insertError

      setTrips(prev => [{ ...data, pinCount: 0, trip_pins: [] }, ...prev])
      return data
    } catch (err) {
      setError(err.message || 'Failed to create trip')
      return null
    }
  }

  const updateTrip = async (tripId, updates) => {
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', tripId)

      if (updateError) throw updateError

      setTrips(prev => prev.map(trip =>
        trip.id === tripId ? { ...trip, ...updates } : trip
      ))
      return true
    } catch (err) {
      setError(err.message || 'Failed to update trip')
      return false
    }
  }

  const deleteTrip = async (tripId) => {
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId)

      if (deleteError) throw deleteError

      setTrips(prev => prev.filter(trip => trip.id !== tripId))
      return true
    } catch (err) {
      setError(err.message || 'Failed to delete trip')
      return false
    }
  }

  const addPinToTrip = async (pinId, tripId, dayNumber = null) => {
    setError(null)

    try {
      const { error: insertError } = await supabase
        .from('trip_pins')
        .insert([{
          pin_id: pinId,
          trip_id: tripId,
          day_number: dayNumber,
          order_in_day: 0
        }])

      if (insertError) throw insertError

      // Update local state
      setTrips(prev => prev.map(trip =>
        trip.id === tripId
          ? {
              ...trip,
              pinCount: (trip.pinCount || 0) + 1,
              trip_pins: [...(trip.trip_pins || []), { pin_id: pinId, day_number: dayNumber, order_in_day: 0 }]
            }
          : trip
      ))
      return true
    } catch (err) {
      // Ignore duplicate errors
      if (err.code === '23505') return true
      setError(err.message || 'Failed to add pin to trip')
      return false
    }
  }

  const removePinFromTrip = async (pinId, tripId) => {
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('trip_pins')
        .delete()
        .eq('pin_id', pinId)
        .eq('trip_id', tripId)

      if (deleteError) throw deleteError

      // Update local state
      setTrips(prev => prev.map(trip =>
        trip.id === tripId
          ? {
              ...trip,
              pinCount: Math.max((trip.pinCount || 1) - 1, 0),
              trip_pins: (trip.trip_pins || []).filter(tp => tp.pin_id !== pinId)
            }
          : trip
      ))
      return true
    } catch (err) {
      setError(err.message || 'Failed to remove pin from trip')
      return false
    }
  }

  const assignPinToDay = async (tripId, pinId, dayNumber) => {
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('trip_pins')
        .update({ day_number: dayNumber })
        .eq('trip_id', tripId)
        .eq('pin_id', pinId)

      if (updateError) throw updateError

      // Update local state
      setTrips(prev => prev.map(trip =>
        trip.id === tripId
          ? {
              ...trip,
              trip_pins: (trip.trip_pins || []).map(tp =>
                tp.pin_id === pinId ? { ...tp, day_number: dayNumber } : tp
              )
            }
          : trip
      ))
      return true
    } catch (err) {
      setError(err.message || 'Failed to assign pin to day')
      return false
    }
  }

  const reorderPinsInDay = async (tripId, dayNumber, pinOrders) => {
    setError(null)

    try {
      // Update each pin's order
      for (const { pinId, orderInDay } of pinOrders) {
        const { error } = await supabase
          .from('trip_pins')
          .update({ order_in_day: orderInDay })
          .eq('trip_id', tripId)
          .eq('pin_id', pinId)

        if (error) throw error
      }

      // Update local state
      setTrips(prev => prev.map(trip =>
        trip.id === tripId
          ? {
              ...trip,
              trip_pins: (trip.trip_pins || []).map(tp => {
                const order = pinOrders.find(po => po.pinId === tp.pin_id)
                return order ? { ...tp, order_in_day: order.orderInDay } : tp
              })
            }
          : trip
      ))
      return true
    } catch (err) {
      setError(err.message || 'Failed to reorder pins')
      return false
    }
  }

  const getTripItinerary = async (tripId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('trip_pins')
        .select(`
          *,
          pins (*)
        `)
        .eq('trip_id', tripId)
        .order('day_number', { ascending: true, nullsFirst: false })
        .order('order_in_day', { ascending: true })

      if (fetchError) throw fetchError

      // Group by day_number
      const grouped = {}
      for (const item of (data || [])) {
        const day = item.day_number ?? 'unassigned'
        if (!grouped[day]) grouped[day] = []
        grouped[day].push({
          ...item.pins,
          tripPinId: item.id,
          dayNumber: item.day_number,
          orderInDay: item.order_in_day
        })
      }

      return grouped
    } catch (err) {
      setError(err.message || 'Failed to get trip itinerary')
      return {}
    }
  }

  const getPinTrips = async (pinId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('trip_pins')
        .select('trip_id, day_number')
        .eq('pin_id', pinId)

      if (fetchError) throw fetchError

      return data || []
    } catch (err) {
      return []
    }
  }

  // Helper to calculate trip duration
  const getTripDuration = (trip) => {
    if (!trip.start_date || !trip.end_date) return 0
    const start = new Date(trip.start_date)
    const end = new Date(trip.end_date)
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
  }

  // Helper to format date range
  const formatDateRange = (startDate, endDate) => {
    if (!startDate) return 'No dates set'
    const start = new Date(startDate)
    const options = { month: 'short', day: 'numeric' }
    const startStr = start.toLocaleDateString('en-US', options)
    if (!endDate) return startStr
    const end = new Date(endDate)
    const endStr = end.toLocaleDateString('en-US', { ...options, year: 'numeric' })
    return `${startStr} - ${endStr}`
  }

  const clearError = () => setError(null)

  return {
    trips,
    isLoading,
    error,
    createTrip,
    updateTrip,
    deleteTrip,
    addPinToTrip,
    removePinFromTrip,
    assignPinToDay,
    reorderPinsInDay,
    getTripItinerary,
    getPinTrips,
    getTripDuration,
    formatDateRange,
    refetch: fetchTrips,
    clearError,
    TRIP_COLORS,
    TRIP_ICONS
  }
}
