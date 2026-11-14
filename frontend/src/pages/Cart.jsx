import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { useCart } from '../store/cart'
import { orderService } from '../lib/services'
import { money } from '../lib/format'
import PageHeader from '../components/PageHeader'
import { Badge, Button, EmptyState, Field, Input, Skeleton } from '../components/ui'

const EASE = [0.22, 1, 0.36, 1]

function defaultDeliveryDate() {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  return d.toISOString().slice(0, 10)
}

export default function Cart() {
  const navigate = useNavigate()
  const { items, total, deliveryFee, loading, fetch, update, remove, clear } = useCart()
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate())
  const [checkingOut, setCheckingOut] = useState(false)

  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const count = items.reduce((s, i) => s + Number(i.quantity || 0), 0)

  useEffect(() => { fetch().catch(() => {}) }, [fetch])

  async function updateQty(produceId, quantity) {
    if (quantity < 1) return
    try {
      await update(produceId, quantity)
    } catch {
      toast.error('Could not update quantity')
    }
  }

  async function removeItem(produceId) {
    try {
      await remove(produceId)
      toast.success('Item removed from cart')
    } catch {
      toast.error('Could not remove item')
    }
  }

  async function clearCart() {
    if (!window.confirm('Clear your cart?')) return
    try {
      await clear()
      toast.success('Cart cleared')
    } catch {
      toast.error('Could not clear cart')
    }
  }

  async function checkout() {
    setCheckingOut(true)
    try {
      const res = await orderService.create({
        items: items.map((i) => ({ produce_id: i.produce_id, quantity: i.quantity })),
        delivery_date: deliveryDate
      })
      const n = res.data.orders?.length || 1
      toast.success(n > 1 ? `${n} orders placed successfully` : 'Order placed successfully')
      await clear()
      navigate('/orders')
    } catch (e) {
      const first = e.response?.data?.errors ? Object.values(e.response.data.errors)[0]?.[0] : null
      toast.error(first || e.response?.data?.message || 'Failed to place order')
    } finally {
      setCheckingOut(false)
    }
  }

  const busy = loading && items.length === 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Checkout"
        title="Shopping cart"
        subtitle={count > 0 ? `${count} item${count === 1 ? '' : 's'} ready for delivery` : 'Review your items before checkout'}
        actions={
          <Button to="/commodities" variant="ghost">
            Continue shopping
          </Button>
        }
      />

      {busy ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="card space-y-3 card-pad">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Browse the marketplace and add fresh produce to get started."
          action={
            <Button to="/commodities" leftIcon={ShoppingBag}>
              Browse commodities
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="card card-pad"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-ink">Cart items</h2>
              <Badge tone="brand">{count} total</Badge>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.produce_id}
                  className="flex flex-col gap-4 rounded-xl border border-[color:var(--hairline)] bg-sand-50/70 p-4 sm:flex-row sm:items-center"
                >
                  <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-[color:var(--hairline)] bg-white text-3xl">
                    {item.image ? (
                      <img src={item.image} alt={item.commodity_name} className="h-full w-full object-cover" />
                    ) : (
                      <span aria-hidden>{item.emoji || '🌾'}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link to={`/commodities/${item.produce_id}`} className="text-sm font-bold text-ink transition hover:text-brand-700">
                      {item.commodity_name}
                    </Link>
                    <p className="mt-0.5 font-mono text-xs tnum text-sand-500">₦{money(item.unit_price)} per {item.unit}</p>

                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex items-center overflow-hidden rounded-lg border border-[color:var(--hairline-strong)] bg-white">
                        <button
                          onClick={() => updateQty(item.produce_id, Number(item.quantity) - 1)}
                          className="grid h-8 w-8 place-items-center text-sand-600 transition hover:bg-sand-100"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQty(item.produce_id, Number(e.target.value))}
                          aria-label={`Quantity for ${item.commodity_name}`}
                          className="w-14 border-x border-[color:var(--hairline-strong)] py-1.5 text-center font-mono text-xs font-bold tnum outline-none"
                        />
                        <button
                          onClick={() => updateQty(item.produce_id, Number(item.quantity) + 1)}
                          className="grid h-8 w-8 place-items-center text-sand-600 transition hover:bg-sand-100"
                          aria-label="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <span className="text-2xs text-sand-400">{item.unit}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <p className="font-mono text-lg font-bold tnum text-brand-700">₦{money(item.subtotal)}</p>
                    <button
                      onClick={() => removeItem(item.produce_id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 transition hover:underline"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="danger-soft" onClick={clearCart} leftIcon={Trash2} className="mt-4 w-full justify-center">
              Clear cart
            </Button>
          </motion.div>

          <aside>
            <div className="card sticky top-24 card-pad">
              <h2 className="font-display text-base font-bold text-ink">Order summary</h2>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sand-500">Subtotal</span>
                  <span className="font-mono font-semibold tnum text-ink">₦{money(total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sand-500"><Truck size={13} /> Delivery fee</span>
                  <span className="font-mono font-semibold tnum text-ink">₦{money(deliveryFee)}</span>
                </div>
                <div className="divider" />
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-ink">Total</span>
                  <span className="font-mono text-xl font-extrabold tnum text-brand-700">₦{money(total + deliveryFee)}</span>
                </div>
              </div>

              <Field label="Preferred delivery date" htmlFor="delivery_date" className="mt-5">
                <Input
                  id="delivery_date"
                  type="date"
                  min={minDate}
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </Field>

              <Button
                onClick={checkout}
                disabled={checkingOut || items.length === 0}
                loading={checkingOut}
                size="lg"
                rightIcon={ArrowRight}
                className="mt-4 w-full justify-center"
              >
                Proceed to checkout
              </Button>

              <p className="mt-3 text-center text-2xs leading-relaxed text-sand-400">
                Payment is completed securely after your order is placed.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
