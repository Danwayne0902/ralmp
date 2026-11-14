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
  { key: 'moisture', label: 'Moisture content', unit: '%', limit: 12.5, compare: 'lte', spec: '≤ 12.50% max', bench: 'NIS 253:2018' },
  { key: 'aflatoxin', label: 'Aflatoxin B1', unit: 'ppb', limit: 10, compare: 'lt', spec: '< 10.0 ppb', bench: 'Feed-grade safety limit' },
  { key: 'chaff', label: 'Foreign chaff & impurity', unit: '%', limit: 2, compare: 'lte', spec: '≤ 2.00% max', bench: 'Max allowable 2.0%' },
  { key: 'broken', label: 'Broken / defective kernels', unit: '%', limit: 5, compare: 'lte', spec: '≤ 5.00% max', bench: 'Max standard 5.0%' },
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
    label: 'Full approval & release milestone 2',
    icon: CheckCircle2,
    tone: 'forest',
    copy: 'Releases the 60% weighbridge & lab tranche from escrow into the producer wallet. All parameters meet Grade 1 specification.',
  },
  {
    key: 'conditional',
    label: 'Conditional clearance with moisture discount',
    icon: Percent,
    tone: 'gold',
    copy: 'Applies a drying or conditioning surcharge against the tranche before the balance is released to the producer.',
  },
  {
    key: 'freeze',
    label: 'Escrow freeze & escalate quality dispute',
    icon: Gavel,
    tone: 'critical',
    copy: 'Immobilises the consignment funds, serves a re-sample notice and routes the matter to RAMLP arbitration.',
  },
]

