import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, ArrowUpRight, Banknote, CalendarDays, CheckCircle2, Clock3, CreditCard,
  Landmark, Leaf, MapPin, Package, Plus, ShieldCheck, Sprout, TrendingUp, Truck, Wallet,
} from 'lucide-react'
import { Stat, Table, Th, Td, Tr, Skeleton, EmptyState } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { produceService, orderService } from '../lib/services'
import { escrowHeldNet, escrowReleasedNet } from '../lib/orders'
import { fmtDate, money, qtyUnit, unitOne } from '../lib/format'
import { useAuth } from '../store/auth'
import { parseError } from '../lib/utils'

export default function FarmerDashboard() {
  const { user } = useAuth()
  const [earnings, setEarnings] = useState(null)
  const [listings, setListings] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      produceService.earnings(),
      produceService.mine({ per_page: 50 }),
      orderService.list({ per_page: 50 }),
    ])
      .then(([earnRes, listRes, orderRes]) => {
        if (!active) return
        setEarnings(earnRes.data)
        setListings(listRes.data?.data || [])
        setOrders(orderRes.data?.data || [])
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

  const availableLots = listings.filter((lot) => lot.availability_status === 'available')
  const stockValue = availableLots.reduce((sum, lot) => sum + Number(lot.price || 0) * Number(lot.quantity || 0), 0)
  const inEscrow = orders.reduce((sum, order) => sum + escrowHeldNet(order), 0)
  const released = orders.reduce((sum, order) => sum + escrowReleasedNet(order), 0)
  const pendingOrders = orders.filter((order) => order.status === 'pending')

  const nextAction = useMemo(() => {
    if (pendingOrders.length > 0) return { label: `Confirm ${pendingOrders.length} new ${pendingOrders.length === 1 ? 'order' : 'orders'}`, to: '/orders' }
    if (listings.length === 0) return { label: 'Add your first produce', to: '/farmer/listings/create' }
    return { label: 'See my produce', to: '/farmer/listings' }
  }, [pendingOrders.length, listings.length])

  return (
    <div className="page-wrap page-pad">
      <div className="relative mb-6 overflow-hidden rounded-card border border-forest-200 bg-forest-900 p-6 text-white shadow-card sm:p-8">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-[0.1]" aria-hidden />
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-sprout-400/20 blur-3xl" aria-hidden />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl">
            <p className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-harvest-300">
              <Leaf size={13} /> My farm
            </p>
            <h1 className="mt-2 font-display text-[26px] font-extrabold leading-8 tracking-[-0.02em] text-white sm:text-[32px] sm:leading-10">
              Welcome, {user?.name?.split(' ')[0] || 'farmer'}.
            </h1>
            <p className="mt-2 max-w-lg text-[12.5px] leading-6 text-forest-100/75">
              {availableLots.length > 0
                ? `You have ${availableLots.length} ${availableLots.length === 1 ? 'listing' : 'listings'} for sale, worth ${money(stockValue)} at the farm.`
                : 'Add your produce so buyers can find you. Listing is free and takes about three minutes.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button asChild variant="accent" size="md">
                <Link to={nextAction.to}>
                  {nextAction.label} <ArrowRight size={15} />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="md" className="border border-white/20 text-white hover:bg-white/10">
                <Link to="/farmer/listings/create">
                  <Plus size={15} /> Add produce
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-forest-200">Your farm address</p>
            <p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold">
              <MapPin size={12} className="text-harvest-300" />
              {[user?.lga, user?.state].filter(Boolean).join(', ') || 'Add it in your profile'}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-[10px] text-forest-100/65">
              <ShieldCheck size={11} /> {user?.verification_status ? 'Identity verified' : 'Not verified yet — payments may be held'}
            </p>
          </div>
        </div>
      </div>

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
            <Stat icon={Banknote} label="Money received" value={money(earnings?.total_earnings ?? 0)} tone="sprout" hint="Sent to your bank account, after the platform fee" size="lg" />
            <Stat icon={Lock2} label="Money on hold" value={money(inEscrow)} tone="gold" hint="Waiting for pickup, checks or delivery, after the platform fee" size="lg" />
            <Stat icon={Sprout} label="For sale" value={availableLots.length} hint={`${listings.length} listings in total`} />
            <Stat icon={Truck} label="Orders" value={earnings?.total_orders ?? orders.length} tone="neutral" hint={`${earnings?.completed_orders ?? 0} finished`} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="font-display text-[15px] font-bold text-ink">Orders from buyers</h2>
                <p className="mt-0.5 text-[11px] text-muted">Buyers who have paid into escrow for your produce.</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/orders">All orders <ArrowRight size={13} /></Link>
              </Button>
            </div>

            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : orders.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No orders yet"
                description="Your produce is visible to buyers. An order will show here as soon as someone buys."
                className="border-0 shadow-none"
                action={<Button asChild><Link to="/farmer/listings">See my produce</Link></Button>}
              />
            ) : (
              <>
                <div className="hidden sm:block">
                  <Table minWidth={640}>
                    <thead>
                      <tr>
                        <Th>Order</Th>
                        <Th>Buyer</Th>
                        <Th>Commodity</Th>
                        <Th className="text-right">Value</Th>
                        <Th>Payment</Th>
                        <Th>Status</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 6).map((order) => (
                        <Tr key={order.id}>
                          <Td>
                            <Link to={`/orders/${order.id}`} className="font-semibold text-ink hover:text-forest-600">#{order.id}</Link>
                            <p className="text-[10px] text-muted">{fmtDate(order.order_date)}</p>
                          </Td>
                          <Td className="break-words">{order.buyer?.name || '—'}</Td>
                          <Td className="break-words">{order.produce?.commodity_name || 'Lot'}</Td>
                          <Td className="text-right font-semibold text-ink tnum">{money(order.total_price)}</Td>
                          <Td>
                            <Badge tone={order.payment_status === 'paid' ? 'verified' : 'pending'} size="sm">
                              {order.payment_status === 'paid' ? 'Paid' : 'Waiting'}
                            </Badge>
                          </Td>
                          <Td><StatusBadge status={order.status} size="sm" /></Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                <ul className="divide-y divide-line sm:hidden">
                  {orders.slice(0, 5).map((order) => (
                    <li key={order.id}>
                      <Link to={`/orders/${order.id}`} className="flex items-start justify-between gap-3 px-4 py-3.5">
                        <div className="min-w-0">
                          <p className="break-words text-[12.5px] font-semibold text-ink">{order.produce?.commodity_name || `Order #${order.id}`}</p>
                          <p className="text-[10.5px] text-muted">{order.buyer?.name || 'Buyer'} · {fmtDate(order.order_date)}</p>
                          <div className="mt-1"><StatusBadge status={order.status} size="sm" /></div>
                        </div>
                        <p className="shrink-0 text-[12.5px] font-bold text-ink tnum">{money(order.total_price)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="font-display text-[15px] font-bold text-ink">My produce</h2>
                <p className="mt-0.5 text-[11px] text-muted">Price and quantity as buyers see it.</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/farmer/listings">Manage produce <ArrowUpRight size={13} /></Link>
              </Button>
            </div>
            {loading ? (
              <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : listings.length === 0 ? (
              <EmptyState
                icon={Sprout}
                title="Nothing for sale yet"
                description="Add your first produce with the amount and your price. A photo helps buyers decide faster."
                className="border-0 shadow-none"
                action={<Button asChild><Link to="/farmer/listings/create">Add produce</Link></Button>}
              />
            ) : (
              <ul className="divide-y divide-line">
                {listings.slice(0, 5).map((lot) => (
                  <li key={lot.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sage-100 text-forest-500">
                      <Sprout size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link to={`/commodities/${lot.id}`} className="break-words text-[12.5px] font-semibold text-ink hover:text-forest-600">
                        {lot.commodity_name}
                      </Link>
                      <p className="text-[10.5px] text-muted tnum">
                        {qtyUnit(lot.quantity, lot.unit)} · {money(lot.price)}/{unitOne(lot.unit)}
                      </p>
                    </div>
                    <Badge tone={lot.availability_status === 'available' ? 'verified' : 'neutral'} size="sm">
                      {lot.availability_status === 'available' ? 'Live' : lot.availability_status?.replace('_', ' ')}
                    </Badge>
                    <Button asChild variant="ghost" size="icon-sm">
                      <Link to={`/farmer/listings/${lot.id}/edit`} aria-label={`Edit ${lot.commodity_name}`}>
                        <ArrowUpRight size={14} />
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Your money</p>
              <Landmark size={15} className="text-forest-500" />
            </div>
            <p className="mt-2 font-display text-[27px] font-extrabold leading-8 tracking-tight text-forest-600 tnum">{money(inEscrow)}</p>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              {pendingOrders.length > 0
                ? `${pendingOrders.length} ${pendingOrders.length === 1 ? 'order is' : 'orders are'} waiting for your confirmation.`
                : 'Held safely until the weight and quality checks are done and the buyer signs.'}
            </p>
            <div className="mt-4 space-y-2 border-t border-line pt-3">
              <div className="flex justify-between text-[11.5px]">
                <span className="text-muted">Released from escrow</span>
                <span className="font-semibold text-forest-600 tnum">{money(released)}</span>
              </div>
              <div className="flex justify-between text-[11.5px]">
                <span className="text-muted">Released, not sent yet</span>
                <span className="font-semibold text-harvest-600 tnum">{money(earnings?.pending_earnings ?? 0)}</span>
              </div>
            </div>
            <Button asChild size="sm" className="mt-4 w-full">
              <Link to="/farmer/payouts"><Wallet size={14} /> My payments</Link>
            </Button>
          </div>

          <div className="rounded-card border border-line bg-white p-4 shadow-card">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">What to do next</p>
            <div className="mt-2 space-y-1">
              {[
                pendingOrders.length > 0
                  ? { icon: Clock3, label: `Confirm ${pendingOrders.length} new orders`, note: 'Accept before pickup', to: '/orders' }
                  : { icon: CheckCircle2, label: 'No orders to confirm', note: 'You are up to date', to: '/orders' },
                { icon: Plus, label: 'Add new produce', note: 'Free · about 3 minutes', to: '/farmer/listings/create' },
                { icon: CreditCard, label: 'See your payments', note: 'Every payment we sent you', to: '/farmer/payouts' },
                { icon: ShieldCheck, label: 'Finish your profile', note: 'Needed before your first payment', to: '/profile' },
              ].map((task) => (
                <Link key={task.label} to={task.to} className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-sage-50">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-forest-50 text-forest-600">
                    <task.icon size={13} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11.5px] font-semibold text-ink">{task.label}</span>
                    <span className="block text-[10px] text-muted">{task.note}</span>
                  </span>
                  <ArrowUpRight size={12} className="shrink-0 text-muted" />
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-card border border-forest-100 bg-forest-50 p-4">
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-forest-700">
              <TrendingUp size={13} /> Value for sale
            </p>
            <p className="mt-1 font-display text-[20px] font-extrabold text-forest-700 tnum">{money(stockValue)}</p>
            <p className="text-[10.5px] leading-4 text-forest-700/70">Farm value of the produce you have for sale.</p>
          </div>

          <div className="rounded-card border border-line bg-white p-4">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
              <CalendarDays size={12} /> Harvest calendar
            </p>
            {availableLots.length === 0 ? (
              <p className="mt-2 text-[11px] text-muted">Add produce to start selling.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {availableLots.slice(0, 3).map((lot) => (
                  <li key={lot.id} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="min-w-0 break-words text-muted">{lot.commodity_name}</span>
                    <span className="shrink-0 font-semibold text-ink">{fmtDate(lot.harvest_date, { month: 'short', day: 'numeric' })}</span>
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

function Lock2(props) {
  return <ShieldCheck {...props} />
}
