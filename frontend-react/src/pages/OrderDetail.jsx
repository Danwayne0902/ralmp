import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowLeft, ArrowRight, BadgeCheck, Building2, Check, CheckCircle2,
  CircleAlert, ClipboardList, Clock3, CreditCard, FileText, Loader2, Lock, MapPin,
  MessageSquare, Package, Phone, Printer, ShieldCheck, Sprout, Truck, Wallet,
  X,
} from 'lucide-react'
import { PageHeader, EmptyState, Loading, Table, Th, Td, Tr } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { KeyValue, Callout } from '../components/ui/Card'
import { Modal } from '../components/ui/Overlay'
import { EscrowLedger, MilestoneSchedule, SettlementTimeline } from '../components/finance/Escrow'
import { deliveryOfferService, orderService, paymentService } from '../lib/services'
import { loadPaystackScript, openPaystackPayment } from '../lib/paystack'
import { fmtDate, fmtDateTime, money, qtyUnit } from '../lib/format'
import { escrowFeePercent } from '../lib/orders'
import { parseError } from '../lib/utils'
import { useAuth } from '../store/auth'

const NEXT_STATUS = {
  pending: { value: 'confirmed', label: 'Accept order', tone: 'primary' },
  accepted: { value: 'processing', label: 'Begin processing', tone: 'primary' },
  confirmed: { value: 'processing', label: 'Begin processing', tone: 'primary' },
  processing: { value: 'shipped', label: 'Send with delivery note', tone: 'primary' },
  shipped: { value: 'delivered', label: 'Mark delivered', tone: 'primary' },
  delivered: { value: 'completed', label: 'Close & settle', tone: 'secondary' },
}

