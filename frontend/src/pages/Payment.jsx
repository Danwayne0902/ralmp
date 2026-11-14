import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, Package, ShieldCheck, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { orderService, paymentService } from '../lib/services'
import { useAuth } from '../store/auth'
import { loadPaystackScript, openPaystackPayment } from '../lib/paystack'
import { money } from '../lib/format'
import PageHeader from '../components/PageHeader'
import { Button, EmptyState, InfoRow, Spinner } from '../components/ui'

export default function Payment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    orderService
      .get(id)
      .then((res) => setOrder(res.data.order || res.data))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false))
  }, [id])

  async function pay() {
    setProcessing(true)
    try {
      await loadPaystackScript()
      const init = await paymentService.initialize({
        order_id: order.id,
        email: user?.email,
        callback_url: window.location.href
      })
      const result = await openPaystackPayment({
        email: user?.email,
        amount: order.total_price ?? order.total_amount,
        reference: init.data.reference,
        metadata: { order_id: order.id }
      })
      await paymentService.verify(result.reference)
      toast.success('Payment successful')
      navigate(`/orders/${order.id}`)
    } catch (e) {
      if (e.message !== 'Payment cancelled') {
        toast.error(e.response?.data?.message || e.message || 'Payment failed')
      }
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <Spinner label="Loading payment…" />

  if (!order) {
    return (
      <div className="mx-auto w-full max-w-lg">
        <EmptyState
          icon={Package}
          title="Order not found"
          description="We couldn't load this order for payment."
          action={<Button onClick={() => navigate('/orders')}>Back to orders</Button>}
        />
      </div>
    )
  }

  const total = order.total_price ?? order.total_amount
  const paid = order.payment_status === 'paid'

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" leftIcon={ArrowLeft} onClick={() => navigate(-1)} className="-ml-2">
          Back
        </Button>
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <PageHeader
          eyebrow="Secure checkout"
          title={`Pay for order #${order.id}`}
          subtitle="Paystack · Cards, bank transfer and USSD"
        />

        <div className="panel overflow-hidden">
          <div className="surface-dark p-6 sm:p-8">
            <div className="grid-lines pointer-events-none absolute inset-0 opacity-40" aria-hidden />
            <div className="relative text-center">
              <p className="text-2xs font-bold uppercase tracking-[.22em] text-lime-300">Amount due</p>
              <p className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white tnum sm:text-5xl">
                ₦{money(total)}
              </p>
              <p className="mt-2 text-sm text-white/60">Order #{order.id}</p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="divide-y divide-[color:var(--hairline)]">
              <InfoRow label="Items" icon={Package} value={(order.items || []).length} />
              <InfoRow label="Buyer" value={user?.name} />
              <InfoRow label="Email" value={<span className="block max-w-[16rem] truncate text-right">{user?.email}</span>} />
            </div>

            <Button
              variant="accent"
              size="lg"
              leftIcon={Wallet}
              onClick={pay}
              loading={processing}
              disabled={paid}
              className="mt-6 w-full"
            >
              {paid ? 'Already paid' : processing ? 'Processing…' : `Pay ₦${money(total)}`}
            </Button>

            <div className="mt-5 flex items-center justify-center gap-5 text-xs text-sand-400">
              <span className="inline-flex items-center gap-1.5"><Lock size={13} /> Encrypted</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> Escrow protected</span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs leading-relaxed text-sand-400">
          Your payment is held securely until delivery is confirmed. Use the Paystack test key configured for this environment.
        </p>
      </div>
    </div>
  )
}
