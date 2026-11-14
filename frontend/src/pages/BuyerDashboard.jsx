import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Package, ShoppingBag, Truck, Wallet } from 'lucide-react'
import { buyerService } from '../lib/services'
import { useAuth } from '../store/auth'
import { fmtDate, money } from '../lib/format'
import PageHeader from '../components/PageHeader'
import { Button, Card, CardHeader, EmptyState, Skeleton, StatCard, StatusBadge } from '../components/ui'

const EASE = [0.22, 1, 0.36, 1]

const QUICK_ACTIONS = [
  { to: '/cart', label: 'Review cart' },
  { to: '/orders', label: 'Track orders' },
  { to: '/messages', label: 'Message suppliers' }
]

export default function BuyerDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    buyerService
      .dashboard()
      .then((res) => setData(res.data))
      .catch(() => setData({ total_orders: 0, total_spent: 0, pending_deliveries: 0, recent_orders: [] }))
      .finally(() => setLoading(false))
  }, [])

  const d = data || {}

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Buyer workspace"
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'there'}`}
        subtitle="Track spend, deliveries and recent orders in one place."
        actions={
          <Button to="/commodities" leftIcon={ShoppingBag}>
            Browse marketplace
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[136px] rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="space-y-6"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={Package}
              label="Total orders"
              value={d.total_orders || 0}
              hint={`${d.pending_deliveries || 0} pending delivery`}
              tone="brand"
            />
            <StatCard icon={Wallet} label="Total spent" value={`₦${money(d.total_spent)}`} hint="All time" tone="amber" />
            <StatCard icon={Truck} label="Pending deliveries" value={d.pending_deliveries || 0} hint="Awaiting arrival" tone="lime" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <Card className="overflow-hidden">
              <CardHeader
                icon={Package}
                title="Recent orders"
                subtitle="Your latest purchases"
                actions={
                  <Button to="/orders" variant="ghost" size="sm" rightIcon={ArrowRight}>
                    View all
                  </Button>
                }
              />

              {!d.recent_orders?.length ? (
                <div className="p-6 sm:p-8">
                  <EmptyState
                    className="border-0 bg-transparent shadow-none"
                    icon={Package}
                    title="No orders yet"
                    description="Your purchases will appear here once you checkout."
                    action={
                      <Button to="/commodities" size="sm">
                        Find produce
                      </Button>
                    }
                  />
                </div>
              ) : (
                <ul className="divide-y divide-[color:var(--hairline)]">
                  {d.recent_orders.map((o) => (
                    <li key={o.id}>
                      <Link
                        to={`/orders/${o.id}`}
                        className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-brand-50/40"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                          <Package size={17} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-ink">Order #{o.id}</p>
                          <p className="text-xs text-sand-500">{fmtDate(o.created_at)}</p>
                        </div>
                        <StatusBadge status={o.status} />
                        <span className="hidden font-mono text-sm font-semibold tnum text-ink sm:inline">₦{money(o.total_price)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <aside className="space-y-4">
              <Card className="card-pad">
                <h2 className="text-2xs font-bold uppercase tracking-[.16em] text-sand-400">Quick actions</h2>
                <div className="mt-3 space-y-2">
                  {QUICK_ACTIONS.map((action) => (
                    <Link
                      key={action.to}
                      to={action.to}
                      className="flex items-center justify-between rounded-xl border border-[color:var(--hairline)] px-3.5 py-3 text-sm font-semibold text-ink transition hover:border-brand-300 hover:bg-brand-50"
                    >
                      {action.label}
                      <ArrowRight size={14} className="text-sand-400" />
                    </Link>
                  ))}
                </div>
              </Card>

              <div className="surface-dark rounded-2xl p-5">
                <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden />
                <div className="relative">
                  <p className="text-2xs font-bold uppercase tracking-[.2em] text-lime-300">Buyer tip</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/85">
                    Buyers who message farmers before ordering report 40% fewer delivery issues.
                  </p>
                  <Link
                    to="/commodities"
                    className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-lime-300 hover:text-lime-200"
                  >
                    Find a supplier <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </motion.div>
      )}
    </div>
  )
}
