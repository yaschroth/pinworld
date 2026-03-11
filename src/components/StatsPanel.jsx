import './StatsPanel.css'

const CATEGORY_CONFIG = {
  general: { label: 'General', icon: '📍', color: '#3b9cea' },
  food: { label: 'Food & Dining', icon: '🍽️', color: '#e53935' },
  nature: { label: 'Nature & Parks', icon: '🌲', color: '#43a047' },
  hotel: { label: 'Hotels & Stays', icon: '🏨', color: '#8e24aa' },
  beach: { label: 'Beach & Water', icon: '🏖️', color: '#00acc1' },
  culture: { label: 'Culture & Museums', icon: '🏛️', color: '#6d4c41' },
  shopping: { label: 'Shopping', icon: '🛍️', color: '#f4511e' },
  nightlife: { label: 'Nightlife', icon: '🌙', color: '#5e35b1' }
}

function StatsPanel({ isOpen, onClose, pins }) {
  if (!isOpen) return null

  // Calculate statistics
  const totalPins = pins.length
  const favoritesCount = pins.filter(p => p.is_favorite).length
  const visitedCount = pins.filter(p => p.is_visited).length
  const toVisitCount = totalPins - visitedCount

  // Group by country
  const byCountry = pins.reduce((acc, pin) => {
    const country = pin.location_name?.split(',').pop()?.trim() || 'Unknown'
    acc[country] = (acc[country] || 0) + 1
    return acc
  }, {})

  const topCountries = Object.entries(byCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Group by category
  const byCategory = pins.reduce((acc, pin) => {
    const category = pin.category || 'general'
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {})

  // Group by source
  const bySource = pins.reduce((acc, pin) => {
    const source = pin.source_type || 'Other'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {})

  return (
    <div className="stats-overlay" onClick={onClose}>
      <div className="stats-panel" onClick={(e) => e.stopPropagation()}>
        <div className="stats-header">
          <h3>📊 Pin Statistics</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="stats-content">
          {/* Overview Cards */}
          <div className="stats-overview">
            <div className="stat-card">
              <span className="stat-icon">📍</span>
              <div className="stat-info">
                <span className="stat-value">{totalPins}</span>
                <span className="stat-label">Total Pins</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">⭐</span>
              <div className="stat-info">
                <span className="stat-value">{favoritesCount}</span>
                <span className="stat-label">Favorites</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">✓</span>
              <div className="stat-info">
                <span className="stat-value">{visitedCount}</span>
                <span className="stat-label">Visited</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📌</span>
              <div className="stat-info">
                <span className="stat-value">{toVisitCount}</span>
                <span className="stat-label">To Visit</span>
              </div>
            </div>
          </div>

          {/* Top Countries */}
          <div className="stats-section">
            <h4>🌍 Top Countries</h4>
            {topCountries.length === 0 ? (
              <p className="empty-text">No pins yet</p>
            ) : (
              <div className="stats-bars">
                {topCountries.map(([country, count]) => {
                  const percentage = (count / totalPins) * 100
                  return (
                    <div key={country} className="stat-bar-item">
                      <div className="bar-header">
                        <span className="bar-label">{country}</span>
                        <span className="bar-value">{count}</span>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* By Category */}
          <div className="stats-section">
            <h4>🏷️ By Category</h4>
            <div className="category-stats">
              {Object.entries(byCategory).map(([category, count]) => {
                const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general
                return (
                  <div key={category} className="category-stat-item">
                    <span
                      className="category-dot"
                      style={{ background: config.color }}
                    >
                      {config.icon}
                    </span>
                    <span className="category-name">{config.label}</span>
                    <span className="category-count">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* By Source */}
          <div className="stats-section">
            <h4>📱 By Source</h4>
            <div className="source-stats">
              {Object.entries(bySource).map(([source, count]) => (
                <div key={source} className="source-stat-item">
                  <span className="source-name">{source}</span>
                  <span className="source-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatsPanel
