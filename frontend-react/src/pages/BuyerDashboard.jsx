import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, ArrowUpRight, BarChart3, CalendarDays, Clock3,
  CreditCard, Landmark, MessageSquare, Package, ShieldCheck, ShoppingBag, Sprout, Truck, Wallet,
} from 'lucide-react'
import { PageHeader, Stat, Table, Th, Td, Tr, Skeleton, EmptyState, Progress } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { LotCard } from '../components/market/LotCard'
import { buyerService, orderService, produceService } from '../lib/services'
import { fmtDate, money } from '../lib/format'
import { useAuth } from '../store/auth'
import { useCart } from '../store/cart'
import { parseError } from '../lib/utils'

export default function BuyerDashboard() {
  const { user } = useAuth()
  const { count } = useCart()
  const [dashboard, setDashboard] = useState(null)
  const [orders, setOrders] = useState([])
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      buyerService.dashboard(),
      orderService.list({ per_page: 50 }),
      produceService.list({ per_page: 3, availability_status: 'available' }),
    ])
      .then(([dash, orderRes, lotRes]) => {
        if (!active) return
        setDashboard(dash.data)
        setOrders(orderRes.data?.data || [])
        setLots(lotRes.data?.data || [])
      })
      .catch((err) => {
        if (active) setError(parseError(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const unpaid = orders.filter((order) => order.payment_status !== 'paid' && order.status !== 'cancelled')
  const funded = orders.filter((order) => order.payment_status === 'paid')
  const inTransit = orders.filter((order) => ['confirmed', 'processing', 'shipped'].includes(order.status))
  const exposure = unpaid.reduce((sum, order) => sum + Number(order.total_price || 0), 0)
  const recent = dashboard?.recent_orders || orders.slice(0, 5)

  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, {})
  const maxCount = Math.max(1, ...Object.values(statusCounts))

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="Procurement desk"
        title={`Good day, ${user?.name?.split(' ')[0] || 'buyer'}`}
        description="Your escrow exposure, inbound deliveries and settlement position at a glance."
        actions={
          <>
            <Button asChild variant="outline" size="md">
              <Link to="/settlements">
                <Wallet size={15} /> Settlement ledger
              </Link>
            </Button>
            <Button asChild size="md">
              <Link to="/commodities">
                <ShoppingBag size={15} /> Procure
              </Link>
            </Button>
          </>
        }
      />

      {error && (
        <p className="mb-4 rounded-card border border-critical-200 bg-critical-50 px-4 py-3 text-[12.5px] text-critical-600">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[108px] rounded-card" />)
        ) : (
          <>
            <Stat icon={Package} label="Total orders" value={dashboard?.total_orders ?? orders.length} hint="Across all procurement cycles" />
            <Stat icon={Truck} label="Pending deliveries" value={dashboard?.pending_deliveries ?? inTransit.length} tone="gold" hint="Confirmed, processing or in transit" />
            <Stat icon={CreditCard} label="Committed capital" value={money(dashboard?.total_spent ?? 0)} tone="sprout" hint="Delivered and settled orders" size="lg" />
            <Stat icon={ShoppingBag} label="Basket lines" value={count} tone="neutral" hint="Staged, not yet committed" />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="font-display text-[15px] font-bold text-ink">Recent orders</h2>
                <p className="mt-0.5 text-[11px] text-muted">Escrow state and carrier milestone per order.</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/orders">All orders <ArrowRight size={13} /></Link>
              </Button>
            </div>

            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recent.length === 0 ? (
              <EmptyState
                icon={Sprout}
                title="No procurement history yet"
                description="Verified lots are live on the exchange. Your first escrow commitment will appear here."
                className="border-0 shadow-none"
                action={<Button asChild><Link to="/commodities">Enter the exchange</Link></Button>}
              />
            ) : (
              <>
                <div className="hidden sm:block">
                  <Table minWidth={640}>
                    <thead>
                      <tr>
                        <Th>Order</Th>
                        <Th>Commodity</Th>
                        <Th>Grower</Th>
                        <Th className="text-right">Value</Th>
                        <Th>Escrow</Th>
                        <Th>Status</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((order) => (
                        <Tr key={order.id}>
                          <Td>
                            <Link to={`/orders/${order.id}`} className="font-semibold text-ink hover:text-forest-600">
                              #{order.id}
                            </Link>
                            <p className="text-[10px] text-muted">{fmtDate(order.order_date || order.created_at)}</p>
                          </Td>
                          <Td className="break-words">{order.produce?.commodity_name || 'Lot'}</Td>
                          <Td className="break-words">{order.farmer?.name || '—'}</Td>
                          <Td className="text-right font-semibold text-ink tnum">{money(order.total_price)}</Td>
                          <Td>
                            <Badge tone={order.payment_status === 'paid' ? 'verified' : 'pending'} size="sm">
                              {order.payment_status === 'paid' ? 'Funded' : 'Unfunded'}
                            </Badge>
                          </Td>
                          <Td><StatusBadge status={order.status} size="sm" /></Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                <ul className="divide-y divide-line sm:hidden">
                  {recent.map((order) => (
                    <li key={order.id}>
                      <Link to={`/orders/${order.id}`} className="flex items-start justify-between gap-3 px-4 py-3.5">
                        <div className="min-w-0">
                          <p className="break-words text-[13px] font-semibold text-ink">
                            {order.produce?.commodity_name || `Order #${order.id}`}
                          </p>
                          <p className="mt-0.5 text-[10.5px] text-muted">
                            #{order.id} · {order.farmer?.name || 'Grower'}
                          </p>
                          <div className="mt-1.5"><StatusBadge status={order.status} size="sm" /></div>
                        </div>
                        <p className="shrink-0 text-[13px] font-bold text-ink tnum">{money(order.total_price)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
                <BarChart3 size={16} className="text-forest-500" /> Order pipeline
              </h2>
              <p className="text-[10.5px] text-muted">{orders.length} {orders.length === 1 ? 'order' : 'orders'} in the ledger</p>
            </div>
            {orders.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-sage-400 bg-canvas px-4 py-5 text-center text-[12px] text-muted">
                Pipeline metrics appear after the first order is placed.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {Object.entries(statusCounts).map(([status, value]) => (
                  <div key={status} className="grid grid-cols-[110px_minmax(0,1fr)_32px] items-center gap-3">
                    <span className="text-[11.5px] font-medium capitalize text-muted">{status}</span>
                    <Progress value={(value / maxCount) * 100} tone={status === 'cancelled' ? 'gold' : 'forest'} />
                    <span className="text-right text-[11.5px] font-bold text-ink tnum">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-display text-[17px] font-bold text-ink">Lots worth a look</h2>
                <p className="text-[11.5px] text-muted">Fresh availability from verified growers.</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/commodities">Browse all <ArrowRight size={13} /></Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {loading
                ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-card" />)
                : lots.map((lot) => <LotCard key={lot.id} lot={lot} canTrade={false} />)}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-card border border-line bg-forest-900 p-5 text-white shadow-card">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-forest-200">
                <Landmark size={13} className="text-harvest-300" /> Escrow exposure
              </p>
              <ShieldCheck size={15} className="text-harvest-300" />
            </div>
            <p className="mt-3 font-display text-[30px] font-extrabold leading-9 tracking-tight tnum">{money(exposure)}</p>
            <p className="mt-1 text-[11px] leading-5 text-forest-100/65">
              Across {unpaid.length} unfunded {unpaid.length === 1 ? 'order' : 'orders'}. Fund before the carrier is
              matched to avoid cancellation.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-3">
              <div>
                <p className="text-[9.5px] font-bold uppercase tracking-wide text-forest-300">Funded</p>
                <p className="mt-0.5 text-[13px] font-bold tnum">{funded.length} orders</p>
              </div>
              <div>
                <p className="text-[9.5px] font-bold uppercase tracking-wide text-forest-300">In transit</p>
                <p className="mt-0.5 text-[13px] font-bold tnum">{inTransit.length} orders</p>
              </div>
            </div>
            {unpaid.length > 0 && (
              <Button asChild variant="accent" size="sm" className="mt-4 w-full">
                <Link to={`/payment/${unpaid[0].id}`}>
                  Fund next order · {money(unpaid[0].total_price)}
                </Link>
              </Button>
            )}
          </div>

          <div className="rounded-card border border-line bg-white p-4 shadow-card">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Procurement shortcuts</p>
            <div className="mt-2.5 space-y-1">
              {[
                { to: '/commodities', icon: ShoppingBag, label: 'Spot exchange', note: 'Verified lots live now' },
                { to: '/cart', icon: CreditCard, label: 'Escrow basket', note: `${count} staged ${count === 1 ? 'line' : 'lines'}` },
                { to: '/orders', icon: Truck, label: 'Waybills & deliveries', note: 'Track carrier milestones' },
                { to: '/settlements', icon: Wallet, label: 'Settlement ledger', note: 'Milestone release history' },
                { to: '/messages', icon: MessageSquare, label: 'Grower messages', note: 'Negotiate volume directly' },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-sage-50"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-forest-50 text-forest-600">
                    <item.icon size={13} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-semibold text-ink">{item.label}</span>
                    <span className="block text-[10px] text-muted">{item.note}</span>
                  </span>
                  <ArrowUpRight size={13} className="shrink-0 text-muted" />
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-card border border-line bg-white p-4 shadow-card">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
              <Clock3 size={12} /> Delivery watch
            </p>
            {inTransit.length === 0 ? (
              <p className="mt-2 text-[11.5px] leading-5 text-muted">
                No shipments in motion. Confirmed orders appear here until silo acceptance.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {inTransit.slice(0, 3).map((order) => (
                  <li key={order.id} className="py-2.5">
                    <Link to={`/orders/${order.id}`} className="block">
                      <p className="break-words text-[12px] font-semibold text-ink">{order.produce?.commodity_name}</p>
                      <p className="flex items-center gap-1 text-[10px] text-muted">
                        <CalendarDays size={10} /> ETA {fmtDate(order.delivery_date)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
