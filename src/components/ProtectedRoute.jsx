import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Loading from './Loading'

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <Loading message="Checking authentication..." />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
