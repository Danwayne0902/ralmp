import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../store/auth'

export default function ProtectedRoute({ children, roles }) {
  const { isLoggedIn, user } = useAuth()
  const location = useLocation()

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/403" replace />
  }

  return children
}
