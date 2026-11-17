import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight, CalendarDays, CheckCircle2, CircleAlert, Clock3, Eye, FileWarning,
  Gavel, Landmark, Lock, RefreshCw, Scale, Search, ShieldCheck, Snowflake, Truck, Wallet, X,
} from 'lucide-react'
import { PageHeader, Stat, Table, Th, Td, Tr, EmptyState, Skeleton } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Tabs } from '../components/ui/Tabs'
import { adminService } from '../lib/services'
import { escrowReleased } from '../lib/orders'
import { fmtDateTime, money } from '../lib/format'
import { parseError } from '../lib/utils'

const SEVERITY = {
  critical: { label: 'Critical', tone: 'critical', rank: 0 },
  high: { label: 'High', tone: 'pending', rank: 1 },
  medium: { label: 'Review', tone: 'gold', rank: 2 },
  closed: { label: 'Closed', tone: 'neutral', rank: 3 },
}

function daysSince(value) {
  if (!value) return 0
  const diff = Date.now() - new Date(value).getTime()
  return Math.max(0, Math.floor(diff / 86400000))
}

export default function AdminDisputes() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('open')
  const [q, setQ] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await adminService.orders({ per_page: 100 })
      setOrders(res.data?.data || [])
    } catch (err) {
      setError(parseError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exceptions = useMemo(() => {
    const rows = []

    orders.forEach((order) => {
      const total = Number(order.total_price || 0)
      const paid = order.payment_status === 'paid'
      const age = daysSince(order.created_at)
      const commodity = order.produce?.commodity_name || order.items?.[0]?.produce?.commodity_name || `Order #${order.id}`
      const base = {
        id: `order-${order.id}`,
        orderId: order.id,
        commodity,
        total,
        buyer: order.buyer?.name,
        farmer: order.farmer?.name,
        date: order.created_at,
        status: order.status,
        href: `/orders/${order.id}`,
      }

      if (['cancelled', 'rejected'].includes(order.status)) {
        rows.push({
          ...base,
          kind: 'reversal',
          severity: 'closed',
          trigger: order.status === 'rejected' ? 'Order rejected after commitment' : 'Order cancelled',
          detail: paid
            ? 'The buyer paid. Our team must confirm the refund before the file is closed.'
            : 'No money was taken. The stock went back to the farmer listing.',
          action: paid ? 'Confirm refund' : 'Verify stock restoration',
        })
        return
      }

      if (!paid && age >= 1) {
        rows.push({
          ...base,
          kind: 'unfunded',
          severity: age >= 3 ? 'critical' : 'high',
          trigger: 'Order not paid in time',
          detail: `Order placed ${age} ${age === 1 ? 'day' : 'days'} ago and still not paid. The stock is being held for this buyer.`,
          action: 'Ask the buyer or release the stock',
        })
      }

      if (paid && ['pending'].includes(order.status) && age >= 2) {
        rows.push({
          ...base,
          kind: 'dormant',
          severity: 'high',
          trigger: 'Paid order not accepted by the farmer',
          detail: 'The buyer has paid but the farmer has not accepted the order. The money cannot move until they do.',
          action: 'Contact farmer',
        })
      }

      if (['processing'].includes(order.status) && !order.delivery?.tracking_number && age >= 2) {
        rows.push({
          ...base,
          kind: 'waybill',
          severity: 'medium',
          trigger: 'Being prepared without a delivery note',
          detail: 'No delivery note is attached to the order. The weight record will be missing at drop-off.',
          action: 'Add transporter and delivery note',
        })
      }

      if (['shipped'].includes(order.status) && !order.delivery?.tracking_number) {
        rows.push({
          ...base,
          kind: 'waybill',
          severity: 'critical',
          trigger: 'On the way without a delivery note',
          detail: 'The order is marked as sent but there is no delivery note. The two weight records cannot be matched.',
          action: 'Add the delivery note now',
        })
      }

      if (['delivered'].includes(order.status) && paid && escrowReleased(order) < total) {
        rows.push({
          ...base,
          kind: 'release',
          severity: 'medium',
          trigger: 'Delivered but payment still on hold',
          detail: 'The goods are marked delivered but the last payment has not been checked. Confirm the buyer signed before paying.',
          action: 'Check the final payment',
        })
      }

      if (['shipped', 'processing'].includes(order.status) && order.delivery_date && new Date(order.delivery_date) < new Date() && daysSince(order.delivery_date) >= 1) {
        rows.push({
          ...base,
          kind: 'sla',
          severity: 'medium',
          trigger: 'Delivery window exceeded',
          detail: `The requested delivery date passed ${daysSince(order.delivery_date)} ${daysSince(order.delivery_date) === 1 ? 'day' : 'days'} ago and the order is not delivered.`,
          action: 'Request carrier status',
        })
      }
    })

    return rows.sort((a, b) => SEVERITY[a.severity].rank - SEVERITY[b.severity].rank)
  }, [orders])

  const open = exceptions.filter((row) => row.severity !== 'closed')
  const closed = exceptions.filter((row) => row.severity === 'closed')

  const filtered = useMemo(() => {
    const rows = tab === 'open' ? open : tab === 'closed' ? closed : exceptions
    if (!q.trim()) return rows
    const term = q.trim().toLowerCase()
    return rows.filter((row) =>
      [row.commodity, row.buyer, row.farmer, row.trigger, String(row.orderId)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    )
  }, [tab, open, closed, exceptions, q])

  const exposure = useMemo(
    () => open.filter((row) => ['unfunded', 'dormant'].includes(row.kind)).reduce((sum, row) => sum + row.total, 0),
    [open],
  )
  const criticalCount = open.filter((row) => row.severity === 'critical').length
  const reversed = closed.reduce((sum, row) => sum + row.total, 0)

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="Complaints"
        title="Complaints and orders on hold"
        description="Each item comes from a real order: unpaid orders, missing delivery notes, old orders and refunds. Nothing here is made up."
        actions={
          <>
            <Button variant="outline" size="md" onClick={load} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh queue
            </Button>
            <Button asChild variant="outline" size="md">
              <Link to="/admin/quality"><FileWarning size={15} /> Quality checks</Link>
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
        <Stat icon={CircleAlert} label="Open exceptions" value={open.length} tone={criticalCount > 0 ? 'critical' : 'gold'} hint={`${criticalCount} at critical severity`} />
        <Stat icon={Wallet} label="Money at risk" value={money(exposure)} tone="gold" hint="Unpaid or stalled orders" size="lg" />
        <Stat icon={Snowflake} label="Refunds" value={money(reversed)} tone="neutral" hint={`${closed.length} cancelled or rejected orders`} size="lg" />
        <Stat icon={ShieldCheck} label="Orders checked" value={orders.length} tone="sprout" hint="Orders reviewed for problems" />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onValueChange={setTab}
          items={[
            { value: 'open', label: 'Open queue', count: open.length },
            { value: 'closed', label: 'Closed / reversed', count: closed.length },
            { value: 'all', label: 'All exceptions', count: exceptions.length },
          ]}
          size="sm"
        />
        <div className="flex h-9 items-center gap-2 rounded-btn border border-line bg-white px-3">
          <Search size={14} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by order, person or problem"
            aria-label="Filter exceptions"
            className="h-full w-48 bg-transparent text-[12px] outline-none placeholder:text-muted/60"
          />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-card border border-line bg-white shadow-card">
        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={tab === 'open' ? 'No open exceptions' : 'Nothing in this view'}
            description={
              orders.length === 0
                ? 'There are no orders yet. A problem will show here automatically when an order needs attention.'
                : 'Every order is within its time window. New problems will show here as they come up.'
            }
            className="border-0 shadow-none"
            action={<Button variant="outline" onClick={load}><RefreshCw size={14} /> Check again</Button>}
          />
        ) : (
          <>
            <div className="hidden lg:block">
              <Table minWidth={980}>
                <thead>
                  <tr>
                    <Th>Severity</Th>
                    <Th>Order</Th>
                    <Th>Problem</Th>
                    <Th>People</Th>
                    <Th className="text-right">Amount</Th>
                    <Th>Order status</Th>
                    <Th>Age</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const severity = SEVERITY[row.severity]
                    return (
                      <Tr key={`${row.id}-${row.kind}`}>
                        <Td>
                          <Badge tone={severity.tone} size="sm">{severity.label}</Badge>
                        </Td>
                        <Td>
                          <Link to={row.href} className="font-semibold text-ink hover:text-forest-600">
                            #{row.orderId}
                          </Link>
                          <p className="break-words text-[10.5px] text-muted">{row.commodity}</p>
                        </Td>
                        <Td>
                          <p className="text-[11.5px] font-medium text-ink-soft">{row.trigger}</p>
                          <p className="text-[10px] leading-4 text-muted">{row.detail}</p>
                        </Td>
                        <Td>
                          <p className="break-words text-[11px]">{row.buyer || '—'}</p>
                          <p className="break-words text-[10px] text-muted">→ {row.farmer || '—'}</p>
                        </Td>
                        <Td className="text-right font-semibold text-ink tnum">{money(row.total)}</Td>
                        <Td><StatusBadge status={row.status} size="sm" /></Td>
                        <Td className="text-[10.5px] text-muted">
                          <span className="flex items-center gap-1">
                            <Clock3 size={10} /> {daysSince(row.date)}d
                          </span>
                        </Td>
                        <Td>
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild variant="ghost" size="icon-sm">
                              <Link to={row.href} aria-label="Open order ledger"><Eye size={14} /></Link>
                            </Button>
                            <Button asChild variant="outline" size="sm" className="whitespace-nowrap">
                              <Link to={row.href}>{row.action}</Link>
                            </Button>
                          </div>
                        </Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>

            <ul className="divide-y divide-line lg:hidden">
              {filtered.map((row) => {
                const severity = SEVERITY[row.severity]
                return (
                  <li key={`${row.id}-${row.kind}`} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge tone={severity.tone} size="sm">{severity.label}</Badge>
                          <span className="text-[10.5px] text-muted">#{row.orderId}</span>
                        </div>
                        <p className="mt-1.5 text-[12.5px] font-semibold text-ink">{row.trigger}</p>
                        <p className="mt-0.5 text-[10.5px] leading-4 text-muted">{row.detail}</p>
                      </div>
                      <p className="shrink-0 text-[12px] font-bold text-ink tnum">{money(row.total)}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={row.status} size="sm" />
                      <Badge tone="neutral" size="sm"><CalendarDays size={10} /> {daysSince(row.date)}d old</Badge>
                    </div>
                    <Button asChild variant="outline" size="sm" className="mt-2.5 w-full">
                      <Link to={row.href}>{row.action} <ArrowUpRight size={12} /></Link>
                    </Button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-card border border-line bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
            <Gavel size={16} className="text-forest-500" /> How a complaint is settled
          </h2>
          <p className="mt-1 text-[11.5px] leading-5 text-muted">
            If the two sides cannot agree, a neutral person reviews the proof. The order record is the main evidence.
          </p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { step: '01', title: 'Keep the proof', body: 'We lock the order, the delivery note and the weight records. No more money moves.' },
              { step: '02', title: 'Both sides explain', body: 'Each side sends their side of the story within five working days.' },
              { step: '03', title: 'A neutral person steps in', body: 'We pick a reviewer from our agreed panel.' },
              { step: '04', title: 'Decision and payment', body: 'The reviewer decides. We then pay out or refund, and save the decision on the order.' },
            ].map((item) => (
              <li key={item.step} className="rounded-xl border border-line bg-canvas p-3.5">
                <p className="font-display text-[11px] font-extrabold text-sage-400">{item.step}</p>
                <p className="mt-1 text-[12px] font-semibold text-ink">{item.title}</p>
                <p className="mt-1 text-[10.5px] leading-4 text-muted">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>

        <aside className="space-y-4">
          <div className="rounded-card border border-line bg-forest-900 p-5 text-white shadow-card">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-forest-200">
              <Lock size={12} className="text-harvest-300" /> Who can pause a payment
            </p>
            <p className="mt-2 text-[12px] leading-5 text-forest-100/80">
              No one admin can move the money. Pausing or paying out needs two people to approve.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="dark" size="sm"><Scale size={10} /> Two approvals</Badge>
              <Badge tone="dark" size="sm"><Landmark size={10} /> Trust account</Badge>
            </div>
          </div>

          <div className="rounded-card border border-line bg-white p-4">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
              <FileWarning size={12} /> How this list works
            </p>
            <ul className="mt-2 space-y-2 text-[10.5px] leading-4 text-muted">
              <li className="flex gap-1.5"><CheckCircle2 size={11} className="mt-0.5 shrink-0 text-forest-500" /> Every item comes from a real order.</li>
              <li className="flex gap-1.5"><CheckCircle2 size={11} className="mt-0.5 shrink-0 text-forest-500" /> We check the order age, payment and delivery note.</li>
              <li className="flex gap-1.5"><CheckCircle2 size={11} className="mt-0.5 shrink-0 text-forest-500" /> No test, weight or case numbers are made up.</li>
              <li className="flex gap-1.5"><X size={11} className="mt-0.5 shrink-0 text-critical-500" /> Solved items leave this list automatically.</li>
            </ul>
          </div>

          <div className="rounded-card border border-harvest-200 bg-harvest-50 p-4">
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-harvest-600">
              <Truck size={13} /> Transporter follow-up
            </p>
            <p className="mt-1 text-[10.5px] leading-4 text-harvest-600/85">
              A missing delivery note is the most common problem. Tell the transport team before the load arrives, not after.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2.5 w-full">
              <Link to="/dispatch">See delivery jobs</Link>
            </Button>
          </div>

          <div className="rounded-card border border-line bg-white p-4">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Latest flagged order</p>
            {open.length === 0 ? (
              <p className="mt-1.5 text-[11px] text-muted">Queue is clear.</p>
            ) : (
              <div className="mt-2">
                <p className="text-[12px] font-semibold text-ink">#{open[0].orderId} · {open[0].commodity}</p>
                <p className="text-[10.5px] text-muted">{open[0].trigger}</p>
                <p className="mt-1 text-[10px] text-muted">Flagged {fmtDateTime(open[0].date)}</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
