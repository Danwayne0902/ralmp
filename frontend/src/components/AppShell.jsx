import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  PlusCircle,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
  User as UserIcon,
  Users,
  X
} from 'lucide-react'
import { useAuth } from '../store/auth'
import { useCart } from '../store/cart'
import { roleLabel } from '../lib/format'
import { Avatar } from './ui/Avatar'

const ROLE_NAV = {
  farmer: [
    { label: 'Overview', to: '/farmer', icon: LayoutDashboard },
    { label: 'My listings', to: '/farmer/listings', icon: Package },
    { label: 'Add listing', to: '/farmer/listings/create', icon: PlusCircle }
  ],
  buyer: [
    { label: 'Overview', to: '/buyer', icon: LayoutDashboard },
    { label: 'Cart', to: '/cart', icon: ShoppingCart },
    { label: 'Orders', to: '/orders', icon: ShoppingBag }
  ],
  logistics_provider: [
    { label: 'Delivery hub', to: '/dashboard', icon: Truck },
    { label: 'Assigned orders', to: '/orders', icon: ShoppingBag }
  ],
  admin: [
    { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
    { label: 'Users', to: '/admin/users', icon: Users },
    { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 }
  ]
}

const ACCOUNT_NAV = [
  { label: 'Messages', to: '/messages', icon: MessageSquare },
  { label: 'Profile', to: '/profile', icon: UserIcon }
]

function bestMatch(pathname, items) {
  let match = null
  items.forEach((item) => {
    const hit = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (hit && (!match || item.to.length > match.to.length)) match = item
  })
  return match?.to
}

function NavItem({ item, active, onNavigate }) {
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={`side-link ${active ? 'side-link-active' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      <item.icon size={18} strokeWidth={2} />
      <span className="truncate">{item.label}</span>
    </NavLink>
  )
}

function SidebarContent({ pathname, workspace, onNavigate }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const workspaceActive = bestMatch(pathname, workspace)
  const accountActive = bestMatch(pathname, ACCOUNT_NAV)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
        <Link to="/" className="flex items-center gap-2.5" onClick={onNavigate}>
          <img src="/brand/ralmp-logo-256.png" alt="" className="h-9 w-9 rounded-[10px] object-cover ring-1 ring-black/5" />
          <span className="leading-none">
            <span className="block font-display text-[16px] font-extrabold tracking-tight text-ink">RALMP</span>
            <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[.16em] text-sand-400">Workspace</span>
          </span>
        </Link>
      </div>

      <div className="hairline mx-4 mb-3 flex items-center gap-2.5 rounded-xl bg-sand-50 px-3 py-2.5">
        <Avatar name={user?.name} src={user?.profile_image} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold text-ink">{user?.name || 'Member'}</p>
          <p className="truncate text-2xs text-sand-500">{roleLabel(user?.role)}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-1 pt-2 text-2xs font-bold uppercase tracking-[.16em] text-sand-400">Workspace</p>
        {workspace.map((item) => (
          <NavItem key={item.to} item={item} active={item.to === workspaceActive} onNavigate={onNavigate} />
        ))}

        <p className="px-3 pb-1 pt-4 text-2xs font-bold uppercase tracking-[.16em] text-sand-400">Marketplace</p>
        <NavItem
          item={{ label: 'Browse produce', to: '/commodities', icon: Store }}
          active={false}
          onNavigate={onNavigate}
        />

        <p className="px-3 pb-1 pt-4 text-2xs font-bold uppercase tracking-[.16em] text-sand-400">Account</p>
        {ACCOUNT_NAV.map((item) => (
          <NavItem key={item.to} item={item} active={item.to === accountActive} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="shrink-0 border-t border-[color:var(--hairline)] p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="side-link w-full text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut size={18} /> Sign out
        </button>
      </div>
    </div>
  )
}

export default function AppShell({ children }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const { items } = useCart()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const workspace = ROLE_NAV[user?.role] || ROLE_NAV.logistics_provider
  const count = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)

  useEffect(() => {
    setDrawerOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-[100svh] bg-sand-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-[color:var(--hairline)] bg-white lg:block">
        <SidebarContent pathname={pathname} workspace={workspace} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-ink-950/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 340 }}
              className="fixed inset-y-0 left-0 z-50 w-[270px] border-r border-[color:var(--hairline)] bg-white lg:hidden"
            >
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-4 grid h-9 w-9 place-items-center rounded-lg text-sand-500 hover:bg-ink/[0.05]"
              >
                <X size={18} />
              </button>
              <SidebarContent pathname={pathname} workspace={workspace} onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-[260px]">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-[color:var(--hairline)] bg-white/85 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                className="grid h-9 w-9 place-items-center rounded-lg text-ink hover:bg-ink/[0.05] lg:hidden"
              >
                <Menu size={20} />
              </button>
              <Link to="/commodities" className="hidden items-center gap-2 rounded-lg border border-[color:var(--hairline-strong)] bg-white px-3 py-2 text-sm text-sand-400 transition hover:border-brand-300 hover:text-sand-600 sm:flex">
                <Search size={15} />
                <span>Search the marketplace…</span>
              </Link>
            </div>

            <div className="flex items-center gap-1.5">
              <Link to="/messages" aria-label="Messages" className="grid h-9 w-9 place-items-center rounded-lg text-sand-500 transition hover:bg-ink/[0.05] hover:text-ink">
                <MessageSquare size={18} />
              </Link>
              <Link to="/cart" aria-label={`Cart, ${count} items`} className="relative grid h-9 w-9 place-items-center rounded-lg text-sand-500 transition hover:bg-ink/[0.05] hover:text-ink">
                <ShoppingCart size={18} />
                {count > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </Link>
              <span className="mx-1 hidden h-6 w-px bg-[color:var(--hairline)] sm:block" />
              <button type="button" aria-label="Notifications" className="hidden h-9 w-9 place-items-center rounded-lg text-sand-500 transition hover:bg-ink/[0.05] hover:text-ink sm:grid">
                <Bell size={18} />
              </button>
              <Link to="/profile" className="ml-1 flex items-center gap-2 rounded-lg py-1 pl-1 pr-1 transition hover:bg-ink/[0.05]">
                <Avatar name={user?.name} src={user?.profile_image} size="sm" />
                <span className="hidden text-left sm:block">
                  <span className="block max-w-28 truncate text-[13px] font-bold text-ink">{user?.name?.split(' ')[0] || 'Account'}</span>
                  <span className="block text-2xs text-sand-400">{roleLabel(user?.role)}</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                className="grid h-9 w-9 place-items-center rounded-lg text-sand-400 transition hover:bg-red-50 hover:text-red-600"
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </header>

        <main className="container-page py-6 sm:py-8">{children}</main>
      </div>
    </div>
  )
}
