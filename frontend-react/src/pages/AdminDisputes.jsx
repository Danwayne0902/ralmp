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
            ? 'Escrow was funded. Refund path must be confirmed by the settlement desk before the record is closed.'
            : 'No funds captured. Reserved stock was restored to the grower listing.',
          action: paid ? 'Confirm refund' : 'Verify stock restoration',
        })
        return
      }

      if (!paid && age >= 1) {
        rows.push({
          ...base,
          kind: 'unfunded',
          severity: age >= 3 ? 'critical' : 'high',
          trigger: 'Escrow unfunded past the reservation window',
          detail: `Order reserved ${age} ${age === 1 ? 'day' : 'days'} ago and still has no captured payment. Stock is held against this commitment.`,
          action: 'Chase buyer or release stock',
        })
      }

      if (paid && ['pending'].includes(order.status) && age >= 2) {
        rows.push({
          ...base,
          kind: 'dormant',
          severity: 'high',
          trigger: 'Funded order not acknowledged by grower',
          detail: 'Buyer capital is in custody but the grower has not accepted the order. Escrow cannot advance without acknowledgement.',
          action: 'Contact grower',
        })
      }

      if (['processing'].includes(order.status) && !order.delivery?.tracking_number && age >= 2) {
        rows.push({
          ...base,
          kind: 'waybill',
          severity: 'medium',
          trigger: 'Processing without a waybill',
          detail: 'No carrier tracking reference is bound to the order. Weight and custody evidence will be missing at destination.',
          action: 'Assign carrier & waybill',
        })
      }

      if (['shipped'].includes(order.status) && !order.delivery?.tracking_number) {
        rows.push({
          ...base,
          kind: 'waybill',
          severity: 'critical',
          trigger: 'In transit without e-Waybill',
          detail: 'The order is marked shipped but no waybill exists. Destination re-weigh cannot be matched to an origin slip.',
          action: 'Raise waybill immediately',
        })
      }

      if (['delivered'].includes(order.status) && paid && escrowReleased(order) < total) {
        rows.push({
          ...base,
          kind: 'release',
          severity: 'medium',
          trigger: 'Delivered with escrow still held',
          detail: 'The lot is marked delivered but the final tranche has not been reconciled. Confirm the receiving receipt before release.',
          action: 'Reconcile final tranche',
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
        eyebrow="Administration · arbitration"
        title="Exception & dispute queue"
        description="Every item below is derived from a real order in the ledger — unfunded commitments, missing waybills, dormancy and reversals. No synthetic case files."
        actions={
          <>
            <Button variant="outline" size="md" onClick={load} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh queue
            </Button>
            <Button asChild variant="outline" size="md">
              <Link to="/admin/quality"><FileWarning size={15} /> Quality protocol</Link>
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
        <Stat icon={Wallet} label="Capital exposed" value={money(exposure)} tone="gold" hint="Unfunded or dormant commitments" size="lg" />
        <Stat icon={Snowflake} label="Reversed volume" value={money(reversed)} tone="neutral" hint={`${closed.length} cancelled or rejected orders`} size="lg" />
        <Stat icon={ShieldCheck} label="Ledger coverage" value={orders.length} tone="sprout" hint="Orders reviewed for exceptions" />
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
            placeholder="Filter by order, party or trigger"
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
                ? 'The ledger has no orders yet. Exceptions appear automatically when an order breaches a control threshold.'
                : 'Every order in the ledger is within its control window. New exceptions surface here as thresholds are crossed.'
            }
            className="border-0 shadow-none"
            action={<Button variant="outline" onClick={load}><RefreshCw size={14} /> Re-scan ledger</Button>}
          />
        ) : (
          <>
            <div className="hidden lg:block">
              <Table minWidth={980}>
                <thead>
                  <tr>
                    <Th>Severity</Th>
                    <Th>Order</Th>
                    <Th>Trigger</Th>
                    <Th>Parties</Th>
                    <Th className="text-right">Exposure</Th>
                    <Th>Ledger state</Th>
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
            <Gavel size={16} className="text-forest-500" /> Arbitration pathway
          </h2>
          <p className="mt-1 text-[11.5px] leading-5 text-muted">
            Exceptions that cannot be resolved by evidence move to formal arbitration under the Arbitration and
            Mediation Act 2023. The order ledger is the primary evidence bundle.
          </p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { step: '01', title: 'Evidence preservation', body: 'Freeze the order ledger, waybill and weighbridge slips. No further tranche release.' },
              { step: '02', title: 'Mediation window', body: 'Both counterparties submit position papers within five business days.' },
              { step: '03', title: 'Arbitrator appointment', body: 'A neutral arbitrator is appointed from the panel agreed in the trade rules.' },
              { step: '04', title: 'Award & settlement', body: 'The award directs the custodial trustee. Released or refunded amounts are written to the ledger.' },
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
              <Lock size={12} className="text-harvest-300" /> Freeze authority
            </p>
            <p className="mt-2 text-[12px] leading-5 text-forest-100/80">
              No single administrator can move escrow. A freeze holds the next tranche; release or refund requires
              dual sign-off from the settlement committee.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="dark" size="sm"><Scale size={10} /> Dual sign-off</Badge>
              <Badge tone="dark" size="sm"><Landmark size={10} /> Custodial trustee</Badge>
            </div>
          </div>

          <div className="rounded-card border border-line bg-white p-4">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
              <FileWarning size={12} /> Queue integrity
            </p>
            <ul className="mt-2 space-y-2 text-[10.5px] leading-4 text-muted">
              <li className="flex gap-1.5"><CheckCircle2 size={11} className="mt-0.5 shrink-0 text-forest-500" /> Each item references a live order ID.</li>
              <li className="flex gap-1.5"><CheckCircle2 size={11} className="mt-0.5 shrink-0 text-forest-500" /> Thresholds use order age, payment state and waybill presence.</li>
              <li className="flex gap-1.5"><CheckCircle2 size={11} className="mt-0.5 shrink-0 text-forest-500" /> No laboratory, weight or case values are simulated.</li>
              <li className="flex gap-1.5"><X size={11} className="mt-0.5 shrink-0 text-critical-500" /> Resolved items leave the open queue automatically.</li>
            </ul>
          </div>

          <div className="rounded-card border border-harvest-200 bg-harvest-50 p-4">
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-harvest-600">
              <Truck size={13} /> Carrier escalation
            </p>
            <p className="mt-1 text-[10.5px] leading-4 text-harvest-600/85">
              Missing waybills are the most common evidence gap. Escalate to the haulage desk before destination
              re-weigh, not after.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2.5 w-full">
              <Link to="/dispatch">Open dispatch board</Link>
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
