import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import './SettingsPanel.css'

const MAP_STYLES = [
  {
    id: 'default',
    name: 'Default',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  },
  {
    id: 'satellite',
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri'
  },
  {
    id: 'terrain',
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
  },
  {
    id: 'dark',
    name: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
  }
]

function SettingsPanel({ isOpen, onClose, mapStyle, onMapStyleChange }) {
  const { isDarkMode, toggleTheme } = useTheme()

  if (!isOpen) return null

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>Settings</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          {/* Theme Toggle */}
          <div className="settings-section">
            <h4>Appearance</h4>
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">Dark Mode</span>
                <span className="setting-description">Switch to dark theme</span>
              </div>
              <button
                className={`toggle-switch ${isDarkMode ? 'active' : ''}`}
                onClick={toggleTheme}
                aria-label="Toggle dark mode"
              >
                <span className="toggle-slider">
                  {isDarkMode ? '🌙' : '☀️'}
                </span>
              </button>
            </div>
          </div>

          {/* Map Style */}
          <div className="settings-section">
            <h4>Map Style</h4>
            <div className="map-styles-grid">
              {MAP_STYLES.map((style) => (
                <button
                  key={style.id}
                  className={`map-style-option ${mapStyle === style.id ? 'active' : ''}`}
                  onClick={() => onMapStyleChange(style.id)}
                >
                  <span className="style-preview" data-style={style.id}></span>
                  <span className="style-name">{style.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { MAP_STYLES }
export default SettingsPanel
