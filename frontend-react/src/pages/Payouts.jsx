import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Banknote, CalendarDays, Clock3, Download,
  Landmark, Lock, MessageSquare, ShieldCheck, Sprout, Truck, Wallet,
} from 'lucide-react'
import { PageHeader, Stat, Table, Th, Td, Tr, EmptyState, Skeleton, Progress } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { orderService, payoutService } from '../lib/services'
import { escrowHeldNet, escrowNetBase, escrowSchedule } from '../lib/orders'
import { fmtDate, money } from '../lib/format'
import { downloadCsv, parseError } from '../lib/utils'
import { useAuth } from '../store/auth'

function PayoutState({ payout }) {
  if (payout.status === 'paid') {
    return <Badge tone="verified" size="sm">Sent</Badge>
  }
  if (['sending', 'pending', 'otp'].includes(payout.transferStatus)) {
    return <Badge tone="pending" size="sm">Sending</Badge>
  }
  if (['failed', 'reversed'].includes(payout.transferStatus)) {
    return <Badge tone="critical" size="sm">Failed</Badge>
  }
  return <Badge tone="pending" size="sm">Ready to send</Badge>
}

export default function Payouts() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      orderService.list({ per_page: 100 }),
      payoutService.list({ per_page: 100 }),
    ])
      .then(([orderRes, payoutRes]) => {
        if (!active) return
        setOrders(orderRes.data?.data || [])
        setPayouts(payoutRes.data?.data || [])
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

  const held = orders.reduce((sum, order) => sum + escrowHeldNet(order), 0)
  const paidToYou = payouts
    .filter((payout) => payout.status === 'paid')
    .reduce((sum, payout) => sum + Number(payout.amount || 0), 0)
  const onTheWay = payouts
    .filter((payout) => payout.status !== 'paid' && ['sending', 'pending', 'otp'].includes(payout.transfer_status))
    .reduce((sum, payout) => sum + Number(payout.amount || 0), 0)
  const readyToSend = payouts
    .filter((payout) => payout.status === 'pending' && !['sending', 'pending', 'otp'].includes(payout.transfer_status))
    .reduce((sum, payout) => sum + Number(payout.amount || 0), 0)

  const events = useMemo(
    () =>
      [...payouts]
        .sort((a, b) => new Date(b.paid_at || b.created_at) - new Date(a.paid_at || a.created_at))
        .map((payout) => ({
          id: payout.id,
          order: payout.order,
          amount: Number(payout.amount || 0),
          base: Number(payout.base_amount ?? payout.amount ?? 0),
          fee: Number(payout.platform_fee || 0),
          feePercent: Number(payout.fee_percent || 0),
          status: payout.status,
          reference: payout.reference,
          label: payout.release?.milestone === 'quality'
            ? 'Main payment'
            : payout.release?.label || 'Payment',
          date: payout.paid_at || payout.created_at,
          transferStatus: payout.transfer_status,
          failureReason: payout.failure_reason,
        })),
    [payouts],
  )

  function exportStatement() {
    const rows = orders.map((order) => ({
      order_id: order.id,
      buyer: order.buyer?.name || '',
      commodity: order.produce?.commodity_name || '',
      total: order.total_price,
      base: escrowNetBase(order),
      released: payouts
        .filter((payout) => payout.order_id === order.id)
        .reduce((sum, payout) => sum + Number(payout.amount || 0), 0),
      held: escrowHeldNet(order),
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
        description="Money we have paid you, money still in escrow, and the record for each order."
        actions={
          <>
            <Button asChild variant="outline" size="md">
              <Link to="/orders"><Truck size={15} /> Delivery notes</Link>
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

      {!loading && !user?.account_number && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-harvest-200 bg-harvest-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <Landmark size={16} className="mt-0.5 shrink-0 text-harvest-600" />
            <div>
              <p className="text-[12.5px] font-semibold text-harvest-600">Add your bank account to get paid</p>
              <p className="text-[11px] leading-4 text-harvest-600/85">
                Money can be released for you, but it cannot leave escrow until your bank details are saved.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/profile?tab=payout">Add bank details</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[108px] rounded-card" />)
        ) : (
          <>
            <Stat icon={Banknote} label="Paid to you" value={money(paidToYou)} tone="sprout" hint="Bank transfers sent to you" size="lg" />
            <Stat icon={Clock3} label="On the way" value={money(onTheWay)} tone="gold" hint="Bank transfer started" size="lg" />
            <Stat icon={Wallet} label="Ready to send" value={money(readyToSend)} hint="Released, waiting for the transfer" />
            <Stat icon={Lock} label="In escrow" value={money(held)} hint="Released step by step, or held for review" />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="font-display text-[15px] font-bold text-ink">Your payouts</h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  Each line is money released from escrow for you, already net of the platform fee.
                </p>
              </div>
              <Badge tone="verified" size="sm"><ShieldCheck size={11} /> Saved record</Badge>
            </div>

            {loading ? (
              <div className="space-y-2 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : events.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No payments yet"
                description="The first 10% is released when the transporter marks the goods as picked up. Make sure your orders are confirmed and paid."
                className="border-0 shadow-none"
                action={<Button asChild><Link to="/orders">See my orders</Link></Button>}
              />
            ) : (
              <>
                <div className="hidden sm:block">
                  <Table minWidth={720}>
                    <thead>
                      <tr>
                        <Th>Date</Th>
                        <Th>Order</Th>
                        <Th>Part</Th>
                        <Th>Reference</Th>
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
                          <Td className="text-[11.5px] font-semibold text-ink">{event.label}</Td>
                          <Td className="font-mono text-[10px] text-muted">{event.reference}</Td>
                          <Td className="text-right">
                            <p className="font-semibold text-forest-600 tnum">{money(event.amount)}</p>
                            {event.fee > 0 && (
                              <p className="text-[9.5px] text-muted tnum">
                                {money(event.base)} − {money(event.fee)} fee
                              </p>
                            )}
                          </Td>
                          <Td>
                            <PayoutState payout={event} />
                            {event.status !== 'paid' && event.failureReason && (
                              <p className="mt-0.5 max-w-[170px] text-[9.5px] leading-3 text-critical-600">
                                {event.failureReason}
                              </p>
                            )}
                          </Td>
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
                          <p className="text-[12.5px] font-semibold text-ink">{event.label}</p>
                          <p className="text-[10.5px] text-muted">
                            Order #{event.order?.id} · {fmtDate(event.date)}
                          </p>
                          <p className="mt-0.5 font-mono text-[9.5px] text-muted">{event.reference}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[13px] font-bold text-forest-600 tnum">{money(event.amount)}</p>
                          {event.fee > 0 && (
                            <p className="text-[9.5px] text-muted tnum">{money(event.base)} − {money(event.fee)} fee</p>
                          )}
                          <div className="mt-1 flex justify-end"><PayoutState payout={event} /></div>
                          {event.status !== 'paid' && event.failureReason && (
                            <p className="mt-1 max-w-[160px] text-[9.5px] leading-3 text-critical-600">{event.failureReason}</p>
                          )}
                        </div>
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
                <p className="mt-0.5 text-[11px] text-muted">What we paid and what is still in escrow.</p>
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
                  const total = escrowNetBase(order)
                  const orderReleased = payouts
                    .filter((payout) => payout.order_id === order.id)
                    .reduce((sum, payout) => sum + Number(payout.amount || 0), 0)
                  const pct = total ? Math.min(100, Math.round((orderReleased / total) * 100)) : 0
                  const nextPart = escrowSchedule(order).find(
                    (part) => part.state === 'in_progress' || part.state === 'held',
                  )
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
                      {nextPart && (
                        <p className="mt-1.5 text-[10.5px] leading-4 text-muted">
                          Next: <span className="font-semibold text-ink-soft">{nextPart.title}</span>
                          {nextPart.stateLabel ? ` · ${nextPart.stateLabel}` : ''}
                        </p>
                      )}
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
              <p className="mt-0.5 break-words text-[12.5px] font-bold text-ink">
                {user?.account_name || user?.name}
              </p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted">Bank account</p>
              <p className="mt-0.5 break-words text-[11.5px] text-ink-soft">
                {user?.account_number
                  ? `${user.bank_name || 'Bank'} · ****${String(user.account_number).slice(-4)}`
                  : 'No account saved yet'}
              </p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted">Paid through</p>
              <p className="mt-0.5 text-[11.5px] text-ink-soft">Bank transfer</p>
            </div>
            <p className="mt-2.5 text-[10.5px] leading-4 text-muted">
              {user?.account_number
                ? 'Only the last 4 digits are shown here. You can change the account yourself.'
                : 'Money released for you cannot leave escrow until you add a bank account.'}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3 w-full">
              <Link to="/profile?tab=payout">
                <Landmark size={13} />
                {user?.account_number ? 'Change payout account' : 'Add payout account'}
              </Link>
            </Button>
          </div>

          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">How payment works</p>
            <ol className="mt-2.5 space-y-3">
              {[
                { label: 'Goods picked up', note: '10% on pickup' },
                { label: 'Buyer confirms the goods', note: '60% main payment and 30% final payment' },
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
            <p className="mt-3 border-t border-line pt-2.5 text-[10.5px] leading-4 text-muted">
              A platform fee is taken from each part before it reaches your bank, so the amounts above are what you
              receive.
            </p>
          </div>

          <div className="rounded-card border border-forest-100 bg-forest-50 p-4">
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-forest-700">
              <MessageSquare size={13} /> Need help with a payment?
            </p>
            <p className="mt-1 text-[10.5px] leading-4 text-forest-700/75">
              Send us a message from the Messages page and we will check it with you.
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
