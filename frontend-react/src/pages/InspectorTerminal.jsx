import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowRight, BadgeCheck, Beaker, Camera, CheckCircle2, CircleAlert, Fingerprint,
  FlaskConical, Gavel, MapPin, Percent, RefreshCw, Scale, ShieldCheck, Snowflake,
} from 'lucide-react'
import { PageHeader, Stat, EmptyState, Skeleton } from '../components/ui/Data'
import { Card, CardHeader, CardBody, CardFooter, Callout, KeyValue } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { adminService, produceService } from '../lib/services'
import { TRANCHE_SPLIT } from '../lib/orders'
import { fmtDateTime, imgUrl, money, num, qtyUnit } from '../lib/format'
import { cn, parseError } from '../lib/utils'

const ASSAYS = [
  { key: 'moisture', label: 'Moisture', unit: '%', limit: 12.5, compare: 'lte', spec: '≤ 12.50% max', bench: 'Check limit' },
  { key: 'aflatoxin', label: 'Aflatoxin B1', unit: 'ppb', limit: 10, compare: 'lt', spec: '< 10.0 ppb', bench: 'Check limit' },
  { key: 'chaff', label: 'Dirt and other matter', unit: '%', limit: 2, compare: 'lte', spec: '≤ 2.00% max', bench: 'Check limit' },
  { key: 'broken', label: 'Broken grains', unit: '%', limit: 5, compare: 'lte', spec: '≤ 5.00% max', bench: 'Check limit' },
]

function assayPass(key, raw) {
  const def = ASSAYS.find((a) => a.key === key)
  const value = Number(raw)
  if (!def || raw === '' || Number.isNaN(value)) return null
  return def.compare === 'lt' ? value < def.limit : value <= def.limit
}

const VERDICTS = [
  {
    key: 'release',
    label: 'All good — pass this check',
    icon: CheckCircle2,
    tone: 'forest',
    copy: 'Records a pass. The 60% payment is still released from the payments desk after the buyer confirms the goods arrived.',
  },
  {
    key: 'conditional',
    label: 'Pass with a small price cut',
    icon: Percent,
    tone: 'gold',
    copy: 'Records a pass with a price cut to review. No money moves until someone approves the cut.',
  },
  {
    key: 'freeze',
    label: 'Hold the money',
    icon: Gavel,
    tone: 'critical',
    copy: 'Records a hold. The 60% payment stays in escrow.',
  },
]

const VERDICT_LABELS = {
  release: 'Passed',
  conditional: 'Pass with a cut to review',
  freeze: 'Held',
}

