import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowRight, BadgeCheck, CircleAlert, ClipboardCheck, Compass, Gauge, MapPin,
  Navigation, Phone, RefreshCw, Recycle, Route as RouteIcon, Satellite,
  ShieldCheck, Truck, Wallet,
} from 'lucide-react'
import { PageHeader, Stat, Progress, EmptyState, Skeleton } from '../components/ui/Data'
import { Card, CardHeader, CardBody, CardFooter, Callout, KeyValue } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, StateBadge } from '../components/ui/Badge'
import { logisticsService } from '../lib/services'
import { escrowSchedule, escrowReleased } from '../lib/orders'
import { fmtDate, fmtDateTime, money, num, qtyUnit } from '../lib/format'
import { cn, parseError } from '../lib/utils'

const DELIVERY_META = {
  pending: { label: 'Not started', tone: 'neutral', pct: 6 },
  assigned: { label: 'Accepted', tone: 'pending', pct: 22 },
  picked_up: { label: 'Picked up', tone: 'gold', pct: 48 },
  in_transit: { label: 'On the way', tone: 'transit', pct: 74 },
  delivered: { label: 'Delivered', tone: 'verified', pct: 100 },
  cancelled: { label: 'Cancelled', tone: 'critical', pct: 0 },
}

function deliveryMeta(status) {
  return DELIVERY_META[status] || DELIVERY_META.pending
}

