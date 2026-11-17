import { Navigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { roleHome } from '../lib/format'

export default function DashboardRedirect() {
  const user = useAuth((state) => state.user)
  return <Navigate to={roleHome(user?.role)} replace />
}
