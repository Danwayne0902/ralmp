import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, BadgeCheck, CalendarDays, Check, ChevronRight, ClipboardCheck, Clock3,
  FlaskConical, Lock, MapPin, Minus, Package, Plus, Scale, ShieldCheck, Sprout, Truck,
  Warehouse, Weight,
} from 'lucide-react'
import { produceService } from '../lib/services'
import { daysBetween, fmtDate, imgUrl, money, qtyUnit } from '../lib/format'
import { escrowSchedule } from '../lib/orders'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { KeyValue } from '../components/ui/Card'
import { Loading, EmptyState } from '../components/ui/Data'
import { LotCard } from '../components/market/LotCard'
import { StateBadge } from '../components/ui/Badge'
import { cn, parseError } from '../lib/utils'
import { useAuth } from '../store/auth'
import { useCart } from '../store/cart'

const DELIVERY_FEE = 2500

function Stepper({ value, onChange, max, unit }) {
  return (
    <div className="flex h-11 items-stretch overflow-hidden rounded-btn border border-line bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, Number(value) - 1))}
        aria-label="Decrease quantity"
        className="grid w-10 place-items-center text-muted transition hover:bg-sage-100 hover:text-ink disabled:opacity-40"
        disabled={Number(value) <= 1}
      >
        <Minus size={14} />
      </button>
      <div className="flex flex-1 items-center justify-center border-x border-line px-2">
        <input
          type="number"
          min="1"
          max={max}
          value={value}
          onChange={(e) => {
            const next = e.target.value
            onChange(next === '' ? '' : Math.min(Number(next), Number(max)))
          }}
          aria-label={`Quantity in ${unit}`}
          className="w-full bg-transparent text-center text-[13.5px] font-semibold text-ink outline-none tnum"
        />
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(Number(max), Number(value) + 1))}
        aria-label="Increase quantity"
        className="grid w-10 place-items-center text-muted transition hover:bg-sage-100 hover:text-ink disabled:opacity-40"
        disabled={Number(value) >= Number(max)}
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

