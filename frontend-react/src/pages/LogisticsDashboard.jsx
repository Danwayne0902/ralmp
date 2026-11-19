import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck, Clock3, Compass,
  Gauge, Loader2, MapPin, Navigation, Phone, RefreshCw, Route,
  ShieldCheck, Truck, Wallet,
} from 'lucide-react'
import { PageHeader, Stat, EmptyState, Skeleton, Table, Th, Td, Tr } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Field, Input, NativeSelect, Textarea } from '../components/ui/Form'
import { Modal } from '../components/ui/Overlay'
import { deliveryOfferService, logisticsService, payoutService } from '../lib/services'
import { fmtDate, money } from '../lib/format'
import { parseError, cn } from '../lib/utils'
import { useAuth } from '../store/auth'

const BOARD = [
  { key: 'assigned', label: 'Accepted', tone: 'pending', next: 'picked_up', nextLabel: 'Mark picked up' },
  { key: 'picked_up', label: 'Picked up', tone: 'gold', next: 'in_transit', nextLabel: 'Start transit' },
  { key: 'in_transit', label: 'On the way', tone: 'transit', next: 'delivered', nextLabel: 'Confirm delivery' },
  { key: 'delivered', label: 'Delivered', tone: 'verified', next: null },
]

const TONE_STYLES = {
  pending: 'border-harvest-200 bg-harvest-50 text-harvest-600',
  gold: 'border-harvest-200 bg-harvest-50 text-harvest-600',
  transit: 'border-transit-200 bg-transit-50 text-transit-700',
  verified: 'border-forest-200 bg-forest-50 text-forest-600',
}

