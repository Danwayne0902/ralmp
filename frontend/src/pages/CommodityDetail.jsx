import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, BadgeCheck, CalendarDays, MapPin, Minus, Package,
  Plus, Search, ShoppingCart, Sprout, Truck
} from 'lucide-react'
import { toast } from 'sonner'
import { produceService } from '../lib/services'
import { useAuth } from '../store/auth'
import { useCart } from '../store/cart'
import { fmtDate, imgUrl, money } from '../lib/format'
import { Badge, Button, EmptyState, PageLoader } from '../components/ui'

const EASE = [0.22, 1, 0.36, 1]

export default function CommodityDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isLoggedIn, user } = useAuth()
  const { add } = useCart()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imgIdx, setImgIdx] = useState(0)
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    setLoading(true)
    produceService
      .get(id)
      .then((res) => setItem(res.data))
      .catch(() => setItem(null))
      .finally(() => setLoading(false))
  }, [id])

  const max = Number(item?.quantity || 0)

  async function addToCart() {
    if (!isLoggedIn) {
      navigate(`/login?redirect=/commodities/${id}`)
      return
    }
    if (user?.role === 'farmer' || user?.role === 'admin') {
      toast.error('Only buyer accounts can add items to a cart.')
      return
    }
    setAdding(true)
    try {
      await add(Number(id), qty)
      toast.success(`${qty} ${item.unit} added to cart`)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not add to cart')
    } finally {
      setAdding(false)
    }
  }

  if (loading) return <PageLoader label="Loading produce…" />

  if (!item) {
    return (
      <div className="container-page py-12 sm:py-16">
        <EmptyState
          icon={Search}
          title="Listing not found"
          description="It may have been sold or removed."
          action={<Button to="/commodities">Back to marketplace</Button>}
          className="mx-auto max-w-lg"
        />
      </div>
    )
  }

  return (
    <div className="container-page py-12 sm:py-16">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-sand-500 transition hover:text-brand-700"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        {/* Gallery */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}>
          <div className="overflow-hidden rounded-2xl border border-[color:var(--hairline)] bg-brand-50 shadow-sm">
            {item.images?.length ? (
              <img src={imgUrl(item.images[imgIdx])} alt={item.commodity_name} className="h-[340px] w-full object-cover sm:h-[420px]" />
            ) : (
              <div className="grid h-[340px] place-items-center text-8xl sm:h-[420px]">🌾</div>
            )}
          </div>
          {item.images?.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scroll-x">
              {item.images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setImgIdx(i)}
                  aria-label={`View image ${i + 1}`}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    i === imgIdx ? 'border-brand-600' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl(img)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Info */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08, ease: EASE }}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{item.category}</Badge>
            <Badge tone={item.availability_status === 'available' ? 'success' : 'neutral'}>
              {item.availability_status === 'available' ? 'Available now' : item.availability_status}
            </Badge>
          </div>

          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {item.commodity_name}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-sand-500">
            <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {item.location}</span>
            <span className="inline-flex items-center gap-1.5"><BadgeCheck size={14} className="text-brand-600" /> {item.user?.name || 'Verified farmer'}</span>
          </p>

          <div className="mt-6 flex items-end gap-3">
            <p className="font-mono text-4xl font-extrabold tracking-tight text-brand-700 tnum">₦{money(item.price)}</p>
            <span className="mb-1 text-sm text-sand-400">per {item.unit}</span>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="card-flat p-3.5">
              <p className="flex items-center gap-1 text-2xs font-bold uppercase tracking-wide text-sand-400"><Package size={11} /> In stock</p>
              <p className="mt-1 text-sm font-bold text-ink tnum">{money(item.quantity)} {item.unit}</p>
            </div>
            <div className="card-flat p-3.5">
              <p className="flex items-center gap-1 text-2xs font-bold uppercase tracking-wide text-sand-400"><CalendarDays size={11} /> Harvested</p>
              <p className="mt-1 text-sm font-bold text-ink">{fmtDate(item.harvest_date)}</p>
            </div>
            <div className="card-flat p-3.5">
              <p className="flex items-center gap-1 text-2xs font-bold uppercase tracking-wide text-sand-400"><Sprout size={11} /> Expires</p>
              <p className="mt-1 text-sm font-bold text-ink">{fmtDate(item.expiry_date)}</p>
            </div>
          </div>

          {item.description && (
            <div className="card-flat mt-6 p-5">
              <h2 className="text-2xs font-bold uppercase tracking-wide text-sand-400">About this produce</h2>
              <p className="mt-2 text-sm leading-relaxed text-sand-600">{item.description}</p>
            </div>
          )}

          {/* Purchase */}
          <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/70 p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-brand-700">Quantity ({item.unit})</span>
              <div className="flex items-center overflow-hidden rounded-xl border border-brand-200 bg-white">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="grid h-10 w-10 place-items-center text-sand-500 transition hover:bg-brand-50"
                  aria-label="Decrease quantity"
                >
                  <Minus size={15} />
                </button>
                <input
                  type="number"
                  min="1"
                  max={max}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(max, Number(e.target.value) || 1)))}
                  className="w-16 border-x border-brand-200 py-2 text-center text-sm font-bold text-ink outline-none tnum"
                  aria-label="Quantity"
                />
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(max, q + 1))}
                  className="grid h-10 w-10 place-items-center text-sand-500 transition hover:bg-brand-50"
                  aria-label="Increase quantity"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-brand-200/60 pt-4">
              <span className="text-sm text-brand-700/70">Estimated total</span>
              <span className="font-mono text-xl font-extrabold text-brand-700 tnum">₦{money(item.price * qty)}</span>
            </div>

            <Button
              onClick={addToCart}
              size="lg"
              loading={adding}
              disabled={max < 1}
              leftIcon={ShoppingCart}
              className="mt-4 w-full"
            >
              {adding ? 'Adding…' : max < 1 ? 'Out of stock' : 'Add to cart'}
            </Button>
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-brand-700/60">
              <Truck size={12} /> Delivery arranged at checkout
            </p>
          </div>

          <Link to="/commodities" className="btn-link mt-5">
            Browse more produce
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
