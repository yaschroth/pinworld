import { useState } from 'react'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

export function useGeocoding() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const geocode = async (locationName) => {
    if (!locationName.trim()) {
      setError('Please enter a location')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        q: locationName,
        format: 'json',
        limit: '1'
      })

      const response = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: {
          'User-Agent': 'PinWorld App'
        }
      })

      if (!response.ok) {
        throw new Error('Geocoding request failed')
      }

      const data = await response.json()

      if (data.length === 0) {
        setError('Location not found')
        return null
      }

      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name
      }
    } catch (err) {
      setError(err.message || 'Failed to geocode location')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { geocode, isLoading, error }
}
