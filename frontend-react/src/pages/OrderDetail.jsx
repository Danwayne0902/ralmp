import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowLeft, ArrowRight, BadgeCheck, Building2, Check, CheckCircle2,
  CircleAlert, ClipboardList, Clock3, CreditCard, FileText, Lock, MapPin,
  MessageSquare, Package, Phone, Printer, ShieldCheck, Sprout, Truck,
  X,
} from 'lucide-react'
import { PageHeader, EmptyState, Loading, Table, Th, Td, Tr } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { KeyValue, Callout } from '../components/ui/Card'
import { Modal } from '../components/ui/Overlay'
import { EscrowLedger, MilestoneSchedule, SettlementTimeline } from '../components/finance/Escrow'
import { orderService } from '../lib/services'
import { fmtDate, fmtDateTime, money, qtyUnit } from '../lib/format'
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

export default function OrderDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const isBuyer = order && user?.id === order.buyer_id
  const isFarmer = order && user?.id === order.farmer_id
  const isAdmin = user?.role === 'admin'
  const canManage = isFarmer || isAdmin
  const canCancel = isBuyer && ['pending', 'confirmed'].includes(order?.status)

  async function load() {
    const res = await orderService.get(id)
    const data = res.data?.order || res.data
    setOrder(data)
    return data
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    orderService
      .get(id)
      .then((res) => {
        if (active) setOrder(res.data?.order || res.data)
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
                  <Td colSpan={3} className="text-right text-[11.5px] text-muted">Delivery</Td>
                  <Td className="text-right tnum">{money(order.delivery_fee)}</Td>
                </Tr>
                <Tr className="hover:bg-transparent">
                  <Td colSpan={3} className="text-right text-[12px] font-bold text-ink">Total paid</Td>
                  <Td className="text-right font-display text-[16px] font-extrabold text-forest-600 tnum">
                    {money(order.total_price)}
                  </Td>
                </Tr>
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
              {order.delivery?.status ? (
                <Badge tone="transit" size="sm">{order.delivery.status}</Badge>
              ) : (
                <Badge tone="neutral" size="sm">Waiting for a transporter</Badge>
              )}
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <dl className="space-y-0.5">
                  <KeyValue label="Delivery note number" mono>{waybill || 'Not issued yet'}</KeyValue>
                  <KeyValue label="Transporter">{order.delivery?.logistics_provider?.name || 'Finding a transporter'}</KeyValue>
                  <KeyValue label="Vehicle and plate">{order.delivery?.vehicle_number || 'Not assigned'}</KeyValue>
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
              {isBuyer && paid && order.status === 'delivered' && (
                <Button variant="secondary" className="w-full" onClick={() => setConfirm({ type: 'status', status: 'completed', label: 'Accept delivery & close order' })}>
                  <CheckCircle2 size={14} /> Accept delivery
                </Button>
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
            : confirm?.status === 'rejected'
              ? 'Rejecting returns the stock to the farmer and closes the order.'
              : 'The change is saved on the order and the other person is told by email.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)} disabled={updating}>Keep as is</Button>
            <Button
              variant={confirm?.type === 'cancel' || confirm?.status === 'rejected' ? 'danger' : 'primary'}
              onClick={() => (confirm.type === 'cancel' ? cancelOrder() : setStatus(confirm.status))}
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
          <KeyValue label="Requested change">{confirm?.status || 'cancelled'}</KeyValue>
          <KeyValue label="Escrow value" mono>{money(order.total_price)}</KeyValue>
        </dl>
      </Modal>
    </div>
  )
}