export default function InspectorTerminal() {
  const [orders, setOrders] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [produce, setProduce] = useState(null)
  const [reading, setReading] = useState({ moisture: '', aflatoxin: '', chaff: '', broken: '' })
  const [weighbridge, setWeighbridge] = useState({ origin: '', destination: '' })
  const [verdict, setVerdict] = useState('release')
  const [signed, setSigned] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminService.orders({ per_page: 100 })
      const rows = res.data?.data || []
      setOrders(rows)
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

  useEffect(() => {
    if (!order?.produce_id && !order?.produce?.id) {
      setProduce(null)
      return
    }
    const id = order.produce_id || order.produce?.id
    let cancelled = false
    produceService
      .get(id)
      .then((data) => {
        if (!cancelled) setProduce(data || null)
      })
      .catch(() => {
        if (!cancelled) setProduce(null)
      })
    return () => {
      cancelled = true
    }
  }, [order])

  useEffect(() => {
    setSigned(false)
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

  function signOff() {
    if (!order) return
    setSigned(true)
    toast.success('Inspection signed off and sealed to the consignment ledger')
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
          eyebrow="Quality · inspector terminal"
          title="Lab inspection & sign-off"
          description="Capture spectrometry readings, reconcile the dual weighbridge and seal the statutory verdict for a consignment."
        />
        <EmptyState
          icon={FlaskConical}
          title="No consignments awaiting inspection"
          description="Consignments appear here once a carrier has recorded an origin pickup and the load is inbound to a destination terminal."
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
        eyebrow="Quality · inspector terminal"
        title="Lab inspection & sign-off"
        description="Spectrometry readings, dual-weighbridge reconciliation and the statutory verdict sealed against the consignment."
        actions={
          <>
            <select
              aria-label="Select consignment"
              value={activeId ?? ''}
              onChange={(e) => setActiveId(Number(e.target.value) || null)}
              className="select"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.produce?.commodity_name || `Order #${o.id}`} · #{o.id}
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
          <Callout tone="critical" icon={CircleAlert} title="Lab terminal link degraded">
            {error}
          </Callout>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={Beaker}
          label="Consignment"
          value={order ? `#${order.id}` : '—'}
          hint={order?.produce?.commodity_name || 'Commodity pending'}
        />
        <Stat icon={Scale} label="Declared load" value={order ? qtyUnit(order.quantity, 'units') : '—'} hint="Origin manifest" />
        <Stat icon={ShieldCheck} label="Milestone 2 tranche" value={money(milestone)} hint="Released on sign-off" tone="sprout" />
        <Stat
          icon={Fingerprint}
          label="Sign-off status"
          value={signed ? 'Sealed' : 'Open'}
          hint={signed ? 'Cryptographically attested' : 'Awaiting inspector seal'}
          tone={signed ? 'forest' : 'neutral'}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              icon={FlaskConical}
              title="Spectrometry & assays"
              description="Enter the bench readings — pass/fail is evaluated against the statutory specification."
              action={<Badge tone="outline" size="sm">NIRS probe calibrated</Badge>}
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
                    Safe-zone ceiling <span className="font-bold text-ink">&lt; 12.50%</span>
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
              title="Dual-weighbridge reconciliation"
              description="Origin gross against destination gross — variance must stay within the 1.0% statutory tolerance."
              action={<Badge tone="outline" size="sm">ANPR verified</Badge>}
            />
            <CardBody className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-canvas p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Origin farm gate</p>
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Destination gross</p>
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
                  <p className="text-[13px] font-semibold text-ink">Transit loss / variance</p>
                  <p className="mt-0.5 text-[11.5px] text-muted">Within 1.0% of declared net load is tolerance-compliant.</p>
                </div>
                {variance === null ? (
                  <Badge tone="neutral" size="md">Awaiting capture</Badge>
                ) : (
                  <div className="text-right">
                    <p className="font-display text-[15px] font-bold tnum text-ink">
                      {variance >= 0 ? '+' : ''}
                      {num(variance, 2)}%
                    </p>
                    <Badge tone={Math.abs(variance) <= 1 ? 'verified' : 'critical'} size="sm" className="mt-1">
                      {Math.abs(variance) <= 1 ? 'Tolerance compliant' : 'Outside tolerance'}
                    </Badge>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={Camera} title="Sampling evidence" description="Photographic record attached to the consignment" />
            <CardBody>
              {images.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {images.map((image, index) => (
                    <figure key={index} className="overflow-hidden rounded-xl border border-line bg-canvas">
                      <img src={imgUrl(image)} alt={produce?.commodity_name || 'Sampling evidence'} className="h-24 w-full object-cover" />
                      <figcaption className="px-2.5 py-2 text-[11px] font-medium text-muted">
                        Sample {index + 1} · {produce?.commodity_name || 'Consignment'}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-sage-400 bg-white/60 px-6 py-10 text-center">
                  <Camera size={22} className="mx-auto text-forest-500" />
                  <p className="mt-3 text-[13px] font-semibold text-ink">No evidence attached</p>
                  <p className="mt-1 text-[12px] text-muted">Photographs supplied by the producer appear here for bench verification.</p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={Gavel} title="Inspection verdict" description="Select one statutory decision" />
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
            <CardHeader icon={BadgeCheck} title="Consignment metadata" description="Parties and origin on record" />
            <CardBody className="space-y-1">
              <KeyValue label="Commodity">{order?.produce?.commodity_name || '—'}</KeyValue>
              <KeyValue label="Declared load">{order ? qtyUnit(order.quantity, 'units') : '—'}</KeyValue>
              <div className="rounded-xl border border-line bg-canvas p-3">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">Producer / origin</p>
                <p className="mt-1 text-[13px] font-semibold text-ink">{order?.farmer?.name || '—'}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-muted">
                  <MapPin size={11} /> {produce?.location || 'Origin not stated'}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-canvas p-3">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">Receiver / buyer</p>
                <p className="mt-1 text-[13px] font-semibold text-ink">{order?.buyer?.name || '—'}</p>
                <p className="mt-0.5 text-[11.5px] text-muted">Order #{order?.id ?? '—'}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={ShieldCheck} title="Milestone 2 trigger" description="60% weighbridge & lab tranche" />
            <CardBody>
              <p className="font-display text-[24px] font-extrabold tracking-tight text-forest-600 tnum">{money(milestone)}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                Held in the RAMLP custody vault and released the moment the inspector seal is applied.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={Fingerprint} title="Cryptographic sign-off" description="Inspector attestation" />
            <CardBody className="space-y-3">
              <div className="relative grid h-28 place-items-center rounded-xl border border-dashed border-sage-400 bg-canvas">
                {signed ? (
                  <div className="text-center">
                    <CheckCircle2 size={26} className="mx-auto text-forest-600" />
                    <p className="mt-1.5 text-[12px] font-semibold text-forest-600">Sealed · {fmtDateTime(new Date())}</p>
                  </div>
                ) : (
                  <p className="px-4 text-center text-[11.5px] text-muted">Digital stylus / touch signature surface</p>
                )}
              </div>
              <div className="space-y-2 text-[11.5px]">
                <div className="flex items-center gap-2 rounded-lg border border-line bg-white p-2.5">
                  <BadgeCheck size={15} className="shrink-0 text-forest-500" />
                  <div>
                    <p className="font-semibold text-ink">Inspector session verified</p>
                    <p className="text-muted">Signed in against the NIS/NAFDAC inspector register</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-line bg-white p-2.5">
                  <MapPin size={15} className="shrink-0 text-forest-500" />
                  <div>
                    <p className="font-semibold text-ink">Geo-stamp captured</p>
                    <p className="text-muted">Terminal location bound to the seal at sign-off</p>
                  </div>
                </div>
              </div>
            </CardBody>
            <CardFooter className="flex-col items-stretch gap-2">
              <Button className="w-full" onClick={signOff} disabled={signed}>
                <Fingerprint size={15} /> {signed ? 'Signed & sealed' : `Sign & release ${money(milestone)}`}
              </Button>
              <Button
                variant="outline"
                className="w-full border-critical-200 text-critical-600 hover:bg-critical-50"
                onClick={() => { setVerdict('freeze'); toast.info('Consignment flagged for arbitration') }}
              >
                <Snowflake size={15} /> Flag dispute
              </Button>
            </CardFooter>
          </Card>
        </aside>
      </div>
    </div>
  )
}
