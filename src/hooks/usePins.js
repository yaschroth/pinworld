import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function usePins() {
  const [pins, setPins] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch all pins on mount
  useEffect(() => {
    fetchPins()
  }, [])

  const fetchPins = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('pins')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setPins(data || [])
    } catch (err) {
      setError(err.message || 'Failed to fetch pins')
    } finally {
      setIsLoading(false)
    }
  }

  const addPin = async (pinData) => {
    setIsSaving(true)
    setError(null)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Please sign in to add pins')
      }

      // Clean URL to prevent doubling
      let cleanUrl = pinData.url || null
      if (cleanUrl && (cleanUrl.includes('/https://') || cleanUrl.includes('/http://'))) {
        cleanUrl = cleanUrl.substring(0, cleanUrl.length / 2)
      }

      const newPin = {
        user_id: user.id,
        title: pinData.title,
        url: cleanUrl,
        location_name: pinData.location,
        latitude: pinData.lat,
        longitude: pinData.lng,
        source_type: pinData.sourceType,
        category: pinData.category || 'general',
        tags: pinData.tags || [],
        is_favorite: false,
        is_visited: false,
        country: pinData.country || null,
        continent: pinData.continent || null,
        location_type: pinData.locationType || 'city',
        parent_id: pinData.parentId || null
      }

      const { data, error: insertError } = await supabase
        .from('pins')
        .insert([newPin])
        .select()
        .single()

      if (insertError) throw insertError

      setPins(prev => [data, ...prev])
      return data
    } catch (err) {
      setError(err.message || 'Failed to save pin')
      return null
    } finally {
      setIsSaving(false)
    }
  }

  const deletePin = async (pinId) => {
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('pins')
        .delete()
        .eq('id', pinId)

      if (deleteError) throw deleteError

      setPins(prev => prev.filter(pin => pin.id !== pinId))
      return true
    } catch (err) {
      setError(err.message || 'Failed to delete pin')
      return false
    }
  }

  const toggleFavorite = async (pinId) => {
    const pin = pins.find(p => p.id === pinId)
    if (!pin) return false

    const newValue = !pin.is_favorite

    // Optimistic update
    setPins(prev => prev.map(p =>
      p.id === pinId ? { ...p, is_favorite: newValue } : p
    ))

    try {
      const { error: updateError } = await supabase
        .from('pins')
        .update({ is_favorite: newValue })
        .eq('id', pinId)

      if (updateError) throw updateError
      return true
    } catch (err) {
      // Revert on error
      setPins(prev => prev.map(p =>
        p.id === pinId ? { ...p, is_favorite: !newValue } : p
      ))
      setError(err.message || 'Failed to update favorite')
      return false
    }
  }

  const toggleVisited = async (pinId) => {
    const pin = pins.find(p => p.id === pinId)
    if (!pin) return false

    const newValue = !pin.is_visited

    // Optimistic update
    setPins(prev => prev.map(p =>
      p.id === pinId ? { ...p, is_visited: newValue } : p
    ))

    try {
      const { error: updateError } = await supabase
        .from('pins')
        .update({ is_visited: newValue })
        .eq('id', pinId)

      if (updateError) throw updateError
      return true
    } catch (err) {
      // Revert on error
      setPins(prev => prev.map(p =>
        p.id === pinId ? { ...p, is_visited: !newValue } : p
      ))
      setError(err.message || 'Failed to update visited status')
      return false
    }
  }

  const updateTags = async (pinId, tags) => {
    // Optimistic update
    const oldPin = pins.find(p => p.id === pinId)
    setPins(prev => prev.map(p =>
      p.id === pinId ? { ...p, tags } : p
    ))

    try {
      const { error: updateError } = await supabase
        .from('pins')
        .update({ tags })
        .eq('id', pinId)

      if (updateError) throw updateError
      return true
    } catch (err) {
      // Revert on error
      if (oldPin) {
        setPins(prev => prev.map(p =>
          p.id === pinId ? { ...p, tags: oldPin.tags } : p
        ))
      }
      setError(err.message || 'Failed to update tags')
      return false
    }
  }

  const updateCategory = async (pinId, category) => {
    // Optimistic update
    const oldPin = pins.find(p => p.id === pinId)
    setPins(prev => prev.map(p =>
      p.id === pinId ? { ...p, category } : p
    ))

    try {
      const { error: updateError } = await supabase
        .from('pins')
        .update({ category })
        .eq('id', pinId)

      if (updateError) throw updateError
      return true
    } catch (err) {
      // Revert on error
      if (oldPin) {
        setPins(prev => prev.map(p =>
          p.id === pinId ? { ...p, category: oldPin.category } : p
        ))
      }
      setError(err.message || 'Failed to update category')
      return false
    }
  }

  const updateNotes = async (pinId, notes) => {
    // Optimistic update
    const oldPin = pins.find(p => p.id === pinId)
    setPins(prev => prev.map(p =>
      p.id === pinId ? { ...p, notes } : p
    ))

    try {
      const { error: updateError } = await supabase
        .from('pins')
        .update({ notes })
        .eq('id', pinId)

      if (updateError) throw updateError
      return true
    } catch (err) {
      // Revert on error
      if (oldPin) {
        setPins(prev => prev.map(p =>
          p.id === pinId ? { ...p, notes: oldPin.notes } : p
        ))
      }
      setError(err.message || 'Failed to update notes')
      return false
    }
  }

  const updateVisitedDate = async (pinId, visitedDate) => {
    // Optimistic update
    const oldPin = pins.find(p => p.id === pinId)
    setPins(prev => prev.map(p =>
      p.id === pinId ? { ...p, visited_date: visitedDate } : p
    ))

    try {
      const { error: updateError } = await supabase
        .from('pins')
        .update({ visited_date: visitedDate })
        .eq('id', pinId)

      if (updateError) throw updateError
      return true
    } catch (err) {
      // Revert on error
      if (oldPin) {
        setPins(prev => prev.map(p =>
          p.id === pinId ? { ...p, visited_date: oldPin.visited_date } : p
        ))
      }
      setError(err.message || 'Failed to update visited date')
      return false
    }
  }

  const clearError = () => setError(null)

  return {
    pins,
    isLoading,
    isSaving,
    error,
    addPin,
    deletePin,
    toggleFavorite,
    toggleVisited,
    updateTags,
    updateCategory,
    updateNotes,
    updateVisitedDate,
    refetch: fetchPins,
    clearError
  }
}
