import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { roleHome } from '../lib/format'

export default function ProtectedRoute({ children, role }) {
  const { isLoggedIn, user } = useAuth()
  const location = useLocation()

  if (!isLoggedIn) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  if (role && user?.role !== role) {
    return <Navigate to={roleHome(user?.role)} replace />
  }

  return children
}