export default function LogisticsDashboard() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [deliveries, setDeliveries] = useState([])
  const [payouts, setPayouts] = useState([])
  const [jobs, setJobs] = useState([])
  const [offerDraft, setOfferDraft] = useState({})
  const [offering, setOffering] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [active, setActive] = useState(null)
  const [event, setEvent] = useState({ status: 'picked_up', location: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [estimate, setEstimate] = useState({ distance: '', weight: '', delivery_type: 'standard' })
  const [quote, setQuote] = useState(null)
  const [quoting, setQuoting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [dashRes, deliveryRes, payoutRes, jobsRes] = await Promise.all([
        logisticsService.dashboard(),
        logisticsService.deliveries({ per_page: 50 }),
        payoutService.list({ per_page: 50 }),
        deliveryOfferService.openJobs().catch(() => ({ data: { jobs: [] } })),
      ])
      setDashboard(dashRes.data)
      setDeliveries(deliveryRes.data?.data || [])
      setPayouts(payoutRes.data?.data || [])
      setJobs(jobsRes.data?.jobs || [])
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

  const grouped = useMemo(() => {
    const map = { assigned: [], picked_up: [], in_transit: [], delivered: [] }
    deliveries.forEach((delivery) => {
      const key = map[delivery.status] ? delivery.status : delivery.status === 'pending' ? 'assigned' : 'delivered'
      map[key].push(delivery)
    })
    return map
  }, [deliveries])

  const paidToYou = payouts
    .filter((payout) => payout.status === 'paid')
    .reduce((sum, payout) => sum + Number(payout.amount || 0), 0)
  const onTheWay = payouts
    .filter((payout) => payout.status !== 'paid' && ['sending', 'pending', 'otp'].includes(payout.transfer_status))
    .reduce((sum, payout) => sum + Number(payout.amount || 0), 0)
  const readyToSend = payouts
    .filter((payout) => payout.status === 'pending' && !['sending', 'pending', 'otp'].includes(payout.transfer_status))
    .reduce((sum, payout) => sum + Number(payout.amount || 0), 0)

  function openUpdate(delivery, status) {
    setActive(delivery)
    setEvent({
      status: status || (delivery.status === 'assigned' ? 'picked_up' : delivery.status),
      location: delivery.pickup_location || '',
      notes: '',
    })
  }

  async function submitUpdate(e) {
    e.preventDefault()
    if (!active) return
    setSaving(true)
    try {
      await logisticsService.addTracking(active.id, {
        status: event.status,
        location: event.location || undefined,
        notes: event.notes || undefined,
      })
      toast.success('Delivery update saved')
      setActive(null)
      await load()
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setSaving(false)
    }
  }

  async function getQuote(e) {
    e.preventDefault()
    setQuoting(true)
    try {
      const res = await logisticsService.estimate({
        distance: Number(estimate.distance),
        weight: Number(estimate.weight),
        delivery_type: estimate.delivery_type,
      })
      setQuote(res.data)
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setQuoting(false)
    }
  }

  async function sendOffer(e, job) {
    e.preventDefault()
    const draft = offerDraft[job.order_id] || {}
    const amount = Number(draft.amount)
    if (!amount || amount <= 0) {
      toast.error('Enter the price you want to charge for this delivery.')
      return
    }
    setOffering(job.order_id)
    try {
      await deliveryOfferService.propose(job.order_id, {
        amount,
        note: draft.note?.trim() || undefined,
      })
      setOfferDraft((prev) => ({ ...prev, [job.order_id]: { amount: '', note: '' } }))
      toast.success('Delivery offer sent in chat. The buyer can accept or counter it.')
      await load()
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setOffering(null)
    }
  }

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="My jobs"
        title="Delivery jobs"
        description="Jobs given to you, with simple updates and a quick price check."
        actions={
          <Button variant="outline" size="md" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
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
            <Stat icon={Truck} label="Jobs in progress" value={dashboard?.active_deliveries ?? 0} hint="Accepted, picked up or moving" />
            <Stat icon={CheckCircle2} label="Delivered" value={dashboard?.completed_deliveries ?? 0} tone="sprout" hint="Dropped off at the buyer" />
            <Stat icon={Wallet} label="Ready to send" value={money(readyToSend)} tone="gold" hint="Released, waiting for the transfer" size="lg" />
            <Stat icon={Clock3} label="On the way" value={money(onTheWay)} hint="Bank transfer started" size="lg" />
            <Stat icon={ShieldCheck} label="Paid to you" value={money(paidToYou)} tone="neutral" hint="Bank transfers sent to you" size="lg" />
          </>
        )}
      </div>

      <div className="mt-5 rounded-card border border-line bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-[15px] font-bold text-ink">Open jobs</h2>
            <p className="mt-0.5 text-[11px] text-muted">
              Paid orders that still need a driver. Send a price; the buyer accepts or counters in chat.
            </p>
          </div>
          <Badge tone="pending" size="sm">{jobs.length} waiting</Badge>
        </div>

        {loading ? (
          <div className="space-y-2 p-5">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
        ) : jobs.length === 0 ? (
          <p className="px-5 py-7 text-center text-[12px] text-muted">
            No open jobs right now. New paid orders appear here.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {jobs.map((job) => {
              const draft = offerDraft[job.order_id] || {}
              const feeRate = Number(job.fee_percent ?? 5)
              const offerAmount = Number(draft.amount) || 0
              const offerNet = offerAmount > 0 ? offerAmount - (offerAmount * feeRate) / 100 : 0
              return (
                <div key={job.order_id} className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_250px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[12.5px] font-bold text-ink">Order #{job.order_id}</p>
                      <Badge tone="neutral" size="sm" className="capitalize">{job.status}</Badge>
                      {job.my_offer && (
                        <Badge tone="pending" size="sm">Your offer {money(job.my_offer.amount)}</Badge>
                      )}
                    </div>
                    <p className="mt-1 flex items-start gap-1 text-[11px] leading-4 text-ink-soft">
                      <MapPin size={11} className="mt-0.5 shrink-0 text-forest-500" />
                      <span className="break-words">{job.pickup_location || 'Farm gate'} → {job.delivery_location || 'Buyer delivery point'}</span>
                    </p>
                    <p className="mt-1 text-[10.5px] leading-4 text-muted">
                      {job.items?.map((item) => item.produce?.commodity_name || 'Produce').join(', ') || 'Goods'}
                    </p>
                    <p className="mt-1 text-[10.5px] text-muted">
                      Goods value {money(job.subtotal)} · Preferred pickup {fmtDate(job.delivery_date)}
                    </p>
                  </div>

                  <form onSubmit={(e) => sendOffer(e, job)} className="space-y-2">
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={draft.amount || ''}
                      onChange={(e) => setOfferDraft((prev) => ({ ...prev, [job.order_id]: { ...draft, amount: e.target.value } }))}
                      placeholder="Your price (₦)"
                      aria-label={`Delivery price for order ${job.order_id}`}
                      className="h-9 text-[12px]"
                    />
                    <p className="text-[10px] leading-4 text-muted">
                      {offerAmount > 0 ? (
                        <>
                          You receive{' '}
                          <span className="font-semibold text-forest-600 tnum">{money(offerNet)}</span> after the{' '}
                          {feeRate}% platform fee.
                        </>
                      ) : (
                        <>The {feeRate}% platform fee is taken from the price you agree.</>
                      )}
                    </p>
                    <Input
                      value={draft.note || ''}
                      onChange={(e) => setOfferDraft((prev) => ({ ...prev, [job.order_id]: { ...draft, note: e.target.value } }))}
                      maxLength={255}
                      placeholder="Note (optional)"
                      aria-label={`Note for order ${job.order_id}`}
                      className="h-9 text-[12px]"
                    />
                    <Button type="submit" size="sm" className="w-full" disabled={offering === job.order_id}>
                      {offering === job.order_id ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                      {offering === job.order_id ? 'Sending…' : 'Send offer'}
                    </Button>
                  </form>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-5">
          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="font-display text-[15px] font-bold text-ink">My jobs</h2>
                <p className="mt-0.5 text-[11px] text-muted">Tap a job to update it. The buyer and the farmer see the change at once.</p>
              </div>
              <Badge tone="live" size="sm"><span className="h-1.5 w-1.5 rounded-full bg-forest-500" /> Live</Badge>
            </div>

            {loading ? (
              <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
              </div>
            ) : deliveries.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="No jobs yet"
                description="We match you with paid orders. When a job is given to you, it shows here with the pickup, drop-off and delivery pay."
                className="border-0 shadow-none"
                action={<Button variant="outline" onClick={load}><RefreshCw size={14} /> Check again</Button>}
              />
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
                {BOARD.map((column) => (
                  <div key={column.key} className="rounded-xl border border-line bg-canvas p-2.5">
                    <div className="flex items-center justify-between px-1 pb-2">
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">{column.label}</p>
                      <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-muted tnum">
                        {grouped[column.key].length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {grouped[column.key].length === 0 && (
                        <p className="rounded-lg border border-dashed border-sage-400 px-2.5 py-6 text-center text-[10.5px] text-muted">
                          No jobs
                        </p>
                      )}
                      {grouped[column.key].map((delivery) => (
                        <article key={delivery.id} className="rounded-lg border border-line bg-white p-3 shadow-card">
                          <div className="flex items-start justify-between gap-2">
                            <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide', TONE_STYLES[column.tone])}>
                              #{delivery.id}
                            </span>
                            {(delivery.agreed_amount || delivery.delivery_cost) && (
                              <span className="text-[10.5px] font-bold text-forest-600 tnum">
                                {money(delivery.agreed_amount || delivery.delivery_cost)}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 flex items-start gap-1 text-[10.5px] leading-4 text-ink-soft">
                            <MapPin size={10} className="mt-0.5 shrink-0 text-forest-500" />
                            <span className="">{delivery.pickup_location || 'Origin'}</span>
                          </p>
                          <p className="mt-1 flex items-start gap-1 text-[10.5px] leading-4 text-muted">
                            <Navigation size={10} className="mt-0.5 shrink-0 text-harvest-500" />
                            <span className="">{delivery.delivery_location || 'Destination'}</span>
                          </p>
                          <p className="mt-2 flex items-center gap-1 text-[9.5px] text-muted">
                            <CalendarDays size={9} /> {fmtDate(delivery.pickup_date || delivery.created_at)}
                          </p>
                          {delivery.tracking_number && (
                            <p className="mt-1 break-words font-mono text-[9px] text-muted">WB {delivery.tracking_number}</p>
                          )}
                          <div className="mt-2.5 flex gap-1.5">
                            {column.next ? (
                              <Button size="sm" className="h-7 flex-1 px-2 text-[10.5px]" onClick={() => openUpdate(delivery, column.next)}>
                                {column.nextLabel}
                              </Button>
                            ) : (
                              <Badge tone="verified" size="sm" className="w-full justify-center">Settled</Badge>
                            )}
                            <Button size="icon-sm" variant="outline" onClick={() => openUpdate(delivery)} aria-label={`Update haul ${delivery.id}`}>
                              <Compass size={12} />
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="font-display text-[15px] font-bold text-ink">All my jobs</h2>
                <p className="mt-0.5 text-[11px] text-muted">Every job given to {user?.name || 'you'}.</p>
              </div>
              <span className="text-[10.5px] text-muted">{deliveries.length} records</span>
            </div>
            {loading ? (
              <div className="space-y-2 p-5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : deliveries.length === 0 ? (
              <p className="px-5 py-8 text-center text-[12px] text-muted">No jobs yet.</p>
            ) : (
              <Table minWidth={760}>
                <thead>
                  <tr>
                    <Th>Haul</Th>
                    <Th>Route</Th>
                    <Th>Driver / vehicle</Th>
                    <Th className="text-right">Delivery pay</Th>
                    <Th>Status</Th>
                    <Th>Tracking</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((delivery) => (
                    <Tr key={delivery.id}>
                      <Td>
                        <p className="font-semibold text-ink">#{delivery.id}</p>
                        <p className="text-[10px] text-muted">Order #{delivery.order_id}</p>
                      </Td>
                      <Td>
                        <p className="break-words text-[11.5px]">{delivery.pickup_location}</p>
                        <p className="break-words text-[10px] text-muted">→ {delivery.delivery_location}</p>
                      </Td>
                      <Td>
                        <p className="text-[11.5px]">{delivery.driver_name || 'Not assigned'}</p>
                        <p className="text-[10px] text-muted">{delivery.vehicle_info || 'No vehicle record'}</p>
                      </Td>
                      <Td className="text-right font-semibold tnum">
                        {delivery.agreed_amount || delivery.delivery_cost
                          ? money(delivery.agreed_amount || delivery.delivery_cost)
                          : '—'}
                      </Td>
                      <Td><Badge tone="neutral" size="sm" className="capitalize">{delivery.status?.replace('_', ' ')}</Badge></Td>
                      <Td className="font-mono text-[10px] text-muted">{delivery.tracking_number || '—'}</Td>
                      <Td>
                        <Button variant="ghost" size="icon-sm" onClick={() => openUpdate(delivery)} aria-label="Update haul">
                          <ArrowRight size={14} />
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-harvest-50 text-harvest-600">
                <Route size={15} />
              </span>
              <div>
                <h2 className="font-display text-[13.5px] font-bold text-ink">Price estimate</h2>
                <p className="text-[10px] text-muted">Our standard rate</p>
              </div>
            </div>
            <form onSubmit={getQuote} className="space-y-3 p-4">
              <Field label="Distance (km)" required>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                  value={estimate.distance}
                  onChange={(e) => setEstimate((prev) => ({ ...prev, distance: e.target.value }))}
                  placeholder="e.g. 145"
                  className="h-10 text-[12.5px]"
                />
              </Field>
              <Field label="Weight (kg)" required>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                  value={estimate.weight}
                  onChange={(e) => setEstimate((prev) => ({ ...prev, weight: e.target.value }))}
                  placeholder="e.g. 12000"
                  className="h-10 text-[12.5px]"
                />
              </Field>
              <Field label="Speed" required>
                <NativeSelect
                  value={estimate.delivery_type}
                  onChange={(e) => setEstimate((prev) => ({ ...prev, delivery_type: e.target.value }))}
                  className="h-10 text-[12.5px]"
                >
                  <option value="standard">Normal</option>
                  <option value="express">Fast (1.5×)</option>
                </NativeSelect>
              </Field>
              <Button type="submit" size="sm" className="w-full" disabled={quoting}>
                {quoting ? <Loader2 size={13} className="animate-spin" /> : <Gauge size={13} />}
                {quoting ? 'Calculating…' : 'Estimate price'}
              </Button>
            </form>

            {quote && (
              <div className="border-t border-line px-4 py-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Estimated price</p>
                <p className="mt-0.5 font-display text-[24px] font-extrabold tracking-tight text-forest-600 tnum">
                  {money(quote.estimated_cost)}
                </p>
                <dl className="mt-2 space-y-1 text-[10.5px]">
                  <div className="flex justify-between"><dt className="text-muted">Base</dt><dd className="tnum">{money(quote.breakdown?.base_cost)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Distance</dt><dd className="tnum">{money(quote.breakdown?.distance_cost)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Weight</dt><dd className="tnum">{money(quote.breakdown?.weight_cost)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Speed charge</dt><dd className="tnum">{quote.breakdown?.express_multiplier}×</dd></div>
                </dl>
                <p className="mt-2 text-[9.5px] leading-4 text-muted">
                  This is only a guide. The final price is what you and the buyer agree in chat. The platform fee is
                  taken from that agreed price, and the money is released after both the buyer and the farmer confirm
                  the goods arrived.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-card border border-line bg-white p-4 shadow-card">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
              <Wallet size={12} /> Delivery payouts
            </p>
            {!user?.account_number && (
              <div className="mt-2 rounded-lg border border-harvest-200 bg-harvest-50 p-2.5">
                <p className="text-[10.5px] font-semibold text-harvest-600">Add your bank account to get paid</p>
                <p className="mt-0.5 text-[10px] leading-4 text-harvest-600/85">
                  Delivery pay stays in escrow until your bank details are saved.
                </p>
                <Link to="/profile?tab=payout" className="mt-1.5 inline-flex text-[10.5px] font-bold text-harvest-600 underline underline-offset-2">
                  Add bank details
                </Link>
              </div>
            )}
            {payouts.length === 0 ? (
              <p className="mt-2 text-[11px] leading-4 text-muted">
                No delivery payout yet. The delivery fee is released when the buyer confirms delivery.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {payouts.slice(0, 5).map((payout) => (
                  <li key={payout.id} className="flex items-center justify-between gap-2 py-2 first:pt-0">
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-semibold text-ink">Order #{payout.order_id}</p>
                      <p className="break-all font-mono text-[9.5px] text-muted">{payout.reference}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[12px] font-bold text-forest-600 tnum">{money(payout.amount)}</p>
                      {Number(payout.platform_fee) > 0 && (
                        <p className="text-[9.5px] text-muted tnum">
                          after {money(payout.platform_fee)} fee
                        </p>
                      )}
                      <Badge
                        tone={payout.status === 'paid'
                          ? 'verified'
                          : ['failed', 'reversed'].includes(payout.transfer_status)
                            ? 'critical'
                            : 'pending'}
                        size="sm"
                        className="mt-0.5"
                      >
                        {payout.status === 'paid'
                          ? 'Sent'
                          : ['sending', 'pending', 'otp'].includes(payout.transfer_status)
                            ? 'Sending'
                            : ['failed', 'reversed'].includes(payout.transfer_status)
                              ? 'Failed'
                              : 'Ready'}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-card border border-forest-100 bg-forest-50 p-4">
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-forest-700">
              <ClipboardCheck size={13} /> What to send
            </p>
            <ul className="mt-2 space-y-2 text-[10.5px] leading-4 text-forest-700/80">
              <li>Pickup weight note before you leave</li>
              <li>Driver name and plate on the delivery note</li>
              <li>Weigh again when you arrive</li>
              <li>Buyer signs for the goods</li>
            </ul>
          </div>

          <div className="rounded-card border border-line bg-white p-4">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
              <Phone size={12} /> Transport team
            </p>
            <p className="mt-1.5 text-[11px] leading-5 text-muted">
              For jobs or problems, message our transport team and tell us where your truck is.
            </p>
            <Link to="/messages" className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-forest-600 hover:underline">
              <Phone size={12} /> Send a message
            </Link>
          </div>
        </aside>
      </div>

      <Modal
        open={Boolean(active)}
        onOpenChange={(open) => !open && setActive(null)}
        title={active ? `Update job #${active.id}` : 'Update job'}
        description="This updates the order for the buyer and the farmer."
        footer={
          <>
            <Button variant="ghost" onClick={() => setActive(null)} disabled={saving}>Cancel</Button>
            <Button onClick={submitUpdate} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {saving ? 'Saving…' : 'Update job'}
            </Button>
          </>
        }
      >
        {active && (
          <form onSubmit={submitUpdate} className="space-y-4">
            <dl className="grid gap-2 rounded-xl border border-line bg-canvas px-4 py-3 text-[11.5px] sm:grid-cols-2">
              <div><dt className="text-muted">Pickup</dt><dd className="font-semibold text-ink">{active.pickup_location}</dd></div>
              <div><dt className="text-muted">Destination</dt><dd className="font-semibold text-ink">{active.delivery_location}</dd></div>
              <div><dt className="text-muted">Delivery pay</dt><dd className="font-semibold text-ink tnum">{money(active.delivery_cost)}</dd></div>
              <div><dt className="text-muted">Current state</dt><dd className="font-semibold capitalize text-ink">{active.status?.replace('_', ' ')}</dd></div>
            </dl>

            <Field label="Job status" required>
              <NativeSelect value={event.status} onChange={(e) => setEvent((prev) => ({ ...prev, status: e.target.value }))}>
                <option value="assigned">Accepted / assigned</option>
                <option value="picked_up">Picked up at origin</option>
                <option value="in_transit">On the way</option>
                <option value="delivered">Delivered to destination</option>
                <option value="cancelled">Cancelled</option>
              </NativeSelect>
            </Field>

            <Field label="Place" hint="Weight bridge, park or gate">
              <Input
                value={event.location}
                onChange={(e) => setEvent((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="e.g. Ijebu-Ife weigh bridge"
              />
            </Field>

            <Field label="Weight and job notes">
              <Textarea
                rows={3}
                maxLength={1000}
                value={event.notes}
                onChange={(e) => setEvent((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Gross weight, tare, seal number, receiving officer…"
              />
            </Field>
          </form>
        )}
      </Modal>
    </div>
  )
}
