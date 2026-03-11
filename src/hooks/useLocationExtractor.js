import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function useLocationExtractor() {
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractedData, setExtractedData] = useState(null)
  const [limitReached, setLimitReached] = useState(false)

  const extractLocation = async (url, description) => {
    // Need at least a valid URL or description
    const hasValidUrl = url && isValidUrl(url)
    const hasDescription = description && description.trim().length > 0

    if (!hasValidUrl && !hasDescription) {
      return null
    }

    setIsExtracting(true)
    setExtractedData(null)
    setLimitReached(false)

    try {
      const { data, error } = await supabase.functions.invoke('extract-location', {
        body: {
          url: hasValidUrl ? url : null,
          description: hasDescription ? description : null
        }
      })

      if (error) {
        console.error('Edge function error:', error)
        return null
      }

      // Check if limit was reached (429 response)
      if (data?.error === 'extraction_limit_reached') {
        setLimitReached(true)
        return { limitReached: true, ...data }
      }

      // Return data if we got locations or title
      const hasLocations = data?.locations?.length > 0
      const hasLegacyLocation = data?.location_name
      const hasTitle = data?.title

      if (data && (hasLocations || hasLegacyLocation || hasTitle)) {
        // Normalize data to always have locations array
        if (!data.locations && data.location_name) {
          data.locations = [{ name: data.location_name, type: 'other', confidence: data.confidence || 'medium' }]
        }
        setExtractedData(data)
        return data
      }

      return null
    } catch (error) {
      console.error('Location extraction error:', error)
      return null
    } finally {
      setIsExtracting(false)
    }
  }

  const clearExtractedData = () => {
    setExtractedData(null)
    setLimitReached(false)
  }

  // Backward compatibility
  const extractedLocation = extractedData

  return {
    extractLocation,
    isExtracting,
    extractedData,
    extractedLocation, // backward compatibility
    limitReached,
    clearExtractedData,
    clearExtractedLocation: clearExtractedData // backward compatibility
  }
}

function isValidUrl(string) {
  try {
    new URL(string)
    return true
  } catch {
    return false
  }
}