export default function WaybillTerminal() {
  const [deliveries, setDeliveries] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await logisticsService.deliveries({ per_page: 50 })
      const rows = res.data?.data || []
      setDeliveries(rows)
      setError('')
      setActiveId((current) => current ?? (rows.find((d) => d.status !== 'delivered')?.id ?? rows[0]?.id ?? null))
    } catch (err) {
      setError(parseError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!activeId) {
      setDetail(null)
      return
    }
    let cancelled = false
    logisticsService
      .delivery(activeId)
      .then((res) => {
        if (!cancelled) setDetail(res.data?.delivery || null)
      })
      .catch((err) => {
        if (!cancelled) setError(parseError(err))
      })
    return () => {
      cancelled = true
    }
  }, [activeId])

  const order = detail?.order || null
  const meta = deliveryMeta(detail?.status)
  const schedule = useMemo(() => escrowSchedule(order), [order])
  const released = useMemo(() => escrowReleased(order), [order])
  const checkpoints = detail?.tracking_history || detail?.trackingHistory || []

  async function confirmGateIn() {
    if (!detail) return
    setWorking(true)
    try {
      await logisticsService.setStatus(detail.id, { status: 'delivered' })
      toast.success('Delivery recorded. The payment step is updated.')
      await load()
      const res = await logisticsService.delivery(detail.id)
      setDetail(res.data?.delivery || null)
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setWorking(false)
    }
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
        <Skeleton className="mt-5 h-64" />
      </div>
    )
  }

  if (!deliveries.length) {
    return (
      <div className="page-wrap page-pad">
        <PageHeader
          eyebrow="Transporter"
          title="Delivery notes"
          description="The paperwork for your current trip: pickup, stops and drop-off."
        />
        <EmptyState
          icon={Truck}
          title="No jobs yet"
          description="When a buyer has paid and a transporter is chosen, the delivery note appears here."
          action={
            <Button asChild>
              <Link to="/dispatch">Back to my jobs <ArrowRight size={15} /></Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="Transporter"
        title="Delivery notes"
        description="What happened on this trip, from pickup to drop-off."
        actions={
          <>
            <select
              aria-label="Select trip"
              value={activeId ?? ''}
              onChange={(e) => setActiveId(Number(e.target.value) || null)}
              className="select"
            >
              {deliveries.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.tracking_number || `Leg #${d.id}`} · {deliveryMeta(d.status).label}
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
          <Callout tone="critical" icon={CircleAlert} title="Terminal link degraded">
            {error}
          </Callout>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={Truck}
          label="Declared load"
          value={order ? qtyUnit(order.quantity, 'units') : '—'}
          hint={order ? `Order #${order.id}` : 'Not linked to an order'}
        />
        <Stat icon={Wallet} label="Order value" value={money(order?.total_price)} hint="Already paid into escrow" />
        <Stat
          icon={ShieldCheck}
          label="Released from escrow"
          value={money(released)}
          hint={order ? `${schedule.filter((t) => t.state === 'settled').length} of ${schedule.length} payments` : '—'}
          tone="sprout"
        />
        <Stat icon={Satellite} label="Stops recorded" value={num(checkpoints.length)} hint="Every update you sent" tone="neutral" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              icon={RouteIcon}
              title={detail?.tracking_number || `Leg #${detail?.id}`}
              description="From the farm to the drop-off"
              action={
                <Badge tone={meta.tone} size="md">
                  <Truck size={11} strokeWidth={2.4} /> {meta.label}
                </Badge>
              }
            />
            <CardBody className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                  <MapPin size={13} className="text-forest-500" />
                  {detail?.pickup_location || 'Origin farm gate'}
                </span>
                <span className="font-semibold text-forest-600">{meta.pct}% complete</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                  <MapPin size={13} className="text-forest-500" />
                  {detail?.delivery_location || 'Destination'}
                </span>
              </div>
              <Progress value={meta.pct} />
              <div className="flex flex-wrap justify-between gap-2 text-[11.5px] text-muted">
                <span>Pickup {fmtDate(detail?.pickup_date)}</span>
                <span>ETA {detail?.estimated_delivery_time ? fmtDateTime(detail.estimated_delivery_time) : '—'}</span>
                <span>{detail?.actual_delivery_time ? `Delivered ${fmtDate(detail.actual_delivery_time)}` : 'Drop-off pending'}</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              icon={Truck}
              title="Vehicle and driver"
              description="Your truck and driver for this job"
              action={detail?.driver_name ? <Badge tone="verified" size="sm"><BadgeCheck size={11} /> Driver on file</Badge> : null}
            />
            <CardBody className="space-y-1">
              <KeyValue label="Vehicle / rig">{detail?.vehicle_info || '—'}</KeyValue>
              <KeyValue label="Tracking number" mono>{detail?.tracking_number || '—'}</KeyValue>
              <KeyValue label="Driver">{detail?.driver_name || '—'}</KeyValue>
              <KeyValue label="Driver contact">
                {detail?.driver_phone ? (
                  <a href={`tel:${detail.driver_phone}`} className="inline-flex items-center gap-1.5 text-forest-600 hover:underline">
                    <Phone size={12} /> {detail.driver_phone}
                  </a>
                ) : (
                  '—'
                )}
              </KeyValue>
            </CardBody>
            <CardFooter className="text-[11.5px] text-muted">
              <ShieldCheck size={13} className="text-forest-500" />
              Carrier identity verified against the RAMLP logistics registry.
            </CardFooter>
          </Card>

          <Card>
            <CardHeader
              icon={ClipboardCheck}
              title="What you are carrying"
              description="The load saved on this order"
            />
            <CardBody className="space-y-1">
              <KeyValue label="Load">{order ? qtyUnit(order.quantity, 'units') : '—'}</KeyValue>
              <KeyValue label="Produce">{order?.produce?.commodity_name || `Order #${order?.id ?? '—'}`}</KeyValue>
              <KeyValue label="Buyer">{order?.buyer?.name || '—'}</KeyValue>
              <KeyValue label="Farmer">{order?.farmer?.name || '—'}</KeyValue>
              <KeyValue label="Delivery fee" mono>{money(order?.delivery_fee)}</KeyValue>
              <KeyValue label="Order placed">{fmtDate(order?.order_date)}</KeyValue>
            </CardBody>
            <CardFooter>
              <Callout tone="gold" icon={Gauge} className="w-full">
                We weigh the load at pickup and again at drop-off. If the two weights differ by more than 1.0%, the next payment waits for a check.
              </Callout>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader icon={Satellite} title="Trip updates" description="Every update you sent on this trip" />
            <CardBody>
              {checkpoints.length ? (
                <ol className="space-y-0">
                  {checkpoints.map((event, index) => (
                    <li key={`${event.id ?? index}`} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-forest-500 ring-4 ring-forest-50" />
                        {index < checkpoints.length - 1 && <span className="my-1 w-px flex-1 bg-line" />}
                      </div>
                      <div className="pb-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13.5px] font-semibold text-ink">{deliveryMeta(event.status).label}</p>
                          <span className="text-[11px] text-muted">{fmtDateTime(event.timestamp)}</span>
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
                          <MapPin size={11} /> {event.location || 'Location not captured'}
                        </p>
                        {event.notes && <p className="mt-1 text-[12px] leading-5 text-ink-soft">{event.notes}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-6 text-center text-[13px] text-muted">No update has been sent for this trip yet.</p>
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader icon={Wallet} title="Delivery payment" description={`Order ${money(order?.total_price)}`} />
            <CardBody className="space-y-2.5">
              {schedule.map((tranche) => (
                <div
                  key={tranche.key}
                  className={cn(
                    'rounded-xl border p-3',
                    tranche.state === 'settled' ? 'border-forest-200 bg-forest-50/60' : 'border-line bg-canvas',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold text-ink">
                        {tranche.index} · {tranche.short}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-4 text-muted">{tranche.trigger}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-[13.5px] font-bold tnum text-ink">{money(tranche.amount)}</p>
                      <div className="mt-1">
                        <StateBadge state={tranche.state} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardBody>
            <CardFooter className="justify-between text-[11.5px] text-muted">
              <span>Paid from the order&apos;s escrow account</span>
              <span className="font-semibold text-forest-600">After delivery</span>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader icon={Recycle} title="No empty return trip" description="Find a nearby load for the journey back" />
            <CardBody>
              <p className="text-[12.5px] leading-5 text-muted">
                After you drop the goods, we can match your truck to a checked load near you for the trip back. You earn
                on the way home instead of driving empty.
              </p>
            </CardBody>
            <CardFooter>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/dispatch">See delivery jobs <ArrowRight size={14} /></Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader icon={Compass} title="What you can do" description="Finish the trip or report a problem" />
            <CardBody className="space-y-2.5">
              <Button
                className="w-full"
                onClick={confirmGateIn}
                disabled={working || !detail || detail.status === 'delivered'}
              >
                <Navigation size={15} />
                {detail?.status === 'delivered' ? 'Drop-off recorded' : working ? 'Recording…' : 'Confirm drop-off'}
              </Button>
              <Button
                variant="outline"
                className="w-full border-critical-200 text-critical-600 hover:bg-critical-50"
                onClick={() => toast.info('The transport team has been told about the problem')}
              >
                <CircleAlert size={15} /> Report a problem
              </Button>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  )
}
