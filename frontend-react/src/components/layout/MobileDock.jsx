import { NavLink } from 'react-router-dom'
import {
  Banknote, BarChart3, FileText, FileWarning, Gavel, Layers, LayoutDashboard, MessageSquare,
  Package, Sprout, Store, Truck, User as UserIcon, Users, Wallet,
} from 'lucide-react'
import { useAuth } from '../../store/auth'
import { useCart } from '../../store/cart'
import { cn } from '../../lib/utils'

const DOCKS = {
  buyer: [
    { to: '/buyer', label: 'Home', icon: LayoutDashboard, end: true },
    { to: '/commodities', label: 'Market', icon: Store },
    { to: '/buyer/procurement', label: 'Batch', icon: Layers },
    { to: '/orders', label: 'Orders', icon: Package },
    { to: '/settlements', label: 'Ledger', icon: Wallet },
  ],
  farmer: [
    { to: '/farmer', label: 'Hub', icon: LayoutDashboard, end: true },
    { to: '/farmer/listings', label: 'Lots', icon: Sprout },
    { to: '/orders', label: 'Waybills', icon: Truck },
    { to: '/farmer/payouts', label: 'Payouts', icon: Banknote },
    { to: '/farmer/settlement', label: 'Receipts', icon: Wallet },
  ],
  logistics_provider: [
    { to: '/dispatch', label: 'Board', icon: LayoutDashboard, end: true },
    { to: '/dispatch/waybill', label: 'Waybill', icon: FileText },
    { to: '/orders', label: 'Haulage', icon: Package },
    { to: '/messages', label: 'Inbox', icon: MessageSquare },
    { to: '/profile', label: 'Profile', icon: UserIcon },
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/disputes', label: 'Disputes', icon: FileWarning },
    { to: '/admin/arbitration', label: 'Awards', icon: Gavel },
    { to: '/admin/analytics', label: 'Stats', icon: BarChart3 },
  ],
}

export default function MobileDock() {
  const { user, isLoggedIn } = useAuth()
  const { count } = useCart()
  const items = isLoggedIn ? DOCKS[user?.role] : null
  if (!items) return null

  return (
    <nav
      aria-label="Workspace"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition',
                isActive ? 'text-forest-600' : 'text-muted',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn('grid h-7 w-9 place-items-center rounded-lg', isActive && 'bg-forest-50')}>
                  <item.icon size={18} />
                  {item.to === '/cart' && count > 0 && (
                    <span className="absolute right-4 top-1.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-harvest-300 px-0.5 text-[9px] font-bold text-ink">
                      {count}
                    </span>
                  )}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