function PartyCard({ title, person, role, action }) {
  return (
    <div className="rounded-card border border-line bg-white p-4">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{title}</p>
      <div className="mt-2.5 flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-forest-50 text-forest-600">
          {role === 'buyer' ? <Building2 size={16} /> : <Sprout size={16} />}
        </span>
        <div className="min-w-0">
          <p className="break-words text-[13px] font-bold text-ink">{person?.name || 'Not assigned'}</p>
          <p className="text-[10.5px] text-muted">
            {[person?.lga, person?.state].filter(Boolean).join(', ') || 'Location not disclosed'}
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-1.5 text-[11px] text-muted">
        {person?.phone && (
          <a href={`tel:${person.phone}`} className="flex items-center gap-1.5 hover:text-forest-600">
            <Phone size={11} /> {person.phone}
          </a>
        )}
        {person?.address && (
          <p className="flex items-start gap-1.5">
            <MapPin size={11} className="mt-0.5 shrink-0" /> {person.address}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}

function OfferCard({ offer, busy, onAccept, onDecline, onCounter }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const statusTone =
    offer.status === 'accepted'
      ? 'verified'
      : offer.status === 'proposed'
        ? 'pending'
        : 'neutral'

  async function submitCounter(e) {
    e.preventDefault()
    const value = Number(amount)
    if (!value || value <= 0) {
      toast.error('Enter the price you want to offer.')
      return
    }
    await onCounter(offer, value, note.trim())
    setOpen(false)
    setAmount('')
    setNote('')
  }

  return (
    <div className="rounded-xl border border-line bg-white p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-[12px] font-bold text-ink">
            {offer.driver?.name || 'Driver'}
            {offer.mine && <span className="ml-1.5 text-[10px] font-medium text-muted">(your offer)</span>}
          </p>
          <p className="text-[10px] text-muted">
            {offer.proposer?.name ? `Sent by ${offer.proposer.name}` : 'Delivery price'} · {fmtDateTime(offer.created_at)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-[16px] font-extrabold text-forest-600 tnum">{money(offer.amount)}</p>
          <Badge tone={statusTone} size="sm" className="capitalize">{offer.status}</Badge>
        </div>
      </div>

      {offer.note && <p className="mt-2 text-[11px] leading-5 text-muted">{offer.note}</p>}

      {offer.status === 'proposed' && (offer.can_accept || offer.mine) && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {offer.can_accept && (
            <Button size="sm" className="h-7 px-2.5 text-[10.5px]" onClick={() => onAccept(offer)} disabled={busy}>
              <Check size={12} /> Accept price
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 px-2.5 text-[10.5px]" onClick={() => setOpen((v) => !v)} disabled={busy}>
            Counter
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2.5 text-[10.5px]" onClick={() => onDecline(offer)} disabled={busy}>
            Decline
          </Button>
        </div>
      )}

      {offer.status === 'accepted' && (
        <p className="mt-2 text-[10.5px] font-medium text-forest-600">
          Price locked in. Pay it below before pickup.
        </p>
      )}

      {open && offer.status === 'proposed' && (
        <form onSubmit={submitCounter} className="mt-2.5 space-y-2 border-t border-line pt-2.5">
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Your price (₦)"
              aria-label="Counter-offer amount"
              className="h-8 w-full rounded-lg border border-line bg-canvas px-2.5 text-[11.5px] outline-none focus:border-forest-500"
            />
            <Button type="submit" size="sm" className="h-8 shrink-0 px-2.5 text-[10.5px]" disabled={busy}>
              Send
            </Button>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={255}
            placeholder="Short note (optional)"
            aria-label="Counter-offer note"
            className="h-8 w-full rounded-lg border border-line bg-canvas px-2.5 text-[11px] outline-none focus:border-forest-500"
          />
        </form>
      )}
    </div>
  )
}

export default function OrderDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [negotiation, setNegotiation] = useState(null)
  const [offerBusy, setOfferBusy] = useState(false)
  const [payingDelivery, setPayingDelivery] = useState(false)

  const isBuyer = order && user?.id === order.buyer_id
  const isFarmer = order && user?.id === order.farmer_id
  const isAdmin = user?.role === 'admin'
  const canManage = isFarmer || isAdmin
  const canCancel = isBuyer && ['pending', 'confirmed'].includes(order?.status)

  async function load() {
    const res = await orderService.get(id)
    const data = res.data?.order || res.data
    setOrder(data)
    try {
      const offersRes = await deliveryOfferService.forOrder(id)
      setNegotiation(offersRes.data)
    } catch {
      // A read failure must not hide the order itself.
    }
    return data
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([
      orderService.get(id),
      deliveryOfferService.forOrder(id).catch(() => null),
    ])
      .then(([res, offersRes]) => {
        if (!active) return
        setOrder(res.data?.order || res.data)
        if (offersRes) setNegotiation(offersRes.data)
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
  }, [id])

  async function setStatus(status) {
    setUpdating(true)
    try {
      await orderService.setStatus(id, status)
      await load()
      toast.success(`Order moved to ${status}`)
      setConfirm(null)
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setUpdating(false)
    }
  }

  async function confirmDelivery() {
    setUpdating(true)
    try {
      const res = await orderService.confirmDelivery(id)
      await load()
      toast.success(res.data?.message || 'Delivery confirmed. The final payment is released.')
      setConfirm(null)
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setUpdating(false)
    }
  }

  async function acceptOffer(offer) {
    setOfferBusy(true)
    try {
      await deliveryOfferService.accept(offer.id)
      await load()
      toast.success(isBuyer ? 'Delivery price locked in. Pay it below before pickup.' : 'Delivery price locked in.')
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setOfferBusy(false)
    }
  }

  async function declineOffer(offer) {
    setOfferBusy(true)
    try {
      await deliveryOfferService.decline(offer.id)
      await load()
      toast.success('Offer declined.')
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setOfferBusy(false)
    }
  }

  async function counterOffer(offer, amount, note) {
    setOfferBusy(true)
    try {
      await deliveryOfferService.propose(id, {
        amount,
        note: note || undefined,
        driver_id: offer.driver?.id,
      })
      await load()
      toast.success('Counter-offer sent in chat.')
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setOfferBusy(false)
    }
  }

  async function payDelivery() {
    const target = order?.delivery || negotiation?.delivery
    if (!target) return
    setPayingDelivery(true)
    try {
      const res = await paymentService.initialize({
        order_id: Number(id),
        delivery_id: target.id,
        callback_url: `${window.location.origin}/orders/${id}`,
        email: user?.email,
      })

      const init = res.data
      await loadPaystackScript()

      const result = await openPaystackPayment({
        email: user?.email,
        amount: Number(target.agreed_amount || 0),
        reference: init.reference,
        metadata: { order_id: Number(id), delivery_id: target.id, kind: 'delivery' },
      })

      await paymentService.verify(result?.reference || init.reference)
      await load()
      toast.success('Delivery paid. The money is held until both sides confirm the goods arrived.')
    } catch (err) {
      if (err?.message === 'Payment cancelled') {
        toast.info('Payment window closed. The delivery price is still locked in.')
      } else {
        toast.error(parseError(err))
      }
    } finally {
      setPayingDelivery(false)
    }
  }

  async function confirmHandover() {
    setUpdating(true)
    try {
      const res = await deliveryOfferService.confirmHandover(id)
      await load()
      toast.success(res.data?.message || 'Handover confirmed.')
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setUpdating(false)
    }
  }

  async function cancelOrder() {
    setUpdating(true)
    try {
      await orderService.cancel(id)
      await load()
      toast.success('Order cancelled and stock restored')
      setConfirm(null)
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setUpdating(false)
    }
  }

  const items = useMemo(() => {
    if (!order) return []
    if (order.items?.length) return order.items
    return [
      {
        id: 'primary',
        produce: order.produce,
        quantity: order.quantity,
        unit_price: order.unit_price,
        subtotal: order.subtotal,
      },
    ]
  }, [order])

  if (loading) {
    return (
      <div className="page-wrap page-pad">
        <Loading label="Loading order" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="page-wrap page-pad">
        <EmptyState
          icon={Package}
          title="You cannot open this order"
          description={error || 'This order does not exist or you do not have permission to view it.'}
          action={
            <Button asChild variant="outline">
              <Link to="/orders">
                <ArrowLeft size={14} /> Back to orders
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  const next = NEXT_STATUS[order.status]
  const paid = order.payment_status === 'paid'
  const delivery = order.delivery || negotiation?.delivery || null
  const offers = negotiation?.offers || []
  const deliveryPaid = delivery?.payment_status === 'paid'
  const feePercent = Number(negotiation?.fee_percent ?? delivery?.fee_percent ?? 5)
  const goodsRate = escrowFeePercent(order)
  const goodsBase = Number(order.subtotal || 0)
  const goodsFee = Math.round((goodsBase * goodsRate) / 100 * 100) / 100
  const farmerReceives = Math.round((goodsBase - goodsFee) * 100) / 100
  const agreedAmount = Number(delivery?.agreed_amount || 0)
  const driverReceives = Number(
    delivery?.driver_receives ?? (agreedAmount - agreedAmount * feePercent / 100),
  )
  const canPayDelivery = isBuyer && Boolean(delivery) && agreedAmount > 0 && !deliveryPaid && paid
  const canConfirmHandover = isFarmer && Boolean(delivery) && paid && !delivery?.farmer_confirmed_at
  const waybill = order.delivery?.tracking_number || null
  const tracking = order.delivery?.tracking_history || order.delivery?.trackingHistory || []
  const counterparty = isFarmer ? order.buyer : order.farmer

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow={`Order #${order.id}`}
        title={order.produce?.commodity_name || items[0]?.produce?.commodity_name || 'Agricultural lot order'}
        description={`Placed ${fmtDateTime(order.order_date || order.created_at)} · ${qtyUnit(order.quantity, order.produce?.unit || items[0]?.produce?.unit || 'units')}`}
        actions={
          <>
            <Button asChild variant="ghost" size="md">
              <Link to="/orders">
                <ArrowLeft size={15} /> All orders
              </Link>
            </Button>
            <StatusBadge status={order.status} size="lg" />
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge tone={paid ? 'verified' : 'pending'} size="md">
          {paid ? <BadgeCheck size={11} /> : <Clock3 size={11} />}
          {paid ? 'Payment received' : 'Not paid yet'}
        </Badge>
        {order.delivery?.tracking_number && (
          <Badge tone="transit" size="md"><Truck size={11} /> WB {order.delivery.tracking_number}</Badge>
        )}
        {order.status === 'cancelled' && (
          <Badge tone="critical" size="md"><CircleAlert size={11} /> Payment on hold · stock returned</Badge>
        )}
        <p className="text-[11px] text-muted">
          Delivery requested for <span className="font-semibold text-ink-soft">{fmtDate(order.delivery_date)}</span>
        </p>
      </div>

      <SettlementTimeline order={order} className="mb-6" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
                <ClipboardList size={16} className="text-forest-500" /> Order lines
              </h2>
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-muted">
                {order.payment_status === 'paid' ? 'Funded' : 'Unfunded'}
              </span>
            </div>
            <Table minWidth={560}>
              <thead>
                <tr>
                  <Th>Commodity</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="text-right">Unit price</Th>
                  <Th className="text-right">Subtotal</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <Tr key={item.id}>
                    <Td>
                      <p className="font-semibold text-ink">{item.produce?.commodity_name || 'Lot withdrawn'}</p>
                      <p className="text-[10.5px] capitalize text-muted">{item.produce?.category || order.produce?.category || 'produce'}</p>
                    </Td>
                    <Td className="text-right tnum">
                      {qtyUnit(item.quantity, item.produce?.unit || order.produce?.unit)}
                    </Td>
                    <Td className="text-right tnum">{money(item.unit_price)}</Td>
                    <Td className="text-right font-semibold text-ink tnum">{money(item.subtotal)}</Td>
                  </Tr>
                ))}
                <Tr className="hover:bg-transparent">
                  <Td colSpan={3} className="text-right text-[11.5px] text-muted">Delivery (agreed in chat)</Td>
                  <Td className="text-right tnum">
                    {agreedAmount > 0 ? money(agreedAmount) : 'Not agreed yet'}
                  </Td>
                </Tr>
                <Tr className="hover:bg-transparent">
                  <Td colSpan={3} className="text-right text-[12px] font-bold text-ink">Goods paid</Td>
                  <Td className="text-right font-display text-[16px] font-extrabold text-forest-600 tnum">
                    {money(order.total_price)}
                  </Td>
                </Tr>
                {goodsFee > 0 && (
                  <Tr className="hover:bg-transparent">
                    <Td colSpan={3} className="text-right text-[11.5px] text-muted">
                      Platform fee {goodsRate}% · farmer receives
                    </Td>
                    <Td className="text-right text-[11.5px] tnum">
                      <span className="text-muted">−{money(goodsFee)}</span>
                      <span className="text-muted"> · </span>
                      <span className="font-semibold text-forest-600">{money(farmerReceives)}</span>
                    </Td>
                  </Tr>
                )}
              </tbody>
            </Table>
            {order.notes && (
              <div className="border-t border-line px-5 py-4">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">Buyer notes</p>
                <p className="mt-1 whitespace-pre-line text-[12px] leading-5 text-ink-soft/85">{order.notes}</p>
              </div>
            )}
          </div>

          <MilestoneSchedule order={order} />

          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
                <Truck size={16} className="text-forest-500" /> Delivery
              </h2>
              {delivery?.status ? (
                <Badge tone="transit" size="sm">{delivery.status.replace('_', ' ')}</Badge>
              ) : (
                <Badge tone="neutral" size="sm">Waiting for a driver</Badge>
              )}
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <dl className="space-y-0.5">
                  <KeyValue label="Delivery note number" mono>{waybill || 'Not issued yet'}</KeyValue>
                  <KeyValue label="Driver">
                    {delivery?.logistics_provider?.name || delivery?.logisticsProvider?.name || 'Finding a driver'}
                  </KeyValue>
                  <KeyValue label="Vehicle and plate">{delivery?.vehicle_number || 'Not assigned'}</KeyValue>
                  <KeyValue label="Origin">{order.produce?.location || order.farmer?.address || 'Farm gate'}</KeyValue>
                  <KeyValue label="Destination">
                    {[order.buyer?.lga, order.buyer?.state].filter(Boolean).join(', ') || order.buyer?.address || 'Buyer delivery point'}
                  </KeyValue>
                </dl>

                {tracking.length > 0 ? (
                  <ol className="mt-4 space-y-3 border-t border-line pt-4">
                    {tracking.map((event, index) => (
                      <li key={event.id || index} className="flex gap-2.5">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest-50 text-forest-600">
                          <Check size={10} strokeWidth={3} />
                        </span>
                        <div>
                          <p className="text-[11.5px] font-semibold text-ink">{event.status || event.description}</p>
                          <p className="text-[10px] text-muted">
                            {event.location ? `${event.location} · ` : ''}
                            {fmtDateTime(event.created_at)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-4 rounded-xl border border-dashed border-sage-400 bg-canvas px-3.5 py-3 text-[11.5px] leading-5 text-muted">
                    Updates appear when a transporter accepts the job and records the pickup weight.
                  </p>
                )}
              </div>

              <div className="flex flex-col items-center justify-start gap-2 sm:border-l sm:border-line sm:pl-5">
                {waybill ? (
                  <>
                    <div className="rounded-xl border border-line bg-white p-2.5">
                      <QRCodeSVG
                        value={`${window.location.origin}/orders/${order.id}`}
                        size={108}
                        bgColor="#FFFFFF"
                        fgColor="#0F2417"
                        level="M"
                      />
                    </div>
                    <p className="text-center font-mono text-[9px] leading-3 text-muted">Scan to check<br />this order</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1"
                      onClick={() => window.print()}
                    >
                      <Printer size={13} /> Print
                    </Button>
                  </>
                ) : (
                  <div className="grid h-[150px] w-[150px] place-items-center rounded-xl border border-dashed border-sage-400 bg-canvas text-center">
                    <div>
                      <Lock size={18} className="mx-auto text-sage-400" />
                      <p className="mt-1.5 px-3 text-[10px] leading-4 text-muted">Delivery note comes after payment</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-line px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-display text-[13px] font-bold text-ink">
                  <Wallet size={14} className="text-forest-500" /> Delivery price
                </h3>
                <span className="text-[10px] text-muted">Platform fee {feePercent}%</span>
              </div>

              {delivery && agreedAmount > 0 ? (
                <div className="mt-2.5 rounded-xl border border-line bg-canvas p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                        {deliveryPaid ? 'Paid into escrow' : 'Agreed price'}
                      </p>
                      <p className="font-display text-[22px] font-extrabold tracking-tight text-forest-600 tnum">
                        {money(agreedAmount)}
                      </p>
                    </div>
                    <Badge tone={deliveryPaid ? 'verified' : 'pending'} size="sm">
                      {deliveryPaid ? 'Paid' : 'Not paid'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[10.5px] leading-4 text-muted">
                    The driver receives {money(driverReceives)} after the {feePercent}% platform fee.
                  </p>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Badge tone={delivery.buyer_confirmed_at ? 'verified' : 'neutral'} size="sm">
                      Buyer {delivery.buyer_confirmed_at ? 'confirmed' : 'waiting'}
                    </Badge>
                    <Badge tone={delivery.farmer_confirmed_at ? 'verified' : 'neutral'} size="sm">
                      Farmer {delivery.farmer_confirmed_at ? 'confirmed' : 'waiting'}
                    </Badge>
                  </div>

                  {deliveryPaid && !delivery.both_confirmed && (
                    <p className="mt-2 rounded-lg border border-harvest-200 bg-harvest-50 px-3 py-2 text-[10.5px] leading-4 text-harvest-600">
                      The driver is paid automatically once both the buyer and the farmer confirm the goods arrived.
                    </p>
                  )}
                  {deliveryPaid && delivery.both_confirmed && (
                    <p className="mt-2 rounded-lg border border-forest-200 bg-forest-50 px-3 py-2 text-[10.5px] leading-4 text-forest-700">
                      Both sides confirmed. The driver&apos;s payment has been released for bank transfer.
                    </p>
                  )}

                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {canPayDelivery && (
                      <Button size="sm" onClick={payDelivery} disabled={payingDelivery}>
                        {payingDelivery ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />}
                        {payingDelivery ? 'Opening checkout…' : `Pay delivery · ${money(agreedAmount)}`}
                      </Button>
                    )}
                    {canConfirmHandover && (
                      <Button size="sm" variant="secondary" onClick={confirmHandover} disabled={updating}>
                        <CheckCircle2 size={13} /> Confirm handover
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-2 rounded-xl border border-dashed border-sage-400 px-3.5 py-3 text-[11.5px] leading-5 text-muted">
                  No delivery price agreed yet. Drivers can see this paid order and send a price. Their offer appears
                  here and in your messages, where you can accept it or counter it.
                </p>
              )}

              {offers.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Offers in chat</p>
                  {offers.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      busy={offerBusy}
                      onAccept={acceptOffer}
                      onDecline={declineOffer}
                      onCounter={counterOffer}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <PartyCard
              title={isFarmer ? 'Buyer' : 'Farmer'}
              person={isFarmer ? order.buyer : order.farmer}
              role={isFarmer ? 'buyer' : 'farmer'}
              action={
                counterparty?.id && (
                  <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                    <Link to={`/messages?to=${counterparty.id}&name=${encodeURIComponent(counterparty.name || '')}`}>
                      <MessageSquare size={13} /> Message {counterparty.name?.split(' ')[0] || 'them'}
                    </Link>
                  </Button>
                )
              }
            />
            <div className="rounded-card border border-line bg-white p-4">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Payment details</p>
              <p className="mt-2 font-display text-[22px] font-extrabold tracking-tight text-ink tnum">{money(order.total_price)}</p>
              <dl className="mt-2 space-y-0.5">
                <KeyValue label="State">
                  <Badge tone={paid ? 'verified' : 'pending'} size="sm">{paid ? 'Funded' : 'Unfunded'}</Badge>
                </KeyValue>
                <KeyValue label="Reference" mono>{order.payment_reference || '—'}</KeyValue>
                <KeyValue label="Paid at">{order.paid_at ? fmtDateTime(order.paid_at) : '—'}</KeyValue>
              </dl>
              {isBuyer && !paid && (
                <Button asChild size="sm" className="mt-3 w-full">
                  <Link to={`/payment/${order.id}`}>
                    <CreditCard size={13} /> Pay now
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4 self-start">
          <EscrowLedger order={order} className="shadow-card" />

          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-ink">
              <ShieldCheck size={15} className="text-forest-500" /> Available actions
            </h2>
            <div className="mt-3 space-y-2">
              {canManage && next && order.status !== 'cancelled' && (
                <Button className="w-full" onClick={() => setConfirm({ type: 'status', status: next.value, label: next.label })}>
                  {next.label} <ArrowRight size={14} />
                </Button>
              )}
              {canManage && order.status === 'pending' && (
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => setConfirm({ type: 'status', status: 'rejected', label: 'Reject order' })}
                >
                  <X size={14} /> Reject order
                </Button>
              )}
              {isBuyer && canCancel && (
                <Button variant="danger" className="w-full" onClick={() => setConfirm({ type: 'cancel', label: 'Cancel order' })}>
                  <X size={14} /> Cancel order
                </Button>
              )}
              {isAdmin && !canManage && (
                <p className="rounded-lg border border-line bg-canvas px-3 py-2 text-[11px] text-muted">
                  Admin view. You can change statuses from the admin orders page.
                </p>
              )}
              {isBuyer && paid && order.status === 'delivered'
                && (!delivery || agreedAmount <= 0 || deliveryPaid) && (
                <Button variant="secondary" className="w-full" onClick={() => setConfirm({ type: 'delivery', label: 'Accept delivery & close order' })}>
                  <CheckCircle2 size={14} /> Accept delivery
                </Button>
              )}
              {isBuyer && paid && order.status === 'delivered' && delivery && agreedAmount > 0 && !deliveryPaid && (
                <p className="rounded-lg border border-harvest-200 bg-harvest-50 px-3 py-2 text-[11px] leading-5 text-harvest-600">
                  Pay the agreed delivery price in the Delivery section before you close the order.
                </p>
              )}
              {!canManage && !isBuyer && (
                <p className="rounded-lg border border-line bg-canvas px-3 py-2 text-[11px] text-muted">
                  This order is visible to platform administration. Your role has read-only access.
                </p>
              )}
              {(order.status === 'cancelled' || order.status === 'rejected') && (
                <p className="rounded-lg border border-critical-200 bg-critical-50 px-3 py-2.5 text-[11px] leading-5 text-critical-600">
                  This order is closed. The stock went back to the farmer and any money not used can be refunded.
                </p>
              )}
            </div>
          </div>

          <Callout tone="sage" icon={FileText} title="Full record">
            Every status change, payment event and tracking update is written to this order. Screenshots of this
            page are not needed for a complaint — this order record is the proof.
          </Callout>

          <div className="rounded-card border border-line bg-white p-4">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Need help?</p>
            <p className="mt-1 text-[11.5px] leading-5 text-muted">
              Our team can pause the payment and open a complaint for you.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3 w-full">
              <Link to="/admin/disputes">
                <CircleAlert size={13} /> Complaints
              </Link>
            </Button>
          </div>
        </aside>
      </div>

      <Modal
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.label || 'Confirm action'}
        description={
          confirm?.type === 'cancel'
            ? 'This returns the stock to the farmer and closes the order. If you have not paid, no refund is needed.'
            : confirm?.type === 'delivery'
              ? 'This closes the order and releases the final payment to the farmer. The driver is paid only after the farmer also confirms the handover.'
              : confirm?.status === 'rejected'
                ? 'Rejecting returns the stock to the farmer and closes the order.'
                : 'The change is saved on the order and the other person is told by email.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)} disabled={updating}>Keep as is</Button>
            <Button
              variant={confirm?.type === 'cancel' || confirm?.status === 'rejected' ? 'danger' : 'primary'}
              onClick={() => (confirm.type === 'cancel' ? cancelOrder() : confirm.type === 'delivery' ? confirmDelivery() : setStatus(confirm.status))}
              disabled={updating}
            >
              {updating ? 'Updating…' : confirm?.label}
            </Button>
          </>
        }
      >
        <dl className="space-y-1 rounded-xl border border-line bg-canvas px-4 py-3">
          <KeyValue label="Order" mono>#{order.id}</KeyValue>
          <KeyValue label="Current status">{order.status}</KeyValue>
          <KeyValue label="Requested change">{confirm?.type === 'delivery' ? 'Delivery confirmed' : (confirm?.status || 'cancelled')}</KeyValue>
          <KeyValue label="Escrow value" mono>{money(order.total_price)}</KeyValue>
        </dl>
      </Modal>
    </div>
  )
}
