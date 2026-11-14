import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Package, ShoppingCart, Truck } from 'lucide-react'
import { useAuth } from '../store/auth'
import { orderService, cartService } from '../lib/services'
import { money, roleLabel } from '../lib/format'
import PageHeader from '../components/PageHeader'
import { Button, Card, CardHeader, EmptyState, Skeleton, StatCard } from '../components/ui'

const EASE = [0.22, 1, 0.36, 1]

export default function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ orders: 0, value: 0, cartItems: 0 })
  const [recent, setRecent] = useState([])

  useEffect(() => {
    Promise.allSettled([orderService.list({ per_page: 5 }), cartService.get()])
      .then(([ordersRes, cartRes]) => {
        const orders = ordersRes.value?.data?.data || []
        const cart = cartRes.value?.data || {}
        setRecent(orders)
        setStats({
          orders: ordersRes.value?.data?.total || orders.length,
          value: orders.reduce((s, o) => s + Number(o.total_price || 0), 0),
          cartItems: (cart.items || []).reduce((s, i) => s + Number(i.quantity || 0), 0)
        })
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title={`Welcome, ${user?.name?.split(' ')[0] || 'member'}`}
        subtitle={`Signed in as ${roleLabel(user?.role)}.`}
        actions={
          <Button to="/commodities" rightIcon={ArrowRight}>
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
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="space-y-6"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard icon={Package} label="Orders" value={stats.orders} hint="Visible to your account" tone="brand" />
            <StatCard icon={Truck} label="Active value" value={`₦${money(stats.value)}`} hint="Across recent orders" tone="amber" />
            <StatCard icon={ShoppingCart} label="Cart items" value={stats.cartItems} hint="Ready for checkout" tone="lime" />
          </div>

          <Card className="overflow-hidden">
            <CardHeader
              icon={Package}
              title="Recent orders"
              subtitle="Your latest marketplace activity"
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
                  description="Orders you place or receive will show up here."
                  action={
                    <Button to="/commodities" size="sm">
                      Browse produce
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-[color:var(--hairline)]">
                {recent.map((o) => (
                  <li key={o.id}>
                    <Link
                      to={`/orders/${o.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-brand-50/40"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                          <Package size={16} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-ink">Order #{o.id}</span>
                          <span className="block text-xs text-sand-500">{o.items?.length || 0} items</span>
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-sm font-semibold tnum text-ink">₦{money(o.total_price)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="panel flex items-start gap-3 border-brand-200 bg-brand-50 p-5 sm:p-6">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
              <Truck size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-[15px] font-bold text-brand-900">Logistics workspace</h2>
              <p className="mt-1 text-sm leading-relaxed text-brand-800/80">
                Delivery assignments, tracking updates and pickup scheduling are managed from the logistics API.
                Contact the platform administrator to enable your delivery queue.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
