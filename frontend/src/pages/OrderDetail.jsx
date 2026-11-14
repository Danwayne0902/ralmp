import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, MapPin, Package, Phone, Truck, Wallet, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { orderService } from '../lib/services'
import { useAuth } from '../store/auth'
import { fmtDate, money, relativeDate } from '../lib/format'
import PageHeader from '../components/PageHeader'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  StatusBadge,
  Timeline
} from '../components/ui'

const EASE = [0.22, 1, 0.36, 1]

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const reduce = useReducedMotion()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await orderService.get(id)
      setOrder(res.data.order || res.data)
    } catch {
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function cancelOrder() {
    if (!window.confirm('Are you sure you want to cancel this order?')) return
    setCancelling(true)
    try {
      await orderService.cancel(id)
      toast.success('Order cancelled')
      await load()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not cancel order')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 skeleton" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-6"><div className="skeleton h-4 w-32" /><div className="mt-4 space-y-2.5"><div className="skeleton h-3.5 w-48" /><div className="skeleton h-3.5 w-40" /><div className="skeleton h-3.5 w-28" /></div></div>
          <div className="card p-6"><div className="skeleton h-4 w-32" /><div className="mt-4 space-y-2.5"><div className="skeleton h-3.5 w-40" /><div className="skeleton h-3.5 w-36" /><div className="skeleton h-3.5 w-24" /></div></div>
        </div>
        <div className="card p-6"><div className="skeleton h-4 w-28" /><div className="mt-4 space-y-3"><div className="skeleton h-14 w-full" /><div className="skeleton h-14 w-full" /></div></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <div className="mx-auto w-full max-w-lg">
          <EmptyState
            icon={Package}
            title="Order not found"
            description="It may have been removed or belongs to another account."
            action={<Button to="/orders">View my orders</Button>}
          />
        </div>
      </div>
    )
  }

  const subtotal = order.subtotal ?? (order.items || []).reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const steps = [
    { label: 'Order confirmed', done: true, note: relativeDate(order.created_at) },
    {
      label: 'Items picked up',
      done: ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status),
      note: order.confirmed_at ? relativeDate(order.confirmed_at) : 'Awaiting farmer confirmation'
    },
    {
      label: 'In transit',
      done: ['shipped', 'delivered'].includes(order.status),
      note: order.shipped_at ? `Shipped ${relativeDate(order.shipped_at)}` : 'Expected soon'
    },
    {
      label: 'Delivered',
      done: order.status === 'delivered',
      note: order.delivered_at ? relativeDate(order.delivered_at) : 'Pending'
    }
  ]
  if (order.status === 'cancelled') steps.push({ label: 'Order cancelled', done: true, note: relativeDate(order.updated_at) })

  let currentSeen = false
  const timelineItems = steps.map((s) => {
    let state = 'todo'
    if (s.done) state = 'done'
    else if (!currentSeen) { state = 'current'; currentSeen = true }
    return { key: s.label, title: s.label, time: s.note, state }
  })

  const address = order.delivery_address || {}

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" leftIcon={ArrowLeft} onClick={() => navigate(-1)} className="-ml-2">
          Back to orders
        </Button>
      </div>

      <PageHeader
        eyebrow="Order"
        title={`Order #${order.id}`}
        subtitle={`Placed ${fmtDate(order.created_at, { month: 'long' })}`}
        actions={
          <>
            <StatusBadge status={order.status} />
            {order.status === 'pending' && (
              <Button variant="danger-soft" size="sm" leftIcon={XCircle} loading={cancelling} onClick={cancelOrder}>
                {cancelling ? 'Cancelling…' : 'Cancel order'}
              </Button>
            )}
          </>
        }
      />

      <motion.div
        className="grid gap-4 md:grid-cols-2"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <Card>
          <CardHeader icon={MapPin} title="Delivery address" />
          <CardBody className="space-y-1 text-sm">
            <p className="font-semibold text-ink">{address.name || user?.name}</p>
            <p className="text-sand-600">{address.street || user?.address || '—'}</p>
            <p className="text-sand-600">
              {address.city || user?.lga}{address.city || user?.lga ? ',' : ''} {address.state || user?.state}
            </p>
            <p className="inline-flex items-center gap-1.5 text-sand-600">
              <Phone size={13} className="text-sand-400" /> {address.phone || user?.phone || '—'}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={Wallet} title="Payment summary" />
          <CardBody>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between border-b border-[color:var(--hairline)] pb-2.5">
                <span className="text-sand-500">Subtotal</span>
                <span className="font-semibold text-ink tnum">₦{money(subtotal)}</span>
              </div>
              <div className="flex justify-between border-b border-[color:var(--hairline)] pb-2.5">
                <span className="text-sand-500">Delivery fee</span>
                <span className="font-semibold text-ink tnum">₦{money(order.delivery_fee || 0)}</span>
              </div>
              <div className="flex items-center justify-between pt-0.5">
                <span className="font-bold text-ink">Total</span>
                <span className="font-display text-lg font-extrabold text-brand-700 tnum">
                  ₦{money(order.total_price ?? order.total_amount)}
                </span>
              </div>
            </div>
            {order.payment_status !== 'paid' && order.status !== 'cancelled' && (
              <Button variant="accent" to={`/payment/${order.id}`} className="mt-4 w-full">
                Pay now
              </Button>
            )}
          </CardBody>
        </Card>
      </motion.div>

      <Card>
        <CardHeader icon={Package} title="Order items" subtitle={`${(order.items || []).length} item${(order.items || []).length === 1 ? '' : 's'}`} />
        <CardBody className="space-y-2.5">
          {(order.items || []).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--hairline)] bg-sand-50/70 p-3.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {item.emoji || '🌾'} {item.produce?.commodity_name || item.commodity_name}
                </p>
                <p className="mt-0.5 text-xs text-sand-500">
                  {money(item.quantity)} {item.produce?.unit || item.unit} · From {item.farmer_name || order.farmer?.name || 'Farmer'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-brand-700 tnum">₦{money(item.subtotal || item.quantity * item.unit_price)}</p>
                <p className="text-2xs text-sand-400 tnum">₦{money(item.unit_price)} each</p>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={Truck} title="Delivery progress" />
        <CardBody>
          <Timeline items={timelineItems} />
        </CardBody>
      </Card>
    </div>
  )
}
