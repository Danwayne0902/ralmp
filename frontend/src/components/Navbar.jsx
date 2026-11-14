import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sprout,
  Store,
  User as UserIcon,
  X
} from 'lucide-react'
import { useAuth } from '../store/auth'
import { useCart } from '../store/cart'
import { roleHome, roleLabel } from '../lib/format'
import { Avatar } from './ui/Avatar'

const ROLE_CONSOLE = {
  farmer: { to: '/farmer', label: 'Farm console', icon: Sprout },
  buyer: { to: '/buyer', label: 'Buyer console', icon: Store },
  logistics_provider: { to: '/dashboard', label: 'Delivery hub', icon: LayoutDashboard },
  admin: { to: '/admin', label: 'Admin console', icon: ShieldCheck }
}

function useClickOutside(ref, onClose, active) {
  useEffect(() => {
    if (!active) return undefined
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, onClose, active])
}

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, isLoggedIn, logout } = useAuth()
  const { items, fetch: fetchCart, clearLocal } = useCart()

  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [query, setQuery] = useState('')
  const userRef = useRef(null)

  const isHome = pathname === '/'
  const transparent = isHome && !scrolled

  useClickOutside(userRef, () => setUserOpen(false), userOpen)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setUserOpen(false)
  }, [pathname])

  useEffect(() => {
    if (isLoggedIn) fetchCart().catch(() => {})
    else clearLocal()
  }, [isLoggedIn, fetchCart, clearLocal])

  const count = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const console_ = isLoggedIn ? ROLE_CONSOLE[user?.role] : null

  const links = [
    { to: '/', label: 'Home', end: true },
    { to: '/commodities', label: 'Marketplace' }
  ]

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  function submitSearch(event) {
    event.preventDefault()
    const value = query.trim()
    navigate(value ? `/commodities?search=${encodeURIComponent(value)}` : '/commodities')
    setMobileOpen(false)
  }

  const iconBtn = `grid h-9 w-9 place-items-center rounded-lg transition ${
    transparent ? 'text-white/75 hover:bg-white/10 hover:text-white' : 'text-sand-500 hover:bg-ink/[0.05] hover:text-ink'
  }`

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`transition-all duration-300 ${
          transparent
            ? 'border-b border-white/10 bg-ink-950/40 backdrop-blur-xl'
            : 'border-b border-[color:var(--hairline)] bg-white/85 shadow-xs backdrop-blur-xl'
        }`}
      >
        <nav className="container-page flex h-16 items-center justify-between gap-3">
          {/* Brand */}
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="RALMP home">
            <img
              src="/brand/ralmp-logo-256.png"
              alt=""
              className="h-9 w-9 rounded-[10px] object-cover ring-1 ring-black/5"
            />
            <span className="leading-none">
              <span className={`block font-display text-[17px] font-extrabold tracking-tight ${transparent ? 'text-white' : 'text-ink'}`}>
                RALMP
              </span>
              <span className={`mt-0.5 hidden text-[9px] font-semibold uppercase tracking-[.18em] sm:block ${transparent ? 'text-lime-300' : 'text-sand-400'}`}>
                Agri Linkage
              </span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-1 lg:flex">
            {links.map((link) => {
              const active = link.end ? pathname === link.to : pathname.startsWith(link.to)
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                    active
                      ? transparent
                        ? 'bg-white/10 text-lime-300'
                        : 'bg-brand-50 text-brand-700'
                      : transparent
                        ? 'text-white/80 hover:bg-white/10 hover:text-white'
                        : 'text-sand-600 hover:bg-ink/[0.05] hover:text-ink'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
            {console_ && (
              <Link
                to={console_.to}
                className={`ml-1 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                  pathname.startsWith(console_.to)
                    ? transparent
                      ? 'bg-white/10 text-lime-300'
                      : 'bg-brand-50 text-brand-700'
                    : transparent
                      ? 'text-white/80 hover:bg-white/10 hover:text-white'
                      : 'text-sand-600 hover:bg-ink/[0.05] hover:text-ink'
                }`}
              >
                <console_.icon size={15} />
                {console_.label}
              </Link>
            )}
          </div>

          {/* Desktop actions */}
          <div className="hidden items-center gap-2 lg:flex">
            <form onSubmit={submitSearch} className="relative hidden xl:block">
              <Search size={15} className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${transparent ? 'text-white/50' : 'text-sand-400'}`} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search produce…"
                aria-label="Search produce"
                className={`h-9 w-48 rounded-lg border pl-9 pr-3 text-sm outline-none transition focus:w-60 ${
                  transparent
                    ? 'border-white/15 bg-white/10 text-white placeholder:text-white/45 focus:border-white/30'
                    : 'border-[color:var(--hairline-strong)] bg-white text-ink placeholder:text-sand-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-600/10'
                }`}
              />
            </form>

            {isLoggedIn ? (
              <>
                <Link to="/messages" aria-label="Messages" className={iconBtn}>
                  <MessageSquare size={18} />
                </Link>
                <Link to="/cart" aria-label={`Cart, ${count} items`} className={`relative ${iconBtn}`}>
                  <ShoppingCart size={18} />
                  {count > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-lime-300 px-1 text-[10px] font-bold text-ink">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </Link>

                <div className="relative" ref={userRef}>
                  <button
                    type="button"
                    onClick={() => setUserOpen((value) => !value)}
                    aria-haspopup="menu"
                    aria-expanded={userOpen}
                    className={`flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2 transition ${
                      transparent ? 'hover:bg-white/10' : 'hover:bg-ink/[0.05]'
                    }`}
                  >
                    <Avatar name={user?.name} src={user?.profile_image} size="sm" />
                    <ChevronDown size={14} className={`transition-transform ${userOpen ? 'rotate-180' : ''} ${transparent ? 'text-white/60' : 'text-sand-400'}`} />
                  </button>
                  <AnimatePresence>
                    {userOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.16 }}
                        className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-[color:var(--hairline)] bg-white p-1.5 shadow-xl"
                        role="menu"
                      >
                        <div className="flex items-center gap-3 rounded-xl bg-sand-50 px-3 py-2.5">
                          <Avatar name={user?.name} src={user?.profile_image} size="md" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-ink">{user?.name || 'Member'}</p>
                            <p className="truncate text-xs text-sand-500">{roleLabel(user?.role)}</p>
                          </div>
                        </div>
                        <div className="my-1 h-px bg-[color:var(--hairline)]" />
                        <Link
                          to={console_?.to || roleHome(user?.role)}
                          onClick={() => setUserOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-sand-600 transition hover:bg-ink/[0.04] hover:text-ink"
                          role="menuitem"
                        >
                          <LayoutDashboard size={16} className="text-sand-400" /> Dashboard
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setUserOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-sand-600 transition hover:bg-ink/[0.04] hover:text-ink"
                          role="menuitem"
                        >
                          <UserIcon size={16} className="text-sand-400" /> Profile
                        </Link>
                        <Link
                          to="/orders"
                          onClick={() => setUserOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-sand-600 transition hover:bg-ink/[0.04] hover:text-ink"
                          role="menuitem"
                        >
                          <Settings size={16} className="text-sand-400" /> Orders
                        </Link>
                        <div className="my-1 h-px bg-[color:var(--hairline)]" />
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                          role="menuitem"
                        >
                          <LogOut size={16} /> Sign out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                    transparent ? 'text-white/85 hover:bg-white/10 hover:text-white' : 'text-sand-600 hover:bg-ink/[0.05] hover:text-ink'
                  }`}
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-700"
                >
                  Get started <ArrowRight size={15} />
                </Link>
              </>
            )}
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-1 lg:hidden">
            {isLoggedIn && (
              <Link to="/cart" className={`relative ${iconBtn}`} aria-label={`Cart, ${count} items`}>
                <ShoppingCart size={19} />
                {count > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-lime-300 px-1 text-[10px] font-bold text-ink">
                    {count}
                  </span>
                )}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              className={`grid h-9 w-9 place-items-center rounded-lg ${transparent ? 'text-white' : 'text-ink'}`}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="container-page lg:hidden"
          >
            <div className="mt-2 space-y-1 rounded-2xl border border-[color:var(--hairline)] bg-white p-3 shadow-lg">
              <form onSubmit={submitSearch} className="relative mb-2">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sand-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search produce…"
                  aria-label="Search produce"
                  className="field pl-9"
                />
              </form>

              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-sand-700 transition hover:bg-brand-50 hover:text-brand-700"
                >
                  {link.label}
                </Link>
              ))}
              {console_ && (
                <Link
                  to={console_.to}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-sand-700 transition hover:bg-brand-50 hover:text-brand-700"
                >
                  <console_.icon size={16} /> {console_.label}
                </Link>
              )}

              {isLoggedIn ? (
                <>
                  <div className="my-1 h-px bg-[color:var(--hairline)]" />
                  <Link to="/messages" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-sand-700 hover:bg-brand-50">
                    Messages
                  </Link>
                  <Link to="/orders" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-sand-700 hover:bg-brand-50">
                    Orders
                  </Link>
                  <Link to="/profile" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-sand-700 hover:bg-brand-50">
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link to="/login" className="btn-outline">
                    Log in
                  </Link>
                  <Link to="/register" className="btn-primary">
                    Get started
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
