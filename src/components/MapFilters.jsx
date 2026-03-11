import { useState } from 'react'
import { CATEGORIES } from '../lib/constants'
import './MapFilters.css'

function MapFilters({ selectedCategories, onCategoryChange }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const allSelected = selectedCategories.length === CATEGORIES.length
  const noneSelected = selectedCategories.length === 0

  const toggleCategory = (categoryValue) => {
    if (selectedCategories.includes(categoryValue)) {
      onCategoryChange(selectedCategories.filter(c => c !== categoryValue))
    } else {
      onCategoryChange([...selectedCategories, categoryValue])
    }
  }

  const selectAll = () => {
    onCategoryChange(CATEGORIES.map(c => c.value))
  }

  const clearAll = () => {
    onCategoryChange([])
  }

  return (
    <div className={`map-filters ${isExpanded ? 'expanded' : ''}`}>
      <button
        className="map-filters-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Filter by category"
      >
        <span className="filter-icon">🏷️</span>
        <span className="filter-text">Filter</span>
        {!allSelected && !noneSelected && (
          <span className="filter-badge">{selectedCategories.length}</span>
        )}
      </button>

      {isExpanded && (
        <div className="map-filters-dropdown">
          <div className="map-filters-header">
            <span>Filter by Category</span>
            <div className="map-filters-actions">
              <button onClick={selectAll} className="btn-filter-action">All</button>
              <button onClick={clearAll} className="btn-filter-action">None</button>
            </div>
          </div>
          <div className="map-filters-list">
            {CATEGORIES.map(cat => (
              <label
                key={cat.value}
                className={`map-filter-item ${selectedCategories.includes(cat.value) ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat.value)}
                  onChange={() => toggleCategory(cat.value)}
                />
                <span className="filter-item-icon">{cat.icon}</span>
                <span className="filter-item-label">{cat.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MapFilters
