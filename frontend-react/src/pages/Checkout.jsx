import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, CreditCard, Landmark, Lock, MapPin,
  Minus, Package, Plus, ShieldCheck, ShoppingCart, Sprout, Trash2, Truck, Warehouse,
} from 'lucide-react'
import { PageHeader, EmptyState } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Field, Input, Textarea } from '../components/ui/Form'
import { EscrowLedger, MilestoneSchedule } from '../components/finance/Escrow'
import { useCart } from '../store/cart'
import { useAuth } from '../store/auth'
import { orderService } from '../lib/services'
import { money, qtyUnit } from '../lib/format'
import { parseError } from '../lib/utils'

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

export default function Checkout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const cart = useCart()
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 3)
    return isoDate(date)
  })
  const [notes, setNotes] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    cart.fetch().catch((err) => setError(parseError(err)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const subtotal = cart.items.reduce(
    (sum, item) => sum + Number(item.unit_price ?? 0) * Number(item.quantity ?? 0),
    0,
  )
  const total = subtotal + Number(cart.deliveryFee || 0)
  const minDate = isoDate(new Date())
  const reviewOrder = { total_price: total, status: 'pending', payment_status: 'pending' }

  async function changeQuantity(item, next) {
    const value = Math.max(0, Math.min(Number(next), Number(item.available_quantity || next)))
    setBusyId(item.produce_id)
    try {
      await cart.update(item.produce_id, value)
      if (value === 0) toast.success(`${item.commodity_name} removed`)
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setBusyId(null)
    }
  }

  async function removeItem(item) {
    setBusyId(item.produce_id)
    try {
      await cart.remove(item.produce_id)
      toast.success(`${item.commodity_name} removed from the basket`)
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setBusyId(null)
    }
  }

  async function placeOrder(event) {
    event.preventDefault()
    if (cart.items.length === 0) return
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        items: cart.items.map((item) => ({
          produce_id: item.produce_id,
          quantity: Number(item.quantity),
        })),
        delivery_date: deliveryDate ? new Date(`${deliveryDate}T09:00:00`).toISOString() : undefined,
        notes: notes.trim() || undefined,
      }
      const res = await orderService.create(payload)
      const created = res.data?.orders || [res.data?.order].filter(Boolean)
      await cart.clear().catch(() => cart.clearLocal())
      toast.success(
        created.length > 1
          ? `${created.length} orders created — one for each farmer`
          : 'Order created. Fund escrow to dispatch.',
      )
      if (created.length > 1) navigate('/orders')
      else navigate(`/payment/${created[0]?.id}`)
    } catch (err) {
      setError(parseError(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (cart.items.length === 0 && !cart.loading) {
    return (
      <div className="page-wrap page-pad">
        <PageHeader eyebrow="Checkout" title="Your basket" />
        <EmptyState
          icon={ShoppingCart}
          title="Your basket is empty"
          description="Add produce from the marketplace, then come back here to place your order."
          action={
            <Button asChild>
              <Link to="/commodities">
                Browse the exchange <ArrowRight size={15} />
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="Checkout"
        title="Check your order"
        description="No money is taken yet. Check the items, delivery date and payment steps before you place the order."
        actions={
          <Button asChild variant="ghost" size="md">
            <Link to="/commodities">
              <ArrowLeft size={15} /> Continue shopping
            </Link>
          </Button>
        }
      />

      <form onSubmit={placeOrder} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
                <Package size={16} className="text-forest-500" /> Basket lines
                <span className="rounded-full bg-forest-50 px-2 py-0.5 text-[10.5px] font-bold text-forest-600">
                  {cart.items.length}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => cart.clear().catch(() => {})}
                className="text-[11px] font-semibold text-muted transition hover:text-critical-600"
              >
                Empty basket
              </button>
            </div>

            <ul className="divide-y divide-line">
              {cart.items.map((item) => (
                <li key={item.produce_id} className="flex gap-3 px-4 py-4 sm:px-5">
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-sage-100 text-forest-400">
                    <Sprout size={24} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={`/commodities/${item.produce_id}`}
                          className="block break-words text-[13.5px] font-bold text-ink hover:text-forest-600"
                        >
                          {item.commodity_name}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {item.farmer_name || 'Farmer'} · {money(item.unit_price)} / {item.unit}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item)}
                        disabled={busyId === item.produce_id}
                        aria-label={`Remove ${item.commodity_name}`}
                        className="grid h-7 w-7 place-items-center rounded-md text-muted transition hover:bg-critical-50 hover:text-critical-600 disabled:opacity-40"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex h-9 items-stretch overflow-hidden rounded-btn border border-line">
                        <button
                          type="button"
                          onClick={() => changeQuantity(item, Number(item.quantity) - 1)}
                          disabled={busyId === item.produce_id}
                          aria-label="Decrease quantity"
                          className="grid w-8 place-items-center text-muted transition hover:bg-sage-100 disabled:opacity-40"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="grid min-w-14 place-items-center border-x border-line px-2 text-[12px] font-semibold text-ink tnum">
                          {qtyUnit(item.quantity, item.unit)}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(item, Number(item.quantity) + 1)}
                          disabled={busyId === item.produce_id || Number(item.quantity) >= Number(item.available_quantity)}
                          aria-label="Increase quantity"
                          className="grid w-8 place-items-center text-muted transition hover:bg-sage-100 disabled:opacity-40"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-[13.5px] font-bold text-ink tnum">
                          {money(Number(item.unit_price) * Number(item.quantity))}
                        </p>
                        <p className="text-[10px] text-muted tnum">
                          {Number(item.available_quantity).toLocaleString('en-NG')} {item.unit} available
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
              <Truck size={16} className="text-forest-500" /> Delivery & settlement instructions
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Delivery date" htmlFor="delivery-date" hint="We confirm with the transporter" required>
                <div className="relative">
                  <CalendarDays size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                  <Input
                    id="delivery-date"
                    type="date"
                    required
                    min={minDate}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </Field>

              <div className="rounded-xl border border-line bg-canvas p-3.5">
                <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
                  <MapPin size={12} /> Delivery point
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-ink">
                  {user?.address || 'Add a delivery address in your profile'}
                </p>
                <p className="text-[11px] text-muted">
                  {[user?.lga, user?.state].filter(Boolean).join(', ') || 'Destination LGA not set'}
                </p>
                <Link to="/profile" className="mt-1.5 inline-block text-[10.5px] font-semibold text-forest-600 hover:underline">
                  Edit delivery address
                </Link>
              </div>

              <Field
                label="Notes for the farmer or transporter"
                htmlFor="order-notes"
                hint="Optional"
                className="sm:col-span-2"
              >
                <Textarea
                  id="order-notes"
                  rows={3}
                  maxLength={1000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How you want the goods packed, gate directions, best pickup time…"
                />
              </Field>
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-forest-100 bg-forest-50 p-3.5">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-forest-600" />
              <p className="text-[11.5px] leading-5 text-forest-700/85">
                Creating the order reserves the lot and holds your commitment. Stock is deducted at order creation;
                escrow is funded on the next screen. If you cancel before pickup, the farmer gets the stock back.
              </p>
            </div>
          </div>

          <MilestoneSchedule order={reviewOrder} />
        </div>

        <aside className="space-y-4 self-start lg:sticky lg:top-24">
          <EscrowLedger
            order={{ subtotal, delivery_fee: cart.deliveryFee, total_price: total }}
            className="shadow-card"
          />

          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-ink">
              <Landmark size={15} className="text-forest-500" /> How your money is handled
            </h2>
            <ul className="mt-3 space-y-2.5 text-[11.5px] text-muted">
              {[
                'Money held in escrow until each step is checked',
                'Farmer told only after you pay',
                'Paid out as weight and quality are checked',
                'Disagreements put the money on hold for review',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-forest-50">
                    <Check size={9} strokeWidth={4} className="text-forest-600" />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <p className="rounded-lg border border-critical-200 bg-critical-50 px-3.5 py-2.5 text-[12px] font-medium text-critical-600">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={submitting || cart.items.length === 0}>
            <Lock size={15} />
            {submitting ? 'Creating order…' : `Create order · ${money(total)}`}
          </Button>
          <p className="text-center text-[10.5px] leading-4 text-muted">
            By creating the order you accept the platform trade rules and the milestone release schedule above.
          </p>

          <div className="flex items-center justify-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
            <CreditCard size={15} className="text-forest-500" />
            <span className="text-[10.5px] text-muted">Paystack</span>
            <span className="h-3 w-px bg-line" />
            <Warehouse size={15} className="text-forest-500" />
            <span className="text-[10.5px] text-muted">Final payment</span>
          </div>
        </aside>
      </form>
    </div>
  )
}
