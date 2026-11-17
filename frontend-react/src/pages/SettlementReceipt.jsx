import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BadgeCheck, Banknote, CalendarDays, CheckCircle2, CircleAlert,
  Download, Printer, QrCode, RefreshCw, ShieldCheck, Wallet,
} from 'lucide-react'
import { PageHeader, Stat, EmptyState, Skeleton, Avatar, Table, Th, Td, Tr } from '../components/ui/Data'
import { Card, CardHeader, CardBody, CardFooter, Callout, KeyValue } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, StateBadge } from '../components/ui/Badge'
import { produceService, orderService } from '../lib/services'
import { escrowSchedule, escrowReleased } from '../lib/orders'
import { fmtDate, fmtDateTime, money, num } from '../lib/format'
import { cn, downloadCsv, parseError } from '../lib/utils'
import { useAuth } from '../store/auth'

const WORDS_ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
]
const WORDS_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

function chunkToWords(n) {
  let value = n
  let out = ''
  if (value >= 100) {
    out += `${WORDS_ONES[Math.floor(value / 100)]} hundred`
    value %= 100
    if (value) out += ' and '
  }
  if (value >= 20) {
    out += WORDS_TENS[Math.floor(value / 10)]
    if (value % 10) out += `-${WORDS_ONES[value % 10]}`
  } else if (value > 0) {
    out += WORDS_ONES[value]
  }
  return out
}

function numberToWords(input) {
  let n = Math.floor(Math.abs(Number(input) || 0))
  if (n === 0) return 'zero'
  const groups = ['', ' thousand', ' million', ' billion', ' trillion']
  const parts = []
  let index = 0
  while (n > 0) {
    const chunk = n % 1000
    if (chunk) parts.unshift(chunkToWords(chunk) + groups[index])
    n = Math.floor(n / 1000)
    index += 1
  }
  return parts.join(', ')
}

function nairaWords(value) {
  const amount = Number(value) || 0
  const naira = Math.floor(amount)
  const kobo = Math.round((amount - naira) * 100)
  const head = numberToWords(naira).replace(/\b\w/g, (c) => c.toUpperCase())
  return kobo ? `${head} Naira, ${numberToWords(kobo)} kobo only` : `${head} Naira only`
}

function fingerprint(seed, length = 64) {
  const str = String(seed ?? 'ramlp')
  let h1 = 0x811c9dc5
  let h2 = 0x9e3779b9
  for (let i = 0; i < str.length; i += 1) {
    h1 = ((h1 ^ str.charCodeAt(i)) * 16777619) >>> 0
    h2 = (h2 + str.charCodeAt(i) * (i + 7)) >>> 0
  }
  let out = ''
  while (out.length < length) {
    h1 = (h1 ^ (h1 << 13)) >>> 0
    h2 = (h2 ^ (h2 >>> 15)) >>> 0
    h1 = (h1 + h2) >>> 0
    out += h1.toString(16).padStart(8, '0')
    h2 = (h2 ^ (h2 << 7)) >>> 0
    out += h2.toString(16).padStart(8, '0')
  }
  return out.slice(0, length)
}

function qrCells(seed, size = 21) {
  const fp = fingerprint(seed, 256)
  const cells = []
  for (let i = 0; i < size * size; i += 1) {
    const nibble = parseInt(fp[i % fp.length], 16)
    cells.push(nibble % 2 === 1)
  }
  return cells
}

function isFinderZone(x, y, size) {
  const inBox = (bx, by) => x >= bx && x < bx + 7 && y >= by && y < by + 7
  return inBox(0, 0) || inBox(size - 7, 0) || inBox(0, size - 7)
}

function QrBlock({ seed }) {
  const size = 21
  const cells = useMemo(() => qrCells(seed, size), [seed])
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full" shapeRendering="crispEdges" role="img" aria-label="Settlement verification code">
      <rect width={size} height={size} fill="#ffffff" />
      {cells.map((on, index) => {
        const x = index % size
        const y = Math.floor(index / size)
        if (!on || isFinderZone(x, y, size)) return null
        return <rect key={index} x={x} y={y} width="1" height="1" fill="#0F2417" />
      })}
      {[['0', '0'], [String(size - 7), '0'], ['0', String(size - 7)]].map(([x, y]) => (
        <g key={`${x}-${y}`} fill="#176B3A">
          <rect x={Number(x)} y={Number(y)} width="7" height="7" />
          <rect x={Number(x) + 1} y={Number(y) + 1} width="5" height="5" fill="#ffffff" />
          <rect x={Number(x) + 2} y={Number(y) + 2} width="3" height="3" fill="#176B3A" />
        </g>
      ))}
    </svg>
  )
}

