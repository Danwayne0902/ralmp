import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowUpRight, CalendarDays, CreditCard, MapPin, Package, Plus, Search,
  ShoppingBag, Truck, User as UserIcon,
} from 'lucide-react'
import { PageHeader, Stat, Table, Th, Td, Tr, EmptyState, Pagination, Skeleton } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Tabs } from '../components/ui/Tabs'
import { orderService } from '../lib/services'
import { ORDER_STATUSES } from '../lib/orders'
import { fmtDate, money, qtyUnit, roleLabel } from '../lib/format'
import { useAuth } from '../store/auth'
import { parseError } from '../lib/utils'

export default function Orders() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState([])
  const [meta, setMeta] = useState({ total: 0, pages: 1, current: 1 })
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  const status = searchParams.get('status') || ''
  const page = Number(searchParams.get('page') || 1)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    orderService
      .list({ status: status || undefined, page, per_page: 12 })
      .then((res) => {
        if (!active) return
        const payload = res.data || {}
        setOrders(payload.data || [])
        setMeta({
          total: payload.total || 0,
          pages: payload.last_page || 1,
          current: payload.current_page || 1,
        })
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
  }, [status, page])

  useEffect(() => {
    orderService
      .stats()
      .then((res) => setStats(res.data))
      .catch(() => {})
  }, [])

  const isFarmer = user?.role === 'farmer'
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return orders
    return orders.filter((order) =>
      [
        String(order.id),
        order.produce?.commodity_name,
        order.buyer?.name,
        order.farmer?.name,
        order.payment_reference,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    )
  }, [orders, q])

  function setParam(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setSearchParams(next)
  }

  const counterparty = (order) => (isFarmer ? order.buyer : order.farmer)

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow={isFarmer ? 'My sales' : 'My orders'}
        title="Orders"
        description={
          isFarmer
            ? 'Every order for your produce, with the buyer, payment and delivery state.'
            : 'Track payments, transport and delivery in one place.'
        }
        actions={
          isFarmer ? (
            <Button asChild>
              <Link to="/farmer/listings/create">
                <Plus size={15} /> Add harvest
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/commodities">
                <ShoppingBag size={15} /> Procure more
              </Link>
            </Button>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats ? (
          <>
            <Stat icon={Package} label="All orders" value={stats.total_orders ?? 0} hint="Every order you have" />
            <Stat icon={CreditCard} label="Waiting to pay" value={stats.pending_orders ?? 0} tone="gold" hint="Not paid or not confirmed" />
            <Stat icon={Truck} label="Finished" value={stats.completed_orders ?? 0} tone="sprout" hint="Delivered and accepted" />
            <Stat icon={CalendarDays} label="Total value" value={money(stats.total_revenue ?? 0)} tone="neutral" hint="Value of these orders" />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-card" />)
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={status || 'all'}
          onValueChange={(value) => setParam('status', value === 'all' ? '' : value)}
          items={[{ value: 'all', label: 'All', count: meta.total }, ...ORDER_STATUSES.slice(1).map((item) => ({ value: item.value, label: item.label }))]}
          size="sm"
          className="min-w-0 flex-1"
        />
        <div className="flex h-9 items-center gap-2 rounded-btn border border-line bg-white px-3">
          <Search size={14} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search this page"
            aria-label="Filter orders on this page"
            className="h-full w-40 bg-transparent text-[12px] outline-none placeholder:text-muted/60"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-card border border-critical-200 bg-critical-50 px-4 py-3 text-[12.5px] text-critical-600">
          {error}
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-card border border-line bg-white shadow-card">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={status ? `No ${status} orders` : 'No orders yet'}
            description={
              isFarmer
                ? 'When a buyer pays for your produce, the order appears here with the payment state.'
                : 'Pick produce from the marketplace to place your first order.'
            }
            className="border-0 shadow-none"
            action={
              isFarmer ? (
                <Button asChild variant="outline"><Link to="/farmer/listings">See my produce</Link></Button>
              ) : (
                <Button asChild><Link to="/commodities">See what is for sale</Link></Button>
              )
            }
          />
        ) : (
          <>
            {/* Desktop ledger */}
            <div className="hidden lg:block">
              <Table minWidth={900}>
                <thead>
                  <tr>
                    <Th>Order</Th>
                    <Th>{isFarmer ? 'Buyer' : 'Farmer'}</Th>
                    <Th>Commodity</Th>
                    <Th className="text-right">Value</Th>
                    <Th>Payment</Th>
                    <Th>Status</Th>
                    <Th>Delivery</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order) => {
                    const party = counterparty(order)
                    return (
                      <Tr key={order.id} className="cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
                        <Td>
                          <p className="font-semibold text-ink">#{order.id}</p>
                          <p className="text-[10.5px] text-muted">{fmtDate(order.order_date || order.created_at)}</p>
                        </Td>
                        <Td>
                          <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-soft">
                            <UserIcon size={12} className="text-muted" />
                            {party?.name || '—'}
                          </p>
                          <p className="text-[10.5px] text-muted">{roleLabel(party ? (isFarmer ? 'buyer' : 'farmer') : '')}</p>
                        </Td>
                        <Td>
                          <p className="break-words text-[12.5px] font-medium text-ink-soft">
                            {order.produce?.commodity_name || order.items?.[0]?.produce?.commodity_name || 'Lot withdrawn'}
                          </p>
                          <p className="text-[10.5px] text-muted tnum">
                            {qtyUnit(order.quantity, order.produce?.unit || order.items?.[0]?.produce?.unit || 'units')}
                          </p>
                        </Td>
                        <Td className="text-right">
                          <p className="font-semibold text-ink tnum">{money(order.total_price)}</p>
                          <p className="text-[10.5px] text-muted tnum">delivery {money(order.delivery_fee)}</p>
                        </Td>
                        <Td>
                          <Badge tone={order.payment_status === 'paid' ? 'verified' : 'pending'} size="sm">
                            {order.payment_status === 'paid' ? 'Funded' : 'Unfunded'}
                          </Badge>
                        </Td>
                        <Td><StatusBadge status={order.status} size="sm" /></Td>
                        <Td>
                          <p className="flex items-center gap-1 text-[12px] text-ink-soft">
                            <CalendarDays size={11} className="text-muted" /> {fmtDate(order.delivery_date)}
                          </p>
                          {order.delivery?.tracking_number && (
                            <p className="text-[10px] text-muted tnum">WB {order.delivery.tracking_number}</p>
                          )}
                        </Td>
                        <Td className="text-right">
                          <ArrowUpRight size={15} className="text-muted" />
                        </Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-line lg:hidden">
              {filtered.map((order) => {
                const party = counterparty(order)
                return (
                  <li key={order.id}>
                    <Link to={`/orders/${order.id}`} className="block px-4 py-4 transition active:bg-sage-50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted">Order #{order.id}</p>
                          <p className="mt-0.5 break-words text-[14px] font-bold text-ink">
                            {order.produce?.commodity_name || order.items?.[0]?.produce?.commodity_name || 'Lot withdrawn'}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-muted">
                            <UserIcon size={11} /> {party?.name || '—'}
                          </p>
                        </div>
                        <StatusBadge status={order.status} size="sm" />
                      </div>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge tone={order.payment_status === 'paid' ? 'verified' : 'pending'} size="sm">
                            {order.payment_status === 'paid' ? 'Funded' : 'Unfunded'}
                          </Badge>
                          <Badge tone="neutral" size="sm">
                            <CalendarDays size={10} /> {fmtDate(order.delivery_date)}
                          </Badge>
                        </div>
                        <p className="font-display text-[17px] font-extrabold text-forest-600 tnum">
                          {money(order.total_price)}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      <Pagination
        className="mt-5"
        page={meta.current}
        pages={meta.pages}
        total={meta.total}
        perPage={12}
        onChange={(next) => setParam('page', String(next))}
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { icon: CreditCard, title: 'Payment made', body: 'The buyer pays before the farmer sends the goods.' },
          { icon: Truck, title: 'Delivery note', body: 'The transporter and the weight are added to the order.' },
          { icon: MapPin, title: 'Goods received', body: 'The last part is paid when the buyer signs for the goods.' },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-2.5 rounded-xl border border-line bg-white px-3.5 py-3">
            <item.icon size={14} className="mt-0.5 shrink-0 text-forest-500" />
            <div>
              <p className="text-[11.5px] font-semibold text-ink">{item.title}</p>
              <p className="text-[10.5px] leading-4 text-muted">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