export default function InspectorTerminal() {
  const [orders, setOrders] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [produce, setProduce] = useState(null)
  const [produceLoading, setProduceLoading] = useState(false)
  const [inspections, setInspections] = useState({})
  const [reading, setReading] = useState({ moisture: '', aflatoxin: '', chaff: '', broken: '' })
  const [weighbridge, setWeighbridge] = useState({ origin: '', destination: '' })
  const [verdict, setVerdict] = useState('release')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ordersRes, inspectionsRes] = await Promise.all([
        adminService.orders({ per_page: 100 }),
        adminService.inspections(),
      ])
      const rows = ordersRes.data?.data || []
      const saved = inspectionsRes.data?.inspections || []
      setOrders(rows)
      setInspections(Object.fromEntries(saved.map((row) => [row.order_id, row])))
      setError('')
      setActiveId(
        (current) =>
          current ??
          (rows.find((o) => ['shipped', 'delivered', 'completed'].includes(o.status))?.id ?? rows[0]?.id ?? null),
      )
    } catch (err) {
      setError(parseError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const order = useMemo(() => orders.find((o) => o.id === activeId) || null, [orders, activeId])
  const inspection = order ? inspections[order.id] || null : null
  const signed = Boolean(inspection)

  useEffect(() => {
    const id = order?.produce_id || order?.produce?.id
    if (!id) {
      setProduce(null)
      setProduceLoading(false)
      return
    }
    let cancelled = false
    // Clear the old load before fetching the new one so the screen never
    // shows one order's photos while another order is selected.
    setProduce(null)
    setProduceLoading(true)
    produceService
      .get(id)
      .then((data) => {
        if (!cancelled) setProduce(data || null)
      })
      .catch(() => {
        if (!cancelled) setProduce(null)
      })
      .finally(() => {
        if (!cancelled) setProduceLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [order])

  useEffect(() => {
    setVerdict('release')
    setReading({ moisture: '', aflatoxin: '', chaff: '', broken: '' })
    setWeighbridge({ origin: '', destination: '' })
  }, [activeId])

  const milestone = order ? Math.round(Number(order.total_price || 0) * TRANCHE_SPLIT[1].share) : 0
  const moistureValue = Number(reading.moisture)
  const moisturePct = Number.isFinite(moistureValue) && moistureValue > 0 ? Math.min(100, (moistureValue / 15) * 100) : 0
  const moistureOver = Number.isFinite(moistureValue) && moistureValue > 12.5

  const origin = Number(weighbridge.origin)
  const destination = Number(weighbridge.destination)
  const variance = Number.isFinite(origin) && origin > 0 && Number.isFinite(destination) ? ((destination - origin) / origin) * 100 : null

  const images = Array.isArray(produce?.images) ? produce.images.slice(0, 4) : []

  function numberOrNull(value) {
    if (value === '' || value === null || value === undefined) return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  async function saveSignOff(nextVerdict, successTitle, successDescription) {
    if (!order || saving) return
    setSaving(true)
    try {
      const res = await adminService.saveInspection(order.id, {
        verdict: nextVerdict,
        readings: {
          moisture: numberOrNull(reading.moisture),
          aflatoxin: numberOrNull(reading.aflatoxin),
          chaff: numberOrNull(reading.chaff),
          broken: numberOrNull(reading.broken),
        },
        origin_weight: numberOrNull(weighbridge.origin),
        destination_weight: numberOrNull(weighbridge.destination),
      })
      const saved = res.data?.inspection
      if (saved) setInspections((prev) => ({ ...prev, [order.id]: saved }))
      toast.success(successTitle, { description: successDescription })
    } catch (err) {
      toast.error('Your sign-off was not saved', { description: parseError(err) })
    } finally {
      setSaving(false)
    }
  }

  function signOff() {
    return saveSignOff(
      verdict,
      `Check signed for order #${order?.id ?? ''}`,
      'Your name and time are saved on the order. The money stays in escrow until its step is done.',
    )
  }

  function recordHold() {
    setVerdict('freeze')
    return saveSignOff(
      'freeze',
      `Order #${order?.id ?? ''} saved as held`,
      'The result is recorded on the order and the money stays in escrow.',
    )
  }

  if (loading) {
    return (
      <div className="page-wrap page-pad">
        <Skeleton className="h-9 w-80" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="mt-5 h-72" />
      </div>
    )
  }

  if (!orders.length) {
    return (
      <div className="page-wrap page-pad">
        <PageHeader
          eyebrow="Checker"
          title="Check and sign off"
          description="Enter the test readings, compare the two weights and record the result."
        />
        <EmptyState
          icon={FlaskConical}
          title="Nothing waiting for a check"
          description="Items appear here after pickup, on the way to the delivery point."
          action={
            <Button asChild>
              <Link to="/admin/quality">Open quality lab <ArrowRight size={15} /></Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="Checker"
        title="Check and sign off"
        description="Test readings, the two weights and the final result for this load."
        actions={
          <>
            <div className="relative min-w-0">
              <select
                aria-label="Select load"
                aria-busy={produceLoading}
                disabled={produceLoading}
                value={activeId ?? ''}
                onChange={(e) => setActiveId(Number(e.target.value) || null)}
                className={cn('select', produceLoading && 'cursor-wait pr-16 text-muted')}
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.produce?.commodity_name || `Order #${o.id}`} · #{o.id}
                  </option>
                ))}
              </select>
              {produceLoading && (
                <span className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2">
                  <RefreshCw size={14} className="animate-spin text-muted" />
                </span>
              )}
            </div>
            <Button variant="outline" size="md" onClick={load} disabled={produceLoading}>
              <RefreshCw size={15} /> Refresh
            </Button>
          </>
        }
      />

      {error && (
        <div className="mb-5">
          <Callout tone="critical" icon={CircleAlert} title="We cannot load the check list">
            {error}
          </Callout>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={Beaker}
          label="Order"
          value={order ? `#${order.id}` : '—'}
          hint={order?.produce?.commodity_name || 'Produce pending'}
        />
        <Stat icon={Scale} label="Load size" value={order ? qtyUnit(order.quantity, 'units') : '—'} hint="As stated by the farmer" />
        <Stat icon={ShieldCheck} label="60% payment" value={money(milestone)} hint="Paid when the buyer confirms" tone="sprout" />
        <Stat
          icon={Fingerprint}
          label="Sign-off status"
          value={signed ? 'Signed' : 'Open'}
          hint={
            signed
              ? `Signed ${fmtDateTime(inspection.signed_at)}`
              : 'Waiting for your sign-off'
          }
          tone={signed ? 'sprout' : 'neutral'}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              icon={FlaskConical}
              title="Test readings"
              description="Enter the readings. Pass or fail is checked against the agreed limit."
              action={<Badge tone="outline" size="sm">Manual entry</Badge>}
            />
            <CardBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
                <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-canvas p-4">
                  <div className="relative grid h-40 w-40 place-items-center">
                    <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
                      <circle cx="80" cy="80" r="64" fill="none" stroke="#dce5d9" strokeWidth="12" />
                      <circle
                        cx="80"
                        cy="80"
                        r="64"
                        fill="none"
                        stroke={moistureOver ? '#BA1A1A' : '#176B3A'}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={402}
                        strokeDashoffset={402 - (402 * moisturePct) / 100}
                        className="transition-[stroke-dashoffset] duration-500"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center text-center">
                      <span className="font-display text-[26px] font-extrabold tracking-tight text-ink">
                        {reading.moisture === '' ? '—' : `${reading.moisture}%`}
                      </span>
                      <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Moisture</span>
                    </div>
                  </div>
                  <p className="mt-2 text-center text-[11.5px] text-muted">
                    Safe limit <span className="font-bold text-ink">&lt; 12.50%</span>
                  </p>
                </div>

                <div className="space-y-2.5">
                  {ASSAYS.map((assay) => {
                    const pass = assayPass(assay.key, reading[assay.key])
                    return (
                      <div
                        key={assay.key}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-ink">{assay.label}</p>
                          <p className="mt-0.5 text-[11px] text-muted">
                            {assay.spec} · {assay.bench}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <input
                              type="number"
                              inputMode="decimal"
                              value={reading[assay.key]}
                              onChange={(e) => setReading((prev) => ({ ...prev, [assay.key]: e.target.value }))}
                              placeholder="—"
                              className="input h-10 w-24 pr-12 text-right tnum"
                              aria-label={`${assay.label} reading`}
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted">
                              {assay.unit}
                            </span>
                          </div>
                          {pass === null ? (
                            <Badge tone="neutral" size="sm">Pending</Badge>
                          ) : pass ? (
                            <Badge tone="verified" size="sm"><CheckCircle2 size={11} /> Pass</Badge>
                          ) : (
                            <Badge tone="critical" size="sm"><CircleAlert size={11} /> Fail</Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              icon={Scale}
              title="Compare the two weights"
              description="Compare the pickup weight with the drop-off weight. The difference must stay within 1.0%."
            />
            <CardBody className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-canvas p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Weight at pickup</p>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={weighbridge.origin}
                    onChange={(e) => setWeighbridge((prev) => ({ ...prev, origin: e.target.value }))}
                    placeholder="Gross kg"
                    className="input mt-2 h-11 text-right tnum"
                    aria-label="Origin gross weight"
                  />
                </div>
                <div className="rounded-xl border border-line bg-canvas p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Weight at drop-off</p>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={weighbridge.destination}
                    onChange={(e) => setWeighbridge((prev) => ({ ...prev, destination: e.target.value }))}
                    placeholder="Gross kg"
                    className="input mt-2 h-11 text-right tnum"
                    aria-label="Destination gross weight"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-3.5">
                <div>
                  <p className="text-[13px] font-semibold text-ink">Difference in weight</p>
                  <p className="mt-0.5 text-[11.5px] text-muted">Up to 1.0% is allowed.</p>
                </div>
                {variance === null ? (
                  <Badge tone="neutral" size="md">Waiting for both weights</Badge>
                ) : (
                  <div className="text-right">
                    <p className="font-display text-[15px] font-bold tnum text-ink">
                      {variance >= 0 ? '+' : ''}
                      {num(variance, 2)}%
                    </p>
                    <Badge tone={Math.abs(variance) <= 1 ? 'verified' : 'critical'} size="sm" className="mt-1">
                      {Math.abs(variance) <= 1 ? 'Within the allowed limit' : 'Outside the allowed limit'}
                    </Badge>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={Camera} title="Sample photos" description="Photos saved with this order" />
            <CardBody>
              {images.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {images.map((image, index) => (
                    <figure key={index} className="overflow-hidden rounded-xl border border-line bg-canvas">
                      <img src={imgUrl(image)} alt={produce?.commodity_name || 'Sampling evidence'} className="h-24 w-full object-cover" />
                      <figcaption className="px-2.5 py-2 text-[11px] font-medium text-muted">
                        Sample {index + 1} · {produce?.commodity_name || 'Produce'}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-sage-400 bg-white/60 px-6 py-10 text-center">
                  <Camera size={22} className="mx-auto text-forest-500" />
                  <p className="mt-3 text-[13px] font-semibold text-ink">No evidence attached</p>
                  <p className="mt-1 text-[12px] text-muted">Photos from the farmer will appear here for you to check.</p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={Gavel} title="Your decision" description="Choose one result" />
            <CardBody className="space-y-2.5">
              {VERDICTS.map((option) => {
                const active = verdict === option.key
                const toneRing =
                  option.tone === 'critical'
                    ? 'border-critical-200 bg-critical-50'
                    : option.tone === 'gold'
                      ? 'border-harvest-200 bg-harvest-50'
                      : 'border-forest-200 bg-forest-50'
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setVerdict(option.key)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition',
                      active ? toneRing : 'border-line bg-white hover:border-sage-400',
                    )}
                    aria-pressed={active}
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2',
                        active ? 'border-forest-500' : 'border-sage-400',
                      )}
                    >
                      {active && <span className="h-2.5 w-2.5 rounded-full bg-forest-500" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[13.5px] font-bold text-ink">{option.label}</span>
                        {option.key === 'release' && <Badge tone="verified" size="sm">Recommended</Badge>}
                      </span>
                      <span className="mt-1 block text-[12.5px] leading-5 text-muted">{option.copy}</span>
                    </span>
                    <option.icon
                      size={18}
                      className={cn(
                        'mt-0.5 shrink-0',
                        option.tone === 'critical' ? 'text-critical-600' : option.tone === 'gold' ? 'text-harvest-600' : 'text-forest-600',
                      )}
                    />
                  </button>
                )
              })}
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader icon={BadgeCheck} title="Order details" description="People and place on record" />
            <CardBody className="space-y-1">
              <KeyValue label="Produce">{order?.produce?.commodity_name || '—'}</KeyValue>
              <KeyValue label="Load size">{order ? qtyUnit(order.quantity, 'units') : '—'}</KeyValue>
              <div className="rounded-xl border border-line bg-canvas p-3">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">Farmer / farm</p>
                <p className="mt-1 text-[13px] font-semibold text-ink">{order?.farmer?.name || '—'}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-muted">
                  <MapPin size={11} /> {produce?.location || 'Origin not stated'}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-canvas p-3">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">Buyer / drop-off</p>
                <p className="mt-1 text-[13px] font-semibold text-ink">{order?.buyer?.name || '—'}</p>
                <p className="mt-0.5 text-[11.5px] text-muted">Order #{order?.id ?? '—'}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={ShieldCheck} title="60% payment" description="Paid when the buyer confirms the goods arrived" />
            <CardBody>
              <p className="font-display text-[24px] font-extrabold tracking-tight text-forest-600 tnum">{money(milestone)}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                Held in escrow and released when the buyer confirms the goods arrived.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              icon={Fingerprint}
              title="Your sign-off"
              description={signed ? 'Recorded on this order' : 'Saved with your name and time'}
            />
            <CardBody className="space-y-3">
              <div className="relative grid min-h-28 place-items-center rounded-xl border border-dashed border-sage-400 bg-canvas px-4 py-4">
                {signed ? (
                  <div className="text-center">
                    <CheckCircle2 size={26} className="mx-auto text-forest-600" />
                    <p className="mt-1.5 text-[12px] font-semibold text-forest-600">
                      Signed · {fmtDateTime(inspection.signed_at)}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-muted">
                      {inspection.inspector?.name || 'Checker'} ·{' '}
                      {VERDICT_LABELS[inspection.verdict] || inspection.verdict}
                    </p>
                  </div>
                ) : (
                  <p className="text-center text-[11.5px] text-muted">Your signature will appear here</p>
                )}
              </div>
              <div className="space-y-2 text-[11.5px]">
                <div className="flex items-center gap-2 rounded-lg border border-line bg-white p-2.5">
                  <BadgeCheck size={15} className="shrink-0 text-forest-500" />
                  <div>
                    <p className="font-semibold text-ink">You are signed in</p>
                    <p className="text-muted">Your name is saved with this result</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-line bg-white p-2.5">
                  <MapPin size={15} className="shrink-0 text-forest-500" />
                  <div>
                    <p className="font-semibold text-ink">Time recorded</p>
                    <p className="text-muted">The date and time are saved with the result</p>
                  </div>
                </div>
              </div>
            </CardBody>
            <CardFooter className="flex-col items-stretch gap-2">
              <Button className="w-full" onClick={signOff} loading={saving} disabled={saving}>
                <Fingerprint size={15} /> {signed ? 'Sign this check again' : 'Sign off this check'}
              </Button>
              <p className="text-center text-[10.5px] leading-4 text-muted">
                This records your result. It does not move money.
              </p>
              <Button
                variant="outline"
                className="w-full border-critical-200 text-critical-600 hover:bg-critical-50"
                onClick={recordHold}
                loading={saving}
                disabled={saving}
              >
                <Snowflake size={15} /> Record a hold
              </Button>
            </CardFooter>
          </Card>
        </aside>
      </div>
    </div>
  )
}
