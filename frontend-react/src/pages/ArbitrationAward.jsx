import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowRight, CircleAlert, Clock3, Download, FileText, Fingerprint, Gavel,
  Landmark, MapPin, Printer, RefreshCw, Scale, ShieldCheck, Users,
} from 'lucide-react'
import { PageHeader, Stat, EmptyState, Skeleton, Table, Th, Td, Tr } from '../components/ui/Data'
import { Card, CardHeader, CardBody, CardFooter, Callout, KeyValue } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, StateBadge } from '../components/ui/Badge'
import { adminService } from '../lib/services'
import { escrowSchedule } from '../lib/orders'
import { fmtDate, fmtDateTime, money, num } from '../lib/format'
import { downloadCsv, parseError } from '../lib/utils'
import { useAuth } from '../store/auth'

const COMPLAINT_STATUSES = ['rejected', 'cancelled']

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

export default function ArbitrationAward() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await adminService.orders({ per_page: 100 })
      const rows = res.data?.data || []
      setOrders(rows)
      setActiveId(
        (current) =>
          current ?? (rows.find((o) => COMPLAINT_STATUSES.includes(o.status))?.id ?? rows[0]?.id ?? null),
      )
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

  const order = useMemo(() => orders.find((o) => o.id === activeId) || null, [orders, activeId])
  const schedule = useMemo(() => escrowSchedule(order), [order])
  const total = Number(order?.total_price || 0)
  const reference = order?.payment_reference || (order ? `RAMLP-DSP-${order.id}` : 'RAMLP')
  const seal = fingerprint(`award:${reference}`, 64)
  const caseRef = `#DSP-${new Date(order?.order_date || Date.now()).getFullYear()}-${String(order?.id ?? 0).padStart(4, '0')}`
  const docket = `REG-NG-${new Date(order?.order_date || Date.now()).getFullYear()}-${String(order?.id ?? 0).padStart(6, '0')}`
  const complainant = order?.buyer?.name || 'Buyer'
  const respondent = order?.farmer?.name || 'Farmer'

  const disbursements = schedule.map((tranche) => ({
    id: tranche.key,
    beneficiary: respondent,
    classification: `${tranche.index} · ${tranche.short}`,
    channel: 'RALMP escrow account',
    amount: tranche.amount,
    state: tranche.state,
  }))

  function exportAward() {
    if (!order) return
    const rows = disbursements.map((row) => ({
      case_ref: caseRef,
      beneficiary: row.beneficiary,
      classification: row.classification,
      channel: row.channel,
      amount: row.amount,
      state: row.state,
    }))
    downloadCsv(`ramlp-arbitration-award-${caseRef.replace(/[^A-Za-z0-9]/g, '')}.csv`, rows)
  }

  if (loading) {
    return (
      <div className="page-wrap page-pad">
        <Skeleton className="h-9 w-96" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="mt-5 h-80" />
      </div>
    )
  }

  if (!orders.length) {
    return (
      <div className="page-wrap page-pad">
        <PageHeader
          eyebrow="Complaints"
          title="Draft release document"
          description="A draft based on the order record for our team to review. There is no real ruling yet."
        />
        <EmptyState
          icon={Gavel}
          title="No complaints on hold"
          description="When a complaint freezes an order, it appears here for review."
          action={
            <Button asChild>
              <Link to="/admin/disputes">See complaints <ArrowRight size={15} /></Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="Complaints"
        title="Draft release document"
        description="A draft made from the order record for our team. It is not a ruling and moves no money."
        actions={
          <>
            <select
              aria-label="Select case"
              value={activeId ?? ''}
              onChange={(e) => setActiveId(Number(e.target.value) || null)}
              className="select"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.produce?.commodity_name || `Order #${o.id}`} · {o.status}
                </option>
              ))}
            </select>
            <Button variant="outline" size="md" onClick={load}>
              <RefreshCw size={15} /> Refresh
            </Button>
          </>
        }
      />

      {error && (
        <div className="mb-5">
          <Callout tone="critical" icon={CircleAlert} title="We cannot load complaints">
            {error}
          </Callout>
        </div>
      )}

      <div className="mb-5">
        <Callout tone="pending" icon={CircleAlert} title="Draft only — not a ruling">
          The platform does not record real rulings yet. This document is built from the chosen order so our team can
          review a proposed decision. It is not a court order and no money moves from this screen.
        </Callout>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Scale} label="Money under review" value={money(total)} hint={order?.produce?.commodity_name || `Order #${order?.id}`} />
        <Stat icon={Gavel} label="Document status" value="Draft" hint={caseRef} tone="gold" />
        <Stat icon={Users} label="People involved" value={order ? String(2 + (order.delivery?.logistics_provider ? 1 : 0)) : '—'} hint={order?.delivery?.logistics_provider ? 'Buyer · farmer · transporter' : 'Buyer · farmer'} tone="neutral" />
        <Stat icon={Fingerprint} label="Document code" value={order ? `${seal.slice(0, 8)}…` : '—'} hint="Code for this draft" tone="sprout" />
      </div>

      <div className="mt-5 space-y-5">
        <Card>
          <CardBody className="flex flex-wrap items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-forest-100 bg-forest-50 text-forest-600">
              <Landmark size={24} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-muted">RALMP review team</p>
              <h2 className="mt-1 font-display text-[20px] font-bold leading-6 tracking-[-0.01em] text-ink sm:text-[24px]">
                Draft payment release document
              </h2>
              <p className="mt-1 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-forest-600">
                Prepared for team review · not enforceable
              </p>
              <p className="mt-0.5 text-[11.5px] text-muted">
                Built from the order record and the escrow rules
              </p>
            </div>
            <div className="inline-flex flex-wrap items-center gap-3 rounded-full border border-line bg-canvas px-4 py-1.5 font-mono text-[11px] text-ink-soft">
              <span><strong className="text-ink">CASE:</strong> {caseRef}</span>
              <span className="text-sage-400">•</span>
              <span><strong className="text-ink">FILE:</strong> {docket}</span>
              <span className="text-sage-400">•</span>
              <span className="font-bold text-harvest-600">STATUS: DRAFT · NOT DECIDED</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Prepared for</p>
              <p className="mt-0.5 text-[12.5px] font-medium text-ink">RALMP review team</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Prepared by</p>
              <p className="mt-0.5 text-[12.5px] font-medium text-ink">{user?.name || 'Review team member'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Date prepared</p>
              <p className="mt-0.5 text-[12.5px] font-medium text-ink">{fmtDateTime(order?.updated_at || order?.order_date)}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={Users} title="1. People on the order" description="Names from the order record" />
          <CardBody className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-canvas p-3.5">
              <Badge tone="critical" size="sm">Buyer</Badge>
              <p className="mt-2 text-[13px] font-bold text-ink">{complainant}</p>
              <p className="mt-0.5 text-[11.5px] text-muted">Order #{order?.id} · asked for the hold</p>
            </div>
            <div className="rounded-xl border border-line bg-canvas p-3.5">
              <Badge tone="verified" size="sm">Farmer</Badge>
              <p className="mt-2 text-[13px] font-bold text-ink">{respondent}</p>
              <p className="mt-0.5 text-[11.5px] text-muted">{order?.produce?.location || 'Farm on record'}</p>
            </div>
            <div className="rounded-xl border border-line bg-canvas p-3.5">
              <Badge tone="neutral" size="sm">Transporter</Badge>
              <p className="mt-2 text-[13px] font-bold text-ink">{order?.delivery?.logistics_provider?.name || 'Transporter on record'}</p>
              <p className="mt-0.5 text-[11.5px] text-muted">
                {order?.delivery?.tracking_number ? `Delivery note ${order.delivery.tracking_number}` : 'No delivery note yet'}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={FileText} title="2. Order facts and reasons" description="Taken from the order record, not a court file" />
          <CardBody className="space-y-2.5 text-[12.5px] leading-6 text-ink-soft">
            <p>
              <strong className="text-ink">ORDER RECORD:</strong> placed on{' '}
              {fmtDate(order?.order_date)} by the buyer for{' '}
              <strong className="text-ink">
                {order?.produce?.commodity_name || `Order #${order?.id}`} ({num(order?.quantity)} units)
              </strong>{' '}
              valued at <strong className="text-ink">{money(total)}</strong>.
            </p>
            <p>
              <strong className="text-ink">ORDER STATUS:</strong> the order stands at status{' '}
              <strong className="text-ink">{order?.status}</strong> with payment{' '}
              <strong className="text-ink">{order?.payment_status || 'unpaid'}</strong>. No weight, lab or review findings are recorded against this order.
            </p>
            <p>
              <strong className="text-ink">PROPOSED DECISION:</strong> if the team approves, the money would be paid in the parts shown below. Any step without proof stays in escrow. This draft does not release or move any money.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={Gavel} title="3. Proposed payments" description="For review only — not a binding instruction" />
          <Table minWidth={780}>
            <thead>
              <tr>
                <Th>Who gets paid</Th>
                <Th>Payment part</Th>
                <Th>Paid from</Th>
                <Th className="text-right">Amount (naira)</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {disbursements.map((row) => (
                <Tr key={row.id}>
                  <Td>
                    <p className="font-semibold text-ink">{row.beneficiary}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                      <MapPin size={10} /> RALMP account
                    </p>
                  </Td>
                  <Td className="text-[12px] text-muted">{row.classification}</Td>
                  <Td className="font-mono text-[11px] text-muted">{row.channel}</Td>
                  <Td className="text-right font-semibold tnum text-ink">{money(row.amount)}</Td>
                  <Td><StateBadge state={row.state} /></Td>
                </Tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-canvas">
                <Td colSpan={3} className="border-b-0 text-[11px] font-bold uppercase tracking-wide text-forest-600">
                  Total to be paid from escrow
                </Td>
                <Td className="border-b-0 text-right font-display text-[15px] font-extrabold tnum text-forest-600">
                  {money(total)}
                </Td>
                <Td className="border-b-0" />
              </tr>
            </tfoot>
          </Table>
          <CardFooter className="justify-between">
            <p className="text-[11.5px] text-muted">
              Draft only. The amounts follow the 10/60/30 split used on this order.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info('Draft only — real rulings and payments are not enabled in this build')}
              >
                <Gavel size={14} /> Mark as reviewed
              </Button>
              <Button variant="outline" size="sm" onClick={exportAward}>
                <Download size={14} /> Export
              </Button>
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader icon={ShieldCheck} title="4. Draft record" description="A code that marks this draft for easy tracing" />
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <div className="flex h-full flex-col justify-between rounded-xl border border-line bg-canvas p-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Prepared by</p>
                <p className="mt-1 text-[13px] font-bold text-ink">{user?.name || 'Review team member'}</p>
                <p className="mt-0.5 text-[11px] text-muted">Platform administrator · draft author</p>
              </div>
              <Badge tone="pending" size="sm" className="mt-4 self-start"><Clock3 size={11} /> Unsigned</Badge>
            </div>
            <div className="flex h-full flex-col justify-between rounded-xl border border-line bg-canvas p-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Review status</p>
                <p className="mt-1 text-[13px] font-bold text-ink">Awaiting team sign-off</p>
                <p className="mt-0.5 text-[11px] text-muted">File {docket}</p>
              </div>
              <Badge tone="pending" size="sm" className="mt-4 self-start"><Clock3 size={11} /> Not enrolled</Badge>
            </div>
            <div className="flex h-full flex-col justify-between rounded-xl border border-line bg-canvas p-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Document fingerprint</p>
                <p className="mt-1 break-all font-mono text-[9.5px] leading-tight text-ink-soft">{seal}</p>
              </div>
              <Badge tone="neutral" size="sm" className="mt-4 self-start"><Fingerprint size={11} /> Deterministic hash</Badge>
            </div>
          </CardBody>
          <CardFooter className="justify-between">
            <dl className="flex flex-wrap gap-x-8">
              <KeyValue label="Draft reference" mono>{caseRef}</KeyValue>
              <KeyValue label="File number" mono>{docket}</KeyValue>
            </dl>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer size={14} /> Print certificate
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
