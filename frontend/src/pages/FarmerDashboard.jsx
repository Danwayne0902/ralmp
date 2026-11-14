import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Package, Plus, Sprout, TrendingUp, Truck, Wallet } from 'lucide-react'
import { orderService, produceService } from '../lib/services'
import { useAuth } from '../store/auth'
import { fmtDate, money } from '../lib/format'
import PageHeader from '../components/PageHeader'
import { Button, Card, CardHeader, EmptyState, Skeleton, StatCard, StatusBadge } from '../components/ui'

const EASE = [0.22, 1, 0.36, 1]

export default function FarmerDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ activeListings: 0, totalOrders: 0, totalEarnings: 0, pendingDeliveries: 0 })
  const [recent, setRecent] = useState([])
  const [listings, setListings] = useState([])

  useEffect(() => {
    Promise.all([
      produceService.mine({ per_page: 100 }),
      orderService.list({ per_page: 5 }),
      produceService.earnings()
    ])
      .then(([l, o, e]) => {
        const list = l.data.data || []
        const orders = o.data.data || []
        setListings(list)
        setRecent(orders)
        setStats({
          activeListings: list.filter((x) => x.availability_status === 'available').length,
          totalOrders: e.data.total_orders || 0,
          totalEarnings: e.data.total_earnings || 0,
          pendingDeliveries: orders.filter((x) => x.status === 'pending').length
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Farmer workspace"
        title={`Good day, ${user?.name?.split(' ')[0] || 'farmer'}`}
        subtitle="Your harvest performance at a glance."
        actions={
          <Button to="/farmer/listings/create" leftIcon={Plus}>
            New listing
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Sprout} label="Active listings" value={stats.activeListings} hint="Live on marketplace" tone="brand" />
            <StatCard icon={Package} label="Total orders" value={stats.totalOrders} hint="All time" tone="lime" />
            <StatCard icon={Wallet} label="Total earnings" value={`₦${money(stats.totalEarnings)}`} hint="Completed orders" tone="amber" />
            <StatCard icon={Truck} label="Pending" value={stats.pendingDeliveries} hint="Awaiting action" tone="neutral" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <Card className="overflow-hidden">
              <CardHeader
                icon={Package}
                title="Recent orders"
                subtitle="Latest activity on your listings"
                actions={
                  <Button to="/orders" variant="ghost" size="sm" rightIcon={ArrowRight}>
                    View all
                  </Button>
                }
              />
              {recent.length === 0 ? (
                <div className="p-6 sm:p-8">
                  <EmptyState
                    className="border-0 bg-transparent shadow-none"
                    icon={Package}
                    title="No orders yet"
                    description="New listings usually attract their first order within days."
                  />
                </div>
              ) : (
                <ul className="divide-y divide-[color:var(--hairline)]">
                  {recent.map((o) => (
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
                <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                  <TrendingUp size={15} className="text-brand-600" /> Top listings
                </h2>
                {listings.length === 0 ? (
                  <p className="mt-3 text-xs text-sand-500">Publish your first harvest to see it here.</p>
                ) : (
                  <div className="mt-3 space-y-2.5">
                    {listings.slice(0, 4).map((l) => (
                      <Link
                        key={l.id}
                        to={`/farmer/listings/${l.id}/edit`}
                        className="block rounded-xl border border-[color:var(--hairline)] p-3 transition hover:border-brand-300 hover:bg-brand-50/40"
                      >
                        <p className="truncate text-xs font-bold text-ink">{l.commodity_name}</p>
                        <div className="mt-1 flex items-center justify-between text-2xs">
                          <span className="text-sand-500">
                            {money(l.quantity)} {l.unit}
                          </span>
                          <span className="font-mono font-bold tnum text-brand-700">₦{money(l.price)}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                <Button to="/farmer/listings" variant="ghost" size="sm" className="mt-3 w-full justify-center">
                  Manage listings
                </Button>
              </Card>

              <div className="surface-dark rounded-2xl p-5">
                <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden />
                <div className="relative">
                  <p className="text-2xs font-bold uppercase tracking-[.2em] text-lime-300">Grow faster</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/85">
                    Listings with 2+ photos and a clear description sell 3× faster.
                  </p>
                  <Link
                    to="/farmer/listings/create"
                    className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-lime-300 hover:text-lime-200"
                  >
                    Improve a listing <ArrowRight size={13} />
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
