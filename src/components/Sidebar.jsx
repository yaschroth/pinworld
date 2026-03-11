import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocationExtractor } from '../hooks/useLocationExtractor'
import { useSubscription } from '../context/SubscriptionContext'
import { CATEGORIES, SOURCE_TYPES, getCategoryFromLocationType } from '../lib/constants'
import UsageDisplay from './UsageDisplay'
import UpgradePrompt from './UpgradePrompt'
import './Sidebar.css'

// Detect source type from URL
function detectSourceType(url) {
  if (!url) return 'Other'
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.includes('instagram.com')) return 'Instagram'
  if (lowerUrl.includes('tiktok.com') || lowerUrl.includes('vm.tiktok.com')) return 'TikTok'
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'YouTube'
  if (lowerUrl.includes('news') || lowerUrl.includes('bbc.') || lowerUrl.includes('cnn.') ||
      lowerUrl.includes('reuters.') || lowerUrl.includes('nytimes.')) return 'News'
  return 'Other'
}

function Sidebar({ onSubmit, isLoading, error }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    location: '',
    sourceType: 'Other',
    category: 'general',
    tags: []
  })
  const [tagInput, setTagInput] = useState('')
  const [locationDetected, setLocationDetected] = useState(false)
  const [titleDetected, setTitleDetected] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [locationOptions, setLocationOptions] = useState([])
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [selectedLocations, setSelectedLocations] = useState([])

  const { extractLocation, isExtracting, extractedData, clearExtractedData } = useLocationExtractor()
  const { refetch: refetchSubscription } = useSubscription()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear detected status if user manually edits
    if (name === 'location') setLocationDetected(false)
    if (name === 'title') setTitleDetected(false)
  }

  const runExtraction = async (url, description) => {
    setLocationOptions([])
    setShowLocationPicker(false)
    setSelectedLocations([])

    const result = await extractLocation(url, description)
    if (result) {
      // Check if limit was reached
      if (result.limitReached) {
        setShowUpgradePrompt(true)
        refetchSubscription()
        return
      }

      const updates = {}

      // Handle multiple locations
      if (result.locations && result.locations.length > 1) {
        setLocationOptions(result.locations)
        setShowLocationPicker(true)
        // Auto-select all locations
        setSelectedLocations(result.locations.map((_, i) => i))
        updates.location = result.locations[0].name
        setLocationDetected(true)
      } else if (result.locations && result.locations.length === 1) {
        updates.location = result.locations[0].name
        setLocationDetected(true)
      } else if (result.location_name) {
        updates.location = result.location_name
        setLocationDetected(true)
      }

      if (result.title && !formData.title) {
        updates.title = result.title
        setTitleDetected(true)
      }

      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }))
        refetchSubscription()
      }
    }
  }

  const toggleLocationSelection = (index) => {
    setSelectedLocations(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index)
      } else {
        return [...prev, index]
      }
    })
    // Update form location to show first selected
    const newSelected = selectedLocations.includes(index)
      ? selectedLocations.filter(i => i !== index)
      : [...selectedLocations, index]
    if (newSelected.length > 0) {
      const firstSelectedIdx = Math.min(...newSelected)
      setFormData(prev => ({ ...prev, location: locationOptions[firstSelectedIdx].name }))
    }
  }

  const selectAllLocations = () => {
    setSelectedLocations(locationOptions.map((_, i) => i))
    setFormData(prev => ({ ...prev, location: locationOptions[0].name }))
  }

  const deselectAllLocations = () => {
    setSelectedLocations([])
  }

  const handleUpgradeClick = () => {
    navigate('/pricing')
  }

  const handleUrlPaste = async (e) => {
    const pastedText = e.clipboardData?.getData('text') || ''

    // Clean up duplicated URLs (common copy-paste issue)
    const cleanUrl = pastedText.split('http').filter(Boolean)[0]
    const finalUrl = cleanUrl ? 'http' + cleanUrl : pastedText

    setFormData(prev => ({
      ...prev,
      url: finalUrl,
      sourceType: detectSourceType(finalUrl)
    }))

    if (finalUrl && finalUrl.startsWith('http')) {
      await runExtraction(finalUrl, formData.description)
    }
  }

  const handleUrlChange = (e) => {
    const { value } = e.target
    setFormData(prev => ({
      ...prev,
      url: value,
      sourceType: detectSourceType(value)
    }))
  }

  const handleDescriptionBlur = async () => {
    // Re-run extraction when description is added/changed
    if (formData.description && formData.url) {
      await runExtraction(formData.url, formData.description)
    } else if (formData.description && !formData.url) {
      // Extract from description only
      await runExtraction(null, formData.description)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Include continent and country from extracted data
    const baseData = {
      ...formData,
      continent: extractedData?.continent || null,
      country: extractedData?.country || null
    }

    // If multiple locations are selected, submit each one
    if (selectedLocations.length > 1) {
      for (const idx of selectedLocations) {
        const loc = locationOptions[idx]
        const locType = loc.type || 'city'
        await onSubmit({
          ...baseData,
          location: loc.name,
          locationType: locType,
          // Auto-set category based on location type if user hasn't changed it
          category: formData.category === 'general' ? getCategoryFromLocationType(locType) : formData.category,
          // Append location type to tags if available
          tags: loc.type && loc.type !== 'other'
            ? [...formData.tags.filter(t => t !== loc.type), loc.type].slice(0, 5)
            : formData.tags
        })
      }
    } else {
      const locType = locationOptions[0]?.type || 'city'
      onSubmit({
        ...baseData,
        locationType: locType,
        // Auto-set category based on location type if user hasn't changed it
        category: formData.category === 'general' ? getCategoryFromLocationType(locType) : formData.category
      })
    }

    setLocationDetected(false)
    setTitleDetected(false)
    setLocationOptions([])
    setShowLocationPicker(false)
    setSelectedLocations([])
    clearExtractedData()
  }

  const handleClear = () => {
    setFormData({
      title: '',
      url: '',
      description: '',
      location: '',
      sourceType: 'Other',
      category: 'general',
      tags: []
    })
    setTagInput('')
    setLocationDetected(false)
    setTitleDetected(false)
    setShowDescription(false)
    setLocationOptions([])
    setShowLocationPicker(false)
    setSelectedLocations([])
    clearExtractedData()
  }

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    }
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 5) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }))
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Add Pin</h2>
      </div>

      <form onSubmit={handleSubmit} className="sidebar-form">
        <UsageDisplay onUpgradeClick={handleUpgradeClick} />
        <div className="form-group">
          <label htmlFor="title">
            Title
            {titleDetected && !isExtracting && (
              <span className="detected-badge">Auto-filled</span>
            )}
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter a title"
            required
            className={titleDetected ? 'location-detected' : ''}
          />
        </div>

        <div className="form-group">
          <label htmlFor="url">URL (Link)</label>
          <div className="url-input-row">
            <input
              type="url"
              id="url"
              name="url"
              value={formData.url}
              onChange={handleUrlChange}
              onPaste={handleUrlPaste}
              placeholder="Paste URL to auto-detect location"
            />
            <button
              type="button"
              className="btn-extract"
              onClick={() => runExtraction(formData.url, formData.description)}
              disabled={isExtracting || !formData.url}
            >
              {isExtracting ? '...' : 'Extract'}
            </button>
          </div>
        </div>

        {!showDescription ? (
          <button
            type="button"
            className="btn-add-description"
            onClick={() => setShowDescription(true)}
          >
            + Add caption/description (optional)
          </button>
        ) : (
          <div className="form-group">
            <label htmlFor="description">
              Caption / Description
              <span className="optional-label">(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              onBlur={handleDescriptionBlur}
              placeholder="Paste the Instagram caption or post description here for better location detection"
              rows={3}
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="location">
            Location
            {isExtracting && (
              <span className="detecting-badge">
                <span className="detecting-spinner"></span>
                Detecting…
              </span>
            )}
            {locationDetected && !isExtracting && extractedData && (
              <span className="detected-badge" title={`Confidence: ${extractedData.confidence || 'high'}`}>
                Auto-detected
              </span>
            )}
            {locationOptions.length > 1 && (
              <span className="multi-location-badge">
                {locationOptions.length} found
              </span>
            )}
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder={isExtracting ? 'Detecting...' : 'City, Country'}
            required
            disabled={isExtracting}
            className={locationDetected ? 'location-detected' : ''}
          />
          {showLocationPicker && locationOptions.length > 1 && (
            <div className="location-picker">
              <div className="location-picker-header">
                <span className="location-picker-label">
                  {locationOptions.length} locations found - select which to save:
                </span>
                <div className="location-picker-actions">
                  <button type="button" className="btn-select-all" onClick={selectAllLocations}>
                    All
                  </button>
                  <button type="button" className="btn-select-none" onClick={deselectAllLocations}>
                    None
                  </button>
                </div>
              </div>
              <div className="location-options">
                {locationOptions.map((loc, index) => (
                  <label
                    key={index}
                    className={`location-option ${selectedLocations.includes(index) ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes(index)}
                      onChange={() => toggleLocationSelection(index)}
                      className="location-checkbox"
                    />
                    <span className="location-option-name">{loc.name}</span>
                    {loc.type && loc.type !== 'other' && (
                      <span className="location-option-type">{loc.type}</span>
                    )}
                  </label>
                ))}
              </div>
              <div className="location-picker-footer">
                {selectedLocations.length} location{selectedLocations.length !== 1 ? 's' : ''} selected
              </div>
            </div>
          )}
          {locationDetected && !showLocationPicker && (
            <span className="location-hint">Edit if needed.</span>
          )}
        </div>

        <div className="form-row">
          <div className="form-group form-group-half">
            <label htmlFor="sourceType">Source</label>
            <select
              id="sourceType"
              name="sourceType"
              value={formData.sourceType}
              onChange={handleChange}
            >
              {SOURCE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="form-group form-group-half">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="tags">
            Tags
            <span className="optional-label">(optional, max 5)</span>
          </label>
          <div className="tags-input-container">
            {formData.tags.map(tag => (
              <span key={tag} className="tag">
                {tag}
                <button
                  type="button"
                  className="tag-remove"
                  onClick={() => removeTag(tag)}
                >
                  ×
                </button>
              </span>
            ))}
            {formData.tags.length < 5 && (
              <input
                type="text"
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                onBlur={addTag}
                placeholder={formData.tags.length === 0 ? "Add tags..." : ""}
                className="tag-input"
              />
            )}
          </div>
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="btn-submit" disabled={isLoading || isExtracting || (showLocationPicker && selectedLocations.length === 0)}>
            {isLoading ? 'Adding...' : selectedLocations.length > 1 ? `Add ${selectedLocations.length} Pins` : 'Add Pin'}
          </button>
          <button type="button" className="btn-clear" onClick={handleClear}>
            Clear
          </button>
        </div>
      </form>

      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        onUpgrade={handleUpgradeClick}
      />
    </aside>
  )
}

export default Sidebar
