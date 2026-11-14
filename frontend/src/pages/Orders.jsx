import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronRight, Package, Search, Store } from 'lucide-react'
import { orderService } from '../lib/services'
import { money, relativeDate } from '../lib/format'
import PageHeader from '../components/PageHeader'
import { Button, EmptyState, Skeleton, StatusBadge, Tabs } from '../components/ui'

export const statuses = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' }
]

// Kept as a shared export: FarmerDashboard also maps statuses through this.
export const statusClass = {
  pending: 'badge-amber',
  confirmed: 'badge-brand',
  processing: 'badge-amber',
  shipped: 'badge-lime',
  delivered: 'badge-success',
  cancelled: 'badge-danger'
}

const EASE = [0.22, 1, 0.36, 1]

function OrdersSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="card flex items-center gap-4 p-4 sm:p-5">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="ml-auto h-4 w-20" />
            <Skeleton className="ml-auto h-3 w-14" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Orders() {
  const reduce = useReducedMotion()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    orderService
      .list({ per_page: 100 })
      .then((res) => setOrders(res.data.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = orders
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((o) => String(o.id).includes(q) || o.status?.includes(q))
    }
    if (status) list = list.filter((o) => o.status === status)
    return list
  }, [orders, search, status])

  const counts = useMemo(() => {
    const map = { '': orders.length }
    orders.forEach((o) => { map[o.status] = (map[o.status] || 0) + 1 })
    return map
  }, [orders])

  const tabItems = useMemo(
    () => statuses.map((s) => ({ id: s.value, label: s.label, count: counts[s.value] || 0 })),
    [counts]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fulfilment"
        title="My orders"
        subtitle="Track and manage every order in real time."
        actions={<Button to="/commodities" leftIcon={Store}>Shop more produce</Button>}
      />

      <div className="card flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sand-400" />
          <input
            className="field pl-9"
            placeholder="Search by order number or status…"
            aria-label="Search orders"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs tabs={tabItems} value={status} onChange={setStatus} className="lg:w-auto" />
      </div>

      {loading ? (
        <OrdersSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={orders.length ? 'No matching orders' : 'No orders yet'}
          description={orders.length ? 'Try a different search or status.' : 'Place your first order to start tracking deliveries.'}
          action={<Button to="/commodities" leftIcon={Store}>Browse marketplace</Button>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((o, i) => {
            const count = o.items?.length || 0
            return (
              <motion.div
                key={o.id}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE, delay: reduce ? 0 : Math.min(i * 0.04, 0.3) }}
              >
                <Link to={`/orders/${o.id}`} className="card-interactive flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                    <Package size={20} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-sm font-bold text-ink">Order #{o.id}</h3>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-sand-500">
                      Placed {relativeDate(o.created_at)} · {count} item{count === 1 ? '' : 's'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-5 sm:justify-end">
                    <div className="text-right">
                      <p className="text-2xs font-semibold uppercase tracking-wide text-sand-400">Total</p>
                      <p className="font-display text-base font-extrabold text-brand-700 tnum">
                        ₦{money(o.total_price ?? o.total_amount)}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-sand-300" aria-hidden />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
