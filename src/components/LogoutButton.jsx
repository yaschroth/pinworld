import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './LogoutButton.css'

function LogoutButton({ onSettingsClick, onStatsClick }) {
  const [isLoading, setIsLoading] = useState(false)
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="logout-container">
      <span className="user-email">{user?.email}</span>
      <div className="header-buttons">
        <button
          onClick={onStatsClick}
          className="icon-button"
          title="View statistics"
        >
          📊
        </button>
        <button
          onClick={onSettingsClick}
          className="icon-button"
          title="Settings"
        >
          ⚙️
        </button>
        <button
          onClick={handleLogout}
          disabled={isLoading}
          className="logout-button"
        >
          {isLoading ? '...' : 'Logout'}
        </button>
      </div>
    </div>
  )
}

export default LogoutButton