export default function CommodityDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const cart = useCart()
  const [lot, setLot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [related, setRelated] = useState([])
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setQuantity(1)
    setActiveImage(0)

    produceService
      .get(id)
      .then((data) => {
        if (!active) return
        if (!data?.id) {
          setError('This lot is no longer on the board.')
          return
        }
        setLot(data)
        produceService
          .list({ category: data.category, per_page: 4, availability_status: 'available' })
          .then((res) => {
            if (active) setRelated((res.data?.data || []).filter((item) => item.id !== data.id).slice(0, 3))
          })
          .catch(() => {})
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

  const qty = Number(quantity) || 0
  const stock = Number(lot?.quantity || 0)
  const subtotal = qty * Number(lot?.price || 0)
  const total = subtotal + (qty > 0 ? DELIVERY_FEE : 0)
  const schedule = useMemo(() => escrowSchedule({ total_price: total, status: 'pending', payment_status: 'pending' }), [total])

  const shelf = daysBetween(new Date(), lot?.expiry_date)
  const canTrade = !user || user?.role === 'buyer'

  async function addToCart() {
    if (qty < 1) {
      toast.error('Enter a quantity of at least 1')
      return
    }
    if (!user) {
      toast.info('Sign in to stage an escrow commitment')
      navigate('/login', { state: { from: `/commodities/${id}` } })
      return
    }
    if (user.role !== 'buyer') {
      toast.error('Only buyer accounts can commit escrow')
      return
    }
    setAdding(true)
    try {
      await cart.add(Number(id), qty)
      toast.success(`Added ${qtyUnit(qty, lot.unit)} to your procurement basket`, {
        action: { label: 'Open basket', onClick: () => navigate('/cart') },
      })
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <div className="page-wrap page-pad">
        <Loading label="Loading lot sheet" />
      </div>
    )
  }

  if (error || !lot) {
    return (
      <div className="page-wrap page-pad">
        <EmptyState
          icon={Sprout}
          title="Lot unavailable"
          description={error || 'This listing may have been sold or withdrawn by the grower.'}
          action={
            <Button asChild variant="outline">
              <Link to="/commodities">
                <ArrowLeft size={14} /> Back to the exchange
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  const images = lot.images?.length ? lot.images : []
  const verified = Boolean(lot.user?.verification_status)
  const soldOut = stock < 1 || lot.availability_status !== 'available'

  return (
    <div className="page-wrap page-pad">
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-forest-600">Home</Link>
        <ChevronRight size={12} />
        <Link to="/commodities" className="hover:text-forest-600">Spot exchange</Link>
        <ChevronRight size={12} />
        <Link to={`/commodities?category=${lot.category}`} className="capitalize hover:text-forest-600">
          {lot.category}
        </Link>
        <ChevronRight size={12} />
        <span className="break-words font-medium text-ink-soft">{lot.commodity_name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-6">
          <div className="overflow-hidden rounded-card border border-line bg-white shadow-card">
            <div className="relative aspect-[16/9] bg-sage-100 sm:aspect-[2/1]">
              {images[activeImage] ? (
                <img
                  src={imgUrl(images[activeImage])}
                  alt={lot.commodity_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center text-forest-300">
                  <Sprout size={56} strokeWidth={1.2} />
                </div>
              )}
              <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                <Badge tone={verified ? 'verified' : 'pending'} size="md" className="bg-white/95 backdrop-blur">
                  <BadgeCheck size={12} /> {verified ? 'Verified grower' : 'Verification pending'}
                </Badge>
                <Badge tone="dark" size="md" className="capitalize">{lot.category}</Badge>
              </div>
              {shelf !== null && (
                <span className="absolute bottom-3 right-3 rounded-full bg-forest-900/85 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur">
                  {shelf > 0 ? `${shelf} days to stated expiry` : 'Past stated expiry'}
                </span>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto border-t border-line p-3">
                {images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={cn(
                      'h-14 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition',
                      activeImage === index ? 'border-forest-500' : 'border-transparent opacity-70 hover:opacity-100',
                    )}
                  >
                    <img src={imgUrl(image)} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted">
                  <MapPin size={12} /> {lot.location || 'Nigeria'}
                  <span className="text-sage-400">·</span>
                  listed {fmtDate(lot.created_at)}
                </p>
                <h1 className="mt-1.5 font-display text-[27px] font-extrabold leading-8 tracking-[-0.02em] text-ink sm:text-[32px]">
                  {lot.commodity_name}
                </h1>
                <p className="mt-1.5 text-[13px] text-muted">
                  Lot #{lot.id} · {qtyUnit(lot.quantity, lot.unit)} on the board
                </p>
              </div>
              <Badge tone={soldOut ? 'critical' : stock < 50 ? 'pending' : 'verified'} size="lg">
                {soldOut ? 'Unavailable' : stock < 50 ? 'Low remaining volume' : 'Available now'}
              </Badge>
            </div>

            <p className="mt-5 whitespace-pre-line text-[13.5px] leading-6 text-ink-soft/85">
              {lot.description ||
                'The grower has not attached a long-form description for this lot. Request grading and moisture detail from the trade desk before committing at scale.'}
            </p>

            <dl className="mt-6 grid gap-x-8 border-t border-line pt-3 sm:grid-cols-2">
              <KeyValue label="Harvest date">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={12} className="text-muted" /> {fmtDate(lot.harvest_date)}
                </span>
              </KeyValue>
              <KeyValue label="Stated shelf life">
                {shelf > 0 ? `${shelf} days` : 'Expired'}
              </KeyValue>
              <KeyValue label="Available volume">
                <span className="tnum">{qtyUnit(lot.quantity, lot.unit)}</span>
              </KeyValue>
              <KeyValue label="Unit of trade">{lot.unit}</KeyValue>
              <KeyValue label="Origin LGA">{lot.user?.lga || 'Not disclosed'}</KeyValue>
              <KeyValue label="Origin state">{lot.user?.state || 'Not disclosed'}</KeyValue>
            </dl>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-card border border-line bg-white p-5">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-forest-50 text-forest-600">
                  <FlaskConical size={15} />
                </span>
                <h2 className="font-display text-[14px] font-bold text-ink">Quality protocol</h2>
              </div>
              <ul className="mt-4 space-y-3">
                {[
                  { label: 'Origin visual grade', note: 'Grower-declared at listing', done: true },
                  { label: 'Moisture assay', note: 'Issued at destination lab', done: false },
                  { label: 'Weight verification', note: 'Dual weighbridge at 1.0% tolerance', done: false },
                  { label: 'Silo acceptance', note: 'Buyer receiving receipt', done: false },
                ].map((step) => (
                  <li key={step.label} className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border',
                        step.done ? 'border-forest-500 bg-forest-500 text-white' : 'border-sage-400 bg-white',
                      )}
                    >
                      {step.done && <Check size={9} strokeWidth={4} />}
                    </span>
                    <div>
                      <p className="text-[12px] font-semibold text-ink-soft">{step.label}</p>
                      <p className="text-[10.5px] text-muted">{step.note}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-line pt-3 text-[10.5px] leading-4 text-muted">
                Lab values are released only after the destination sample is sealed. The platform does not publish
                grower-declared moisture as a verified figure.
              </p>
            </div>

            <div className="rounded-card border border-line bg-white p-5">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-harvest-50 text-harvest-600">
                  <Truck size={15} />
                </span>
                <h2 className="font-display text-[14px] font-bold text-ink">Haulage & custody</h2>
              </div>
              <ul className="mt-4 space-y-3">
                {[
                  { icon: Weight, title: 'Origin weighbridge', note: 'Tare and gross captured before dispatch' },
                  { icon: Truck, title: 'e-Waybill issuance', note: 'Carrier identity bound to the order' },
                  { icon: Scale, title: 'Destination re-weigh', note: 'Variance adjudicated automatically' },
                  { icon: Warehouse, title: 'Silo discharge', note: 'Buyer signs the receiving receipt' },
                ].map((step) => (
                  <li key={step.title} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-sage-100 text-forest-600">
                      <step.icon size={12} />
                    </span>
                    <div>
                      <p className="text-[12px] font-semibold text-ink-soft">{step.title}</p>
                      <p className="text-[10.5px] text-muted">{step.note}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex items-center gap-1.5 border-t border-line pt-3 text-[10.5px] text-muted">
                <ClipboardCheck size={12} className="text-forest-500" /> Freight is pre-funded inside the same escrow.
              </p>
            </div>
          </div>

          {related.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-[17px] font-bold text-ink">Similar lots on the board</h2>
                <Link to={`/commodities?category=${lot.category}`} className="text-[11.5px] font-semibold text-forest-600 hover:underline">
                  View category
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {related.map((item) => (
                  <LotCard key={item.id} lot={item} canTrade={false} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4 self-start lg:sticky lg:top-24">
          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="border-b border-line px-5 py-4">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Farm-gate price</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-display text-[30px] font-extrabold leading-9 tracking-tight text-forest-600 tnum">
                  {money(lot.price)}
                </span>
                <span className="text-[12px] font-medium text-muted">/ {lot.unit}</span>
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
                <ShieldCheck size={12} className="text-forest-500" /> Escrow protected · freight estimated at {money(DELIVERY_FEE)}
              </p>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="lot-quantity" className="text-[12px] font-semibold text-ink-soft">
                    Quantity ({lot.unit})
                  </label>
                  <button
                    type="button"
                    onClick={() => setQuantity(stock)}
                    className="text-[10.5px] font-semibold text-forest-600 hover:underline"
                  >
                    Use full lot
                  </button>
                </div>
                <Stepper value={quantity} onChange={setQuantity} max={stock} unit={lot.unit} />
                <p className="mt-1.5 text-[10.5px] text-muted tnum">
                  {stock.toLocaleString('en-NG')} {lot.unit} available at this farm gate
                </p>
              </div>

              <div className="space-y-2 rounded-xl border border-line bg-canvas px-3.5 py-3 text-[12px]">
                <div className="flex justify-between text-muted">
                  <span>Produce subtotal</span>
                  <span className="font-semibold text-ink tnum">{money(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Estimated haulage</span>
                  <span className="font-semibold text-ink tnum">{money(qty > 0 ? DELIVERY_FEE : 0)}</span>
                </div>
                <div className="flex justify-between border-t border-line pt-2">
                  <span className="font-semibold text-ink">Escrow commitment</span>
                  <span className="font-display text-[15px] font-extrabold text-forest-600 tnum">{money(total)}</span>
                </div>
              </div>

              {soldOut ? (
                <Button size="lg" className="w-full" disabled>Lot unavailable</Button>
              ) : canTrade ? (
                <Button size="lg" className="w-full" onClick={addToCart} disabled={adding || qty < 1}>
                  <Lock size={15} /> {adding ? 'Adding to basket…' : user ? 'Commit to escrow basket' : 'Sign in to commit'}
                </Button>
              ) : (
                <Button asChild size="lg" className="w-full" variant="outline">
                  <Link to="/login">Buyer account required</Link>
                </Button>
              )}

              <p className="text-center text-[10.5px] leading-4 text-muted">
                No charge yet. Review freight and milestone split at escrow checkout.
              </p>
            </div>
          </div>

          <div className="rounded-card border border-line bg-white p-5">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Grower on record</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-forest-50 text-forest-600">
                {lot.user?.profile_image ? (
                  <img src={imgUrl(lot.user.profile_image)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Sprout size={20} />
                )}
              </span>
              <div className="min-w-0">
                <p className="break-words text-[13.5px] font-bold text-ink">{lot.user?.name || 'Independent grower'}</p>
                <p className="text-[11px] text-muted">
                  {[lot.user?.lga, lot.user?.state].filter(Boolean).join(', ') || 'Origin not disclosed'}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone={verified ? 'verified' : 'pending'} size="sm">
                <BadgeCheck size={10} /> {verified ? 'Identity verified' : 'Verification pending'}
              </Badge>
              <Badge tone="neutral" size="sm">
                <Package size={10} /> {qtyUnit(lot.quantity, lot.unit)}
              </Badge>
            </div>
            {user && user.role === 'buyer' && (
              <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                <Link to={`/messages?to=${lot.user_id}&name=${encodeURIComponent(lot.user?.name || '')}`}>Message grower</Link>
              </Button>
            )}
          </div>

          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="flex items-center gap-2 font-display text-[13.5px] font-bold text-ink">
                <Lock size={14} className="text-forest-500" /> Settlement schedule
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted">This commitment</span>
            </div>
            <ol className="divide-y divide-line px-5">
              {schedule.map((tranche) => (
                <li key={tranche.key} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sage-100 text-[9.5px] font-bold text-muted">
                    {tranche.index}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11.5px] font-semibold text-ink">
                      {Math.round(tranche.share * 100)}% · {tranche.short}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-4 text-muted">{tranche.trigger}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11.5px] font-bold text-ink tnum">{money(tranche.amount)}</p>
                    <div className="mt-0.5 flex justify-end">
                      <StateBadge state={tranche.state} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-card border border-forest-100 bg-forest-50 p-4">
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-forest-700">
              <Clock3 size={13} /> What happens next
            </p>
            <p className="mt-1.5 text-[11px] leading-5 text-forest-700/75">
              Your basket stages the commitment. At checkout you authorise the escrow and a carrier is matched
              against the origin. The grower is notified only after funds are locked.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
