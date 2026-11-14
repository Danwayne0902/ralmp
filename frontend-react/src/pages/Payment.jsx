import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, ArrowRight, BadgeCheck, Check, ChevronRight, Clock3, Landmark,
  Loader2, Lock, Receipt, ShieldCheck, Truck, Wallet,
} from 'lucide-react'
import { PageHeader, EmptyState, Loading } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { KeyValue } from '../components/ui/Card'
import { EscrowLedger, MilestoneSchedule } from '../components/finance/Escrow'
import { orderService, paymentService } from '../lib/services'
import { fmtDateTime, money } from '../lib/format'
import { loadPaystackScript, openPaystackPayment } from '../lib/paystack'
import { parseError } from '../lib/utils'
import { useAuth } from '../store/auth'

export default function Payment() {
  const { orderId } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [fallbackUrl, setFallbackUrl] = useState('')
  const attemptedRef = useRef(false)

  const paid = order?.payment_status === 'paid' || Boolean(receipt)

  useEffect(() => {
    let active = true
    setLoading(true)
    orderService
      .get(orderId)
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
  }, [orderId])

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref')
    if (!reference || !order || order.payment_status === 'paid' || attemptedRef.current) return
    attemptedRef.current = true
    verify(reference)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, searchParams])

  async function verify(reference) {
    setVerifying(true)
    try {
      const res = await paymentService.verify(reference)
      setReceipt(res.data?.payment || { reference })
      setOrder((prev) => ({ ...prev, ...res.data?.order, payment_status: 'paid' }))
      toast.success('Escrow funded. The grower and carrier have been notified.')
    } catch (err) {
      toast.error(parseError(err))
      setError(parseError(err))
    } finally {
      setVerifying(false)
    }
  }

  async function payNow() {
    setError('')
    setFallbackUrl('')
    setPaying(true)
    try {
      const res = await paymentService.initialize({
        order_id: Number(orderId),
        callback_url: `${window.location.origin}/payment/${orderId}`,
        email: user?.email,
      })

      const init = res.data
      await loadPaystackScript()

      const result = await openPaystackPayment({
        email: user?.email,
        amount: Number(order?.total_price || 0),
        reference: init.reference,
        metadata: { order_id: Number(orderId), user_id: user?.id },
      })

      await verify(result?.reference || init.reference)
    } catch (err) {
      if (err?.message === 'Payment cancelled') {
        toast.info('Payment window closed. Your order is still reserved.')
      } else {
        setError(parseError(err))
        toast.error(parseError(err))
      }
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="page-wrap page-pad">
        <Loading label="Loading escrow instruction" />
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="page-wrap page-pad">
        <EmptyState
          icon={Lock}
          title="Order not available"
          description={error}
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

  if (!order) return null

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="Escrow funding"
        title={paid ? 'Escrow funded' : 'Fund the escrow commitment'}
        description={
          paid
            ? 'Your capital is held in custodial trust and will release against the milestone schedule below.'
            : 'The order is reserved. Funds move into a CBN-regulated custodial vault — not to the grower or carrier.'
        }
        actions={
          <Button asChild variant="ghost" size="md">
            <Link to={`/orders/${order.id}`}>
              Order detail <ChevronRight size={14} />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-5">
          <div className="overflow-hidden rounded-card border border-line bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-forest-50 text-forest-600">
                  <Receipt size={16} />
                </span>
                <div>
                  <h2 className="font-display text-[14.5px] font-bold text-ink">Order #{order.id}</h2>
                  <p className="text-[11px] text-muted">Placed {fmtDateTime(order.created_at)}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={order.status} />
                <Badge tone={paid ? 'verified' : 'pending'} size="sm">
                  {paid ? <BadgeCheck size={11} /> : <Clock3 size={11} />}
                  {paid ? 'Paid' : 'Awaiting escrow'}
                </Badge>
              </div>
            </div>

            <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{paid ? 'Escrow commitment' : 'Amount to fund'}</p>
                <p className="mt-1 font-display text-[34px] font-extrabold leading-10 tracking-tight text-forest-600 tnum">
                  {money(order.total_price)}
                </p>
                <p className="mt-1 text-[11.5px] text-muted">
                  {paid ? 'Received in full' : 'One payment · milestone release'}
                </p>
              </div>
              <dl className="space-y-1">
                <KeyValue label="Produce subtotal" mono>{money(order.subtotal)}</KeyValue>
                <KeyValue label="Haulage & freight" mono>{money(order.delivery_fee)}</KeyValue>
                <KeyValue label="Custody fee" mono>Waived</KeyValue>
              </dl>
            </div>

            <div className="border-t border-line px-5 py-3.5 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
                <p className="flex items-center gap-1.5 text-muted">
                  <Truck size={13} className="text-forest-500" />
                  {order.farmer?.name || 'Registered grower'}
                  <span className="text-sage-400">→</span>
                  {order.buyer?.name || user?.name || 'Your delivery point'}
                </p>
                <p className="font-mono text-[10.5px] text-muted">
                  REF {order.payment_reference || 'Pending gateway reference'}
                </p>
              </div>
            </div>
          </div>

          <MilestoneSchedule order={order} />

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Landmark, title: 'Custodial vault', body: 'Providus Bank trust arrangement under CBN circular FSR/DIR/GEN/07/041.' },
              { icon: ShieldCheck, title: 'Dual authorisation', body: 'No single party can release escrow. Evidence events drive every tranche.' },
              { icon: Wallet, title: 'Refund path', body: 'Undelivered or rejected lots restore stock and return unsettled capital.' },
            ].map((item) => (
              <div key={item.title} className="rounded-card border border-line bg-white p-4">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-forest-50 text-forest-600">
                  <item.icon size={15} />
                </span>
                <p className="mt-2.5 text-[12.5px] font-bold text-ink">{item.title}</p>
                <p className="mt-1 text-[11px] leading-5 text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4 self-start lg:sticky lg:top-24">
          {paid ? (
            <div className="rounded-card border border-forest-200 bg-white p-6 text-center shadow-card">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-forest-50 text-forest-600">
                <Check size={26} strokeWidth={2.6} />
              </span>
              <h2 className="mt-4 font-display text-[19px] font-extrabold tracking-[-0.01em] text-ink">
                Funds secured in escrow
              </h2>
              <p className="mt-1.5 text-[12px] leading-5 text-muted">
                The grower has been notified and a carrier will be matched against the origin. The first tranche
                releases after the origin weighbridge slip.
              </p>
              <dl className="mt-4 space-y-1 rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-left">
                <KeyValue label="Reference" mono>{receipt?.reference || order.payment_reference || '—'}</KeyValue>
                <KeyValue label="Paid">{fmtDateTime(receipt?.paid_at || order.paid_at)}</KeyValue>
              </dl>
              <Button asChild size="lg" className="mt-4 w-full">
                <Link to={`/orders/${order.id}`}>
                  Track the order <ArrowRight size={15} />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="md" className="mt-1 w-full">
                <Link to="/settlements">Open settlement ledger</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-card border border-line bg-white shadow-card">
                <div className="border-b border-line px-5 py-4">
                  <h2 className="flex items-center gap-2 font-display text-[14.5px] font-bold text-ink">
                    <Lock size={15} className="text-forest-500" /> Fund with Paystack
                  </h2>
                  <p className="mt-0.5 text-[11px] text-muted">Card, transfer or USSD · NGN settlement</p>
                </div>
                <div className="space-y-4 p-5">
                  <div className="rounded-xl border border-line bg-canvas px-4 py-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Payable now</p>
                    <p className="mt-0.5 font-display text-[26px] font-extrabold tracking-tight text-ink tnum">
                      {money(order.total_price)}
                    </p>
                    <p className="mt-1 text-[10.5px] text-muted">Full pre-funding is required before dispatch.</p>
                  </div>

                  {error && (
                    <p className="rounded-lg border border-critical-200 bg-critical-50 px-3 py-2 text-[11.5px] font-medium text-critical-600">
                      {error}
                    </p>
                  )}

                  <Button size="lg" className="w-full" onClick={payNow} disabled={paying || verifying}>
                    {paying || verifying ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
                    {verifying ? 'Verifying payment…' : paying ? 'Opening secure checkout…' : `Fund escrow · ${money(order.total_price)}`}
                  </Button>

                  {fallbackUrl && (
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <a href={fallbackUrl}>Continue on Paystack</a>
                    </Button>
                  )}

                  <Button asChild variant="ghost" size="sm" className="w-full">
                    <Link to={`/orders/${order.id}`}>Pay later — keep the reservation</Link>
                  </Button>

                  <p className="text-center text-[10px] leading-4 text-muted">
                    You will be redirected to Paystack&apos;s secure window. RALMP never stores card details.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-harvest-200 bg-harvest-50 p-4">
                <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-harvest-600">
                  <Clock3 size={13} /> Reservation window
                </p>
                <p className="mt-1 text-[11px] leading-5 text-harvest-600/85">
                  The grower&apos;s stock is already deducted for this order. Fund promptly — unfunded orders can be
                  cancelled by the grower or the trade desk.
                </p>
              </div>
            </>
          )}

          <EscrowLedger
            order={order}
            showTitle
            className="shadow-card"
          />
        </aside>
      </div>
    </div>
  )
}
