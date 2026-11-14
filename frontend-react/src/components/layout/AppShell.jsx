import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import TopNav from './TopNav'
import Footer from './Footer'
import MobileDock from './MobileDock'
import { useAuth } from '../../store/auth'

export default function AppShell() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const refresh = useAuth((state) => state.refresh)
  const isLoggedIn = useAuth((state) => state.isLoggedIn)
  const hydrated = useRef(false)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
  }, [pathname])

  useEffect(() => {
    if (hydrated.current || !isLoggedIn) return
    hydrated.current = true
    refresh().catch(() => {})
  }, [isLoggedIn, refresh])

  useEffect(() => {
    function handleUnauthorized() {
      navigate('/login', { replace: true, state: { from: window.location.pathname } })
    }
    window.addEventListener('ralmp:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('ralmp:unauthorized', handleUnauthorized)
  }, [navigate])

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <TopNav />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileDock />
      <Toaster
        position="top-right"
        closeButton
        toastOptions={{
          classNames: {
            toast:
              'rounded-xl border border-line bg-white font-sans text-ink shadow-modal',
            title: 'text-[13px] font-semibold',
            description: 'text-[12px] text-muted',
            actionButton: 'rounded-md bg-forest-500 text-white text-[12px] font-semibold',
            cancelButton: 'rounded-md bg-sage-100 text-muted text-[12px] font-semibold',
            error: 'border-critical-200 text-critical-600',
            success: 'border-forest-200 text-forest-700',
          },
        }}
      />
    </div>
  )
}
