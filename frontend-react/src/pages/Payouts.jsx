import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Banknote, CalendarDays, CheckCircle2, Clock3, Download,
  Landmark, Lock, MessageSquare, Phone, ShieldCheck, Sprout, Truck, Wallet,
} from 'lucide-react'
import { PageHeader, Stat, Table, Th, Td, Tr, EmptyState, Skeleton, Progress } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { produceService, orderService } from '../lib/services'
import { escrowSchedule, escrowReleased } from '../lib/orders'
import { fmtDate, money } from '../lib/format'
import { downloadCsv, parseError } from '../lib/utils'
import { useAuth } from '../store/auth'

export default function Payouts() {
  const { user } = useAuth()
  const [earnings, setEarnings] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([produceService.earnings(), orderService.list({ per_page: 100 })])
      .then(([earnRes, orderRes]) => {
        if (!active) return
        setEarnings(earnRes.data)
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

  const heldOrders = orders.filter(
    (order) =>
      order.payment_status === 'paid' &&
      !['cancelled', 'rejected'].includes(order.status) &&
      Number(order.total_price || 0) > escrowReleased(order),
  )
  const held = heldOrders.reduce((sum, order) => sum + Math.max(0, Number(order.total_price || 0) - escrowReleased(order)), 0)
  const released = orders.reduce((sum, order) => sum + escrowReleased(order), 0)
  const paid = orders.filter((order) => order.payment_status === 'paid').length
  const completed = orders.filter((order) => ['delivered', 'completed'].includes(order.status)).length

  const events = useMemo(() => {
    const rows = []
    orders.forEach((order) => {
      escrowSchedule(order)
        .filter((tranche) => tranche.state === 'settled')
        .forEach((tranche) => {
          rows.push({
            id: `${order.id}-${tranche.key}`,
            order,
            tranche,
            date: order.paid_at || order.updated_at || order.created_at,
          })
        })
    })
    return rows.sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [orders])

  function exportStatement() {
    const rows = orders.map((order) => ({
      order_id: order.id,
      buyer: order.buyer?.name || '',
      commodity: order.produce?.commodity_name || '',
      total: order.total_price,
      released: escrowReleased(order),
      held: Math.max(0, Number(order.total_price || 0) - escrowReleased(order)),
      order_status: order.status,
      payment_status: order.payment_status,
      date: order.order_date,
    }))
    downloadCsv(`ralmp-payout-statement-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="My money"
        title="My payments"
        description="Money we have paid you, money still on hold, and the record for each order."
        actions={
          <>
            <Button asChild variant="outline" size="md">
              <Link to="/orders"><Truck size={15} /> Waybills</Link>
            </Button>
            <Button variant="outline" size="md" onClick={exportStatement} disabled={!orders.length}>
              <Download size={15} /> Download statement
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
            <Stat icon={Banknote} label="Paid to you" value={money(released)} tone="sprout" hint="Payments already sent" size="lg" />
            <Stat icon={Lock} label="On hold" value={money(held)} tone="gold" hint="Waiting for delivery proof" size="lg" />
            <Stat icon={Clock3} label="Not confirmed yet" value={money(earnings?.pending_earnings ?? 0)} hint="Orders you have not accepted" />
            <Stat icon={CheckCircle2} label="Finished orders" value={completed} tone="neutral" hint={`${paid} paid orders in total`} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="font-display text-[15px] font-bold text-ink">Payments sent to you</h2>
                <p className="mt-0.5 text-[11px] text-muted">Each line is money we sent to your account.</p>
              </div>
              <Badge tone="verified" size="sm"><ShieldCheck size={11} /> Evidence-backed</Badge>
            </div>

            {loading ? (
              <div className="space-y-2 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : events.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No payments yet"
                description="The first 10% is paid when the transporter sends the pickup weight note. Make sure your orders are confirmed and paid."
                className="border-0 shadow-none"
                action={<Button asChild><Link to="/orders">See my orders</Link></Button>}
              />
            ) : (
              <>
                <div className="hidden sm:block">
                  <Table minWidth={720}>
                    <thead>
                      <tr>
                        <Th>Released</Th>
                        <Th>Order</Th>
                        <Th>Part</Th>
                        <Th>Why we paid</Th>
                        <Th className="text-right">Amount</Th>
                        <Th>State</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((event) => (
                        <Tr key={event.id}>
                          <Td className="text-[11.5px] text-muted">{fmtDate(event.date)}</Td>
                          <Td>
                            <Link to={`/orders/${event.order.id}`} className="font-semibold text-ink hover:text-forest-600">
                              #{event.order.id}
                            </Link>
                            <p className="break-words text-[10.5px] text-muted">
                              {event.order.produce?.commodity_name || 'Lot'}
                            </p>
                          </Td>
                          <Td className="text-[11.5px]">
                            <span className="font-semibold text-ink">{Math.round(event.tranche.share * 100)}%</span>
                            <span className="ml-1 text-muted">{event.tranche.short}</span>
                          </Td>
                          <Td className="text-[10.5px] leading-4 text-muted">{event.tranche.trigger}</Td>
                          <Td className="text-right font-semibold text-forest-600 tnum">{money(event.tranche.amount)}</Td>
                          <Td><Badge tone="verified" size="sm">Paid</Badge></Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                <ul className="divide-y divide-line sm:hidden">
                  {events.map((event) => (
                    <li key={event.id} className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-semibold text-ink">
                            {Math.round(event.tranche.share * 100)}% · {event.tranche.short}
                          </p>
                          <p className="text-[10.5px] text-muted">
                            Order #{event.order.id} · {fmtDate(event.date)}
                          </p>
                        </div>
                        <p className="shrink-0 text-[13px] font-bold text-forest-600 tnum">{money(event.tranche.amount)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="font-display text-[15px] font-bold text-ink">Order balances</h2>
                <p className="mt-0.5 text-[11px] text-muted">What we paid and what is still on hold.</p>
              </div>
              <span className="text-[10.5px] text-muted">{orders.length} orders</span>
            </div>

            {loading ? (
              <div className="space-y-2 p-5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : orders.length === 0 ? (
              <EmptyState
                icon={Sprout}
                title="No orders yet"
                description="Add produce and accept orders to start getting paid."
                className="border-0 shadow-none"
                action={<Button asChild><Link to="/farmer/listings/create">Add produce</Link></Button>}
              />
            ) : (
              <ul className="divide-y divide-line">
                {orders.map((order) => {
                  const total = Number(order.total_price || 0)
                  const orderReleased = escrowReleased(order)
                  const pct = total ? Math.round((orderReleased / total) * 100) : 0
                  return (
                    <li key={order.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link to={`/orders/${order.id}`} className="text-[12.5px] font-semibold text-ink hover:text-forest-600">
                            {order.produce?.commodity_name || `Order #${order.id}`}
                          </Link>
                          <p className="text-[10.5px] text-muted">
                            #{order.id} · {order.buyer?.name || 'Buyer'} · {fmtDate(order.order_date)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={order.status} size="sm" />
                          <span className="text-[11.5px] font-bold text-ink tnum">{money(orderReleased)} / {money(total)}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={pct} tone={pct === 100 ? 'sprout' : 'forest'} />
                        <span className="w-8 shrink-0 text-right text-[10px] font-semibold text-muted tnum">{pct}%</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
              <Landmark size={12} /> Payout destination
            </p>
            <div className="mt-3 rounded-xl border border-line bg-canvas px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Account name</p>
              <p className="mt-0.5 text-[12.5px] font-bold text-ink">{user?.name}</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted">Paid through</p>
              <p className="mt-0.5 text-[11.5px] text-ink-soft">Fast bank transfer to your verified account</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted">Verification</p>
              <Badge tone={user?.verification_status ? 'verified' : 'pending'} size="sm" className="mt-1">
                {user?.verification_status ? 'Verified' : 'Not verified yet'}
              </Badge>
            </div>
            <p className="mt-2.5 text-[10.5px] leading-4 text-muted">
              We keep your bank details private and never show them here. To change them, send us a message.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3 w-full">
              <Link to={`/messages?to=1`}>
                <MessageSquare size={13} /> Message our team
              </Link>
            </Button>
          </div>

          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">How payment works</p>
            <ol className="mt-2.5 space-y-3">
              {[
                { label: 'Goods picked up', note: '10% on pickup' },
                { label: 'Weight and quality checked', note: '60% when the check passes' },
                { label: 'Goods delivered', note: '30% when the buyer signs' },
              ].map((step, index) => (
                <li key={step.label} className="flex gap-2.5">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest-50 text-[9px] font-bold text-forest-600">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[11.5px] font-semibold text-ink">{step.label}</p>
                    <p className="text-[10px] text-muted">{step.note}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-card border border-forest-100 bg-forest-50 p-4">
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-forest-700">
              <Phone size={13} /> Need help with a payment?
            </p>
            <p className="mt-1 text-[10.5px] leading-4 text-forest-700/75">
              Call the trade desk on <a href="tel:+2348000725670" className="font-semibold underline">+234 800 072 5670</a>.
              We can check any payment with you.
            </p>
          </div>

          <div className="rounded-card border border-line bg-white p-4">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
              <CalendarDays size={12} /> Statement
            </p>
            <p className="mt-1.5 text-[11px] leading-5 text-muted">
              The downloadable statement covers every order, its total value, released amount and remaining balance.
            </p>
            <Button variant="outline" size="sm" className="mt-2.5 w-full" onClick={exportStatement} disabled={!orders.length}>
              <Download size={13} /> Export CSV
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
