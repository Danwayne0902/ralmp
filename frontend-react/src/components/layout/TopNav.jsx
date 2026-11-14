import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3, CreditCard, FileText, FileWarning, FlaskConical, Gavel, Layers, LayoutDashboard,
  LogOut, Menu, MessageSquare, Package, ReceiptText, Search, ShoppingCart, Sprout,
  Store, Truck, User as UserIcon, Users, Wallet, ShieldCheck, ArrowRight, Phone,
} from 'lucide-react'
import { useAuth } from '../../store/auth'
import { useCart } from '../../store/cart'
import { roleHome, roleLabel } from '../../lib/format'
import { cn } from '../../lib/utils'
import { Dropdown, Sheet } from '../ui/Overlay'
import { Button } from '../ui/Button'
import { Avatar } from '../ui/Data'

const PUBLIC_LINKS = [
  { to: '/commodities', label: 'Marketplace' },
  { to: '/escrow', label: 'Escrow & trust' },
]

const WORKSPACE = {
  buyer: {
    label: 'Procurement',
    links: [
      { to: '/buyer', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/commodities', label: 'Spot market', icon: Store },
      { to: '/buyer/procurement', label: 'Batch procurement', icon: Layers },
      { to: '/cart', label: 'Escrow checkout', icon: CreditCard },
      { to: '/orders', label: 'Orders & waybills', icon: Package },
      { to: '/settlements', label: 'Settlement ledger', icon: Wallet },
    ],
  },
  farmer: {
    label: 'Farm hub',
    links: [
      { to: '/farmer', label: 'Hub overview', icon: LayoutDashboard, end: true },
      { to: '/farmer/listings', label: 'My lots', icon: Sprout },
      { to: '/farmer/listings/create', label: 'Add harvest', icon: Package },
      { to: '/orders', label: 'Waybills', icon: Truck },
      { to: '/farmer/payouts', label: 'Payouts', icon: Wallet },
      { to: '/farmer/settlement', label: 'Settlement receipts', icon: ReceiptText },
    ],
  },
  logistics_provider: {
    label: 'Dispatch',
    links: [
      { to: '/dispatch', label: 'Fleet board', icon: LayoutDashboard, end: true },
      { to: '/dispatch/waybill', label: 'e-Waybill & gate-in', icon: FileText },
      { to: '/orders', label: 'Haulage orders', icon: Package },
      { to: '/messages', label: 'Carrier messages', icon: MessageSquare },
    ],
  },
  admin: {
    label: 'Administration',
    links: [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/admin/users', label: 'Users', icon: Users },
      { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/admin/disputes', label: 'Disputes', icon: FileWarning },
      { to: '/admin/arbitration', label: 'Arbitration', icon: Gavel },
      { to: '/admin/quality', label: 'Quality lab', icon: FlaskConical, end: true },
      { to: '/admin/quality/terminal', label: 'Inspector terminal', icon: FlaskConical },
    ],
  },
}

const ROLE_AREAS = {
  farmer: ['/farmer'],
  buyer: ['/buyer', '/cart', '/settlements'],
  logistics_provider: ['/dispatch'],
  admin: ['/admin'],
}

function isAreaActive(pathname, area) {
  return area.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export default function TopNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, isLoggedIn, logout } = useAuth()
  const { items, count, fetch: fetchCart, clearLocal } = useCart()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  const workspace = isLoggedIn ? WORKSPACE[user?.role] : null
  const showWorkspace = workspace && isAreaActive(pathname, ROLE_AREAS[user?.role] || [])
  const cartCount = count || items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)

  useEffect(() => {
    setMobileOpen(false)
    setSearchOpen(false)
  }, [pathname])

  useEffect(() => {
    if (isLoggedIn && user?.role === 'buyer') fetchCart().catch(() => {})
    else clearLocal()
  }, [isLoggedIn, user?.role, fetchCart, clearLocal])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  function submitSearch(e) {
    e.preventDefault()
    const q = query.trim()
    setSearchOpen(false)
    navigate(q ? `/commodities?q=${encodeURIComponent(q)}` : '/commodities')
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <div className="page-wrap flex h-16 items-center gap-3">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="RALMP AgroLink home">
            <img src="/brand/ralmp-logo-256.png" alt="" className="h-9 w-9 rounded-lg object-cover" />
            <span className="hidden leading-none sm:block">
              <span className="block font-display text-[17px] font-extrabold tracking-[-0.02em] text-forest-600">RALMP</span>
              <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">AgroLink</span>
            </span>
          </Link>

          <nav className="ml-2 hidden items-center gap-0.5 lg:flex" aria-label="Primary">
            {PUBLIC_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-[13px] font-semibold transition',
                    isActive ? 'bg-forest-50 text-forest-600' : 'text-muted hover:bg-sage-100 hover:text-ink',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            {isLoggedIn && workspace && (
              <NavLink
                to={roleHome(user?.role)}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-[13px] font-semibold transition',
                    isActive ? 'bg-forest-50 text-forest-600' : 'text-muted hover:bg-sage-100 hover:text-ink',
                  )
                }
              >
                {workspace.label}
              </NavLink>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden h-9 items-center gap-2 rounded-lg border border-line bg-canvas px-3 text-[12px] text-muted transition hover:border-sage-400 hover:text-ink md:flex"
            >
              <Search size={14} />
              <span>Search lots…</span>
              <span className="kbd ml-2 hidden lg:inline">/</span>
            </button>

            {isLoggedIn ? (
              <>
                <Link
                  to="/messages"
                  aria-label="Messages"
                  className="hidden h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-sage-100 hover:text-ink sm:grid"
                >
                  <MessageSquare size={18} />
                </Link>

                {user?.role === 'buyer' && (
                  <Link
                    to="/cart"
                    aria-label={`Escrow basket, ${cartCount} items`}
                    className="relative grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-sage-100 hover:text-ink"
                  >
                    <ShoppingCart size={18} />
                    {cartCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-harvest-300 px-1 text-[10px] font-bold text-ink">
                        {cartCount > 99 ? '99+' : cartCount}
                      </span>
                    )}
                  </Link>
                )}

                <span className="mx-1 hidden h-6 w-px bg-line sm:block" />

                <Dropdown
                  label="Account menu"
                  trigger={
                    <button className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-sage-100">
                      <Avatar name={user?.name} src={user?.profile_image} size="sm" />
                      <span className="hidden text-left md:block">
                        <span className="block max-w-[9rem] break-words text-[12px] font-bold leading-4 text-ink">
                          {user?.name?.split(' ')[0] || 'Account'}
                        </span>
                        <span className="block text-[10px] leading-3 text-muted">{roleLabel(user?.role)}</span>
                      </span>
                    </button>
                  }
                  items={[
                    { type: 'label', label: roleLabel(user?.role) },
                    { label: 'Workspace home', icon: LayoutDashboard, onSelect: () => navigate(roleHome(user?.role)) },
                    { label: 'My profile', icon: UserIcon, onSelect: () => navigate('/profile') },
                    { label: 'Messages', icon: MessageSquare, onSelect: () => navigate('/messages') },
                    { label: 'Settlement ledger', icon: Wallet, onSelect: () => navigate('/settlements') },
                    { type: 'separator' },
                    { label: 'Sign out', icon: LogOut, tone: 'danger', onSelect: handleLogout },
                  ]}
                />
              </>
            ) : (
              <>
                <Link to="/login" className="hidden rounded-lg px-3 py-2 text-[13px] font-semibold text-muted transition hover:text-ink sm:block">
                  Sign in
                </Link>
                <Button asChild size="sm" className="hidden sm:inline-flex">
                  <Link to="/register">Open account</Link>
                </Button>
              </>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft transition hover:bg-sage-100 lg:hidden"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {showWorkspace && (
          <div className="hidden border-t border-line bg-white lg:block">
            <div className="page-wrap flex h-11 items-center gap-1 overflow-x-auto">
              <span className="mr-2 shrink-0 rounded-full border border-forest-100 bg-forest-50 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-forest-600">
                {workspace.label}
              </span>
              {workspace.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition',
                      isActive ? 'bg-sage-100 text-ink' : 'text-muted hover:bg-sage-50 hover:text-ink',
                    )
                  }
                >
                  <link.icon size={13} />
                  {link.label}
                </NavLink>
              ))}
              <span className="ml-auto hidden items-center gap-1.5 text-[10.5px] text-muted lg:flex">
                <ShieldCheck size={12} className="text-forest-500" />
                CBN-regulated escrow · NIBSS settlement
              </span>
            </div>
          </div>
        )}
      </header>

      <Sheet open={searchOpen} onOpenChange={setSearchOpen} title="Search the exchange" description="Find verified lots by commodity, category or origin hub." side="right">
        <form onSubmit={submitSearch} className="space-y-3">
          <div className="flex items-center gap-2 rounded-btn border border-line bg-white px-3">
            <Search size={16} className="text-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. yellow maize, soybean, yam"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted/60"
            />
          </div>
          <Button type="submit" className="w-full">
            Search marketplace <ArrowRight size={15} />
          </Button>
        </form>
        <div className="mt-6">
          <p className="label-caps">Popular searches</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {['Maize', 'Soybean', 'Yam', 'Tomatoes', 'Cassava', 'Rice'].map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => { setSearchOpen(false); navigate(`/commodities?q=${term}`) }}
                className="chip"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </Sheet>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen} title="Menu" side="right">
        <div className="space-y-6">
          <nav className="space-y-1">
            {PUBLIC_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-soft hover:bg-sage-100">
                {link.label}
              </Link>
            ))}
          </nav>

          {isLoggedIn && workspace && (
            <div>
              <p className="label-caps px-3">{workspace.label}</p>
              <nav className="mt-2 space-y-1">
                {workspace.links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold',
                        isActive ? 'bg-forest-50 text-forest-600' : 'text-ink-soft hover:bg-sage-100',
                      )
                    }
                  >
                    <link.icon size={15} /> {link.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          )}

          <div className="border-t border-line pt-5">
            {isLoggedIn ? (
              <>
                <div className="flex items-center gap-3 px-1">
                  <Avatar name={user?.name} size="md" />
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-ink">{user?.name}</p>
                    <p className="text-[11px] text-muted">{roleLabel(user?.role)}</p>
                  </div>
                </div>
                <Link to="/profile" className="mt-4 block rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-soft hover:bg-sage-100">
                  Profile & KYC
                </Link>
                <button onClick={handleLogout} className="mt-1 block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-critical-600 hover:bg-critical-50">
                  Sign out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline"><Link to="/login">Sign in</Link></Button>
                <Button asChild><Link to="/register">Open account</Link></Button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-line bg-canvas p-4">
            <p className="flex items-center gap-2 text-[12px] font-bold text-forest-600">
              <Phone size={14} /> Offline trade desk
            </p>
            <p className="mt-1 text-[12px] leading-5 text-muted">
              Dial <span className="font-mono font-semibold text-ink">*347*44#</span> to list harvest and authorise payouts without data.
            </p>
          </div>
        </div>
      </Sheet>
    </>
  )
}