export default function SettlementReceipt() {
  const { user } = useAuth()
  const [earnings, setEarnings] = useState(null)
  const [orders, setOrders] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [earnRes, orderRes] = await Promise.all([
        produceService.earnings(),
        orderService.list({ per_page: 100 }),
      ])
      const rows = orderRes.data?.data || []
      setEarnings(earnRes.data)
      setOrders(rows)
      setActiveId((current) => current ?? (rows.find((o) => escrowReleased(o) > 0)?.id ?? rows[0]?.id ?? null))
      setError('')
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

  const settled = useMemo(() => orders.filter((order) => escrowReleased(order) > 0), [orders])
  const active = useMemo(() => orders.find((order) => order.id === activeId) || null, [orders, activeId])
  const schedule = useMemo(() => escrowSchedule(active), [active])
  const settledAmount = escrowReleased(active)
  const reference = active?.payment_reference || (active ? `RAMLP-${active.id}` : 'RAMLP')
  const txRef = `RCPT/${reference}-${String(active?.id ?? 0).padStart(4, '0')}`
  const seal = fingerprint(txRef, 64)
  const node = String(active?.id ?? 0).padStart(4, '0')

  const disbursed = Number(earnings?.total_earnings || 0)
  const pending = orders
    .filter((order) => order.payment_status === 'paid' && !['cancelled', 'rejected'].includes(order.status))
    .reduce((sum, order) => sum + Math.max(0, Number(order.total_price || 0) - escrowReleased(order)), 0)
  const lastSettlement = settled[0] ? settled[0].paid_at || settled[0].updated_at || settled[0].order_date : null

  function exportStatement() {
    const rows = settled.map((order) => ({
      order_id: order.id,
      commodity: order.produce?.commodity_name || '',
      buyer: order.buyer?.name || '',
      settled: escrowReleased(order),
      total: order.total_price,
      paid_at: order.paid_at || order.order_date,
      reference: order.payment_reference || '',
    }))
    downloadCsv(`ramlp-settlement-receipts-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  if (loading) {
    return (
      <div className="page-wrap page-pad">
        <Skeleton className="h-9 w-72" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="mt-5 h-72" />
      </div>
    )
  }

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="My money"
        title="Payment receipts"
        description="A receipt for each payment released to you, with the bank reference."
        actions={
          <>
            <Button asChild variant="outline" size="md">
              <Link to="/farmer/payouts"><Wallet size={15} /> Payout statement</Link>
            </Button>
            <Button variant="outline" size="md" onClick={load}>
              <RefreshCw size={15} /> Refresh
            </Button>
          </>
        }
      />

      {error && (
        <div className="mb-5">
          <Callout tone="critical" icon={CircleAlert} title="We cannot load your receipts">
            {error}
          </Callout>
        </div>
      )}

      <Card className="mb-5">
        <CardBody className="flex flex-wrap items-center gap-4">
          <Avatar name={user?.name} src={user?.profile_image} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-display text-[16px] font-bold text-ink">
              {user?.name || 'Producer'}
              <BadgeCheck size={15} className="text-forest-500" />
            </p>
            <p className="mt-0.5 text-[12.5px] text-muted">
              {user?.email || 'Farmer'} · payment recipient
            </p>
          </div>
          <Badge tone="verified" size="md"><ShieldCheck size={11} /> Held in escrow</Badge>
        </CardBody>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Banknote} label="Total paid" value={money(disbursed)} hint="Finished and delivered orders" />
        <Stat icon={CheckCircle2} label="Payments" value={num(settled.length)} hint="Receipts on record" tone="sprout" />
        <Stat icon={Wallet} label="Still on hold" value={money(pending)} hint="Waiting for delivery proof" tone="gold" />
        <Stat icon={CalendarDays} label="Last payment" value={lastSettlement ? fmtDate(lastSettlement) : '—'} hint="Most recent payment" tone="neutral" />
      </div>

      {settled.length === 0 && !error ? (
        <div className="mt-5">
          <EmptyState
            icon={Banknote}
            title="No receipts yet"
            description="When a payment is released to you, the receipt is saved here."
            action={
              <Button asChild>
                <Link to="/farmer/listings">Manage my lots <ArrowRight size={15} /></Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            {active ? (
              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-forest-600 px-4 py-3 text-white">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded bg-white/95 text-forest-600">
                      <Banknote size={15} />
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/85">RALMP payment receipt</p>
                      <p className="text-[11px] text-white/90">Money released to you</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded border border-white/25 bg-forest-700 px-2 py-1 font-mono text-[10px] font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-sprout-300" /> RECEIPT #{node}
                  </span>
                </div>

                <CardBody className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Paid through</p>
                      <p className="mt-1 font-display text-[16px] font-bold text-forest-600">Bank transfer</p>
                      <p className="text-[11.5px] text-muted">Paid from the RALMP escrow account</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Date &amp; timestamp</p>
                      <p className="mt-1 text-[12.5px] font-semibold text-ink">{fmtDateTime(active.paid_at || active.updated_at || active.order_date)}</p>
                      <p className="font-mono text-[10.5px] text-muted">Reference: {txRef}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-canvas p-2.5 text-[12px]">
                    <span className="text-muted">Payment reference</span>
                    <span className="break-words font-mono font-bold text-ink">{reference}</span>
                  </div>

                  <div className="rounded-xl border border-line bg-canvas px-4 py-4 text-center">
                    <Badge tone="verified" size="sm" className="mb-1.5"><CheckCircle2 size={11} /> Paid in full</Badge>
                    <p className="font-display text-[27px] font-extrabold tracking-tight text-forest-600 tnum sm:text-[32px]">
                      {money(settledAmount, 2)}
                    </p>
                    <p className="mt-1 text-[12px] font-medium italic text-muted">“{nairaWords(settledAmount)}”</p>
                  </div>

                  <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-3.5 sm:flex-row sm:items-center">
                    <div className="shrink-0 rounded-lg border-2 border-forest-100 bg-white p-2">
                      <div className="h-24 w-24">
                        <QrBlock seed={txRef} />
                      </div>
                      <p className="mt-1 text-center font-mono text-[8px] font-bold tracking-tight text-forest-600">SECURE QR</p>
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-forest-600">
                        <ShieldCheck size={13} /> Receipt check code
                      </p>
                      <p className="break-all rounded border border-line bg-canvas p-1.5 font-mono text-[10px] leading-tight text-ink-soft">
                        {seal}
                      </p>
                      <p className="text-[11px] leading-4 text-muted">
                        Keep this code. Our team can use it to check the payment with you.
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">Payment details</p>
                    <Table minWidth={520}>
                      <thead>
                        <tr>
                          <Th>Part</Th>
                          <Th>Why we paid</Th>
                          <Th className="text-right">Amount</Th>
                          <Th>Status</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedule.map((tranche) => (
                          <Tr key={tranche.key}>
                            <Td className="font-semibold text-ink">
                              {tranche.index} · {tranche.short}
                            </Td>
                            <Td className="text-[12px] text-muted">{tranche.trigger}</Td>
                            <Td className="text-right font-semibold tnum text-ink">{money(tranche.amount)}</Td>
                            <Td><StateBadge state={tranche.state} /></Td>
                          </Tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </CardBody>

                <CardFooter className="justify-between">
                  <p className="text-[11.5px] text-muted">
                    Consignment {active.produce?.commodity_name || `Order #${active.id}`} · {active.buyer?.name || 'Buyer on record'}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                      <Printer size={14} /> Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportStatement}>
                      <Download size={14} /> Download
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ) : (
              <EmptyState icon={QrCode} title="Choose a payment" description="Choose a payment from the list to see its receipt." />
            )}
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader icon={QrCode} title="Recent payments" description={`${settled.length} payments`} />
              <ul className="divide-y divide-line">
                {settled.map((order) => {
                  const isActive = order.id === activeId
                  return (
                    <li key={order.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(order.id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition',
                          isActive ? 'bg-forest-50' : 'hover:bg-sage-50',
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block break-words text-[12.5px] font-semibold text-ink">
                            {order.produce?.commodity_name || `Order #${order.id}`}
                          </span>
                          <span className="mt-0.5 block break-words text-[11px] text-muted">
                            {order.buyer?.name || 'Buyer'} · {fmtDate(order.paid_at || order.order_date)}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-display text-[13px] font-bold tnum text-forest-600">
                            {money(escrowReleased(order))}
                          </span>
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] font-semibold text-forest-600">
                            <CheckCircle2 size={10} /> Cleared
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Card>

            <Card>
              <CardHeader icon={Banknote} title="Your totals" description="Across every payment" />
              <CardBody>
                <dl className="divide-y divide-line">
                  <KeyValue label="Total paid" mono>{money(disbursed)}</KeyValue>
                  <KeyValue label="Still on hold" mono>{money(pending)}</KeyValue>
                  <KeyValue label="Finished orders" mono>{num(earnings?.completed_orders || 0)}</KeyValue>
                  <KeyValue label="Orders on record" mono>{num(earnings?.total_orders || 0)}</KeyValue>
                </dl>
              </CardBody>
            </Card>

            <Callout tone="sage" icon={ShieldCheck} title="Fast payment">
              We send the money as soon as each payment step is proven. You do not need to ask for a withdrawal.
            </Callout>
          </aside>
        </div>
      )}
    </div>
  )
}
