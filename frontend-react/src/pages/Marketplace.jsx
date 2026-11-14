import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowRight, ChevronDown, Filter, MapPin, Package, RotateCcw, Search, ShoppingCart,
  SlidersHorizontal, Sparkles, Sprout, X,
} from 'lucide-react'
import { PageHeader, Pagination, EmptyState } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { LotCard, LotCardSkeleton } from '../components/market/LotCard'
import { Sheet } from '../components/ui/Overlay'
import { Checkbox, Input } from '../components/ui/Form'
import { produceService } from '../lib/services'
import { CATEGORY_META, NIGERIA_STATES } from '../data/nigeria'
import { money, qtyUnit } from '../lib/format'
import { cn, parseError } from '../lib/utils'
import { useAuth } from '../store/auth'
import { useCart } from '../store/cart'

const SORTS = [
  { value: 'created_at:desc', label: 'Newest listings' },
  { value: 'price:asc', label: 'Price: low to high' },
  { value: 'price:desc', label: 'Price: high to low' },
  { value: 'quantity:desc', label: 'Largest volume' },
  { value: 'harvest_date:desc', label: 'Most recent harvest' },
]

const initialFilters = {
  q: '',
  category: '',
  state: '',
  minPrice: '',
  maxPrice: '',
  freshOnly: false,
  sort: 'created_at:desc',
}

function FilterControls({ filters, setFilters, onReset, onApply }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[12px] font-bold text-ink">Commodity category</p>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, category: '' }))}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-[11.5px] font-semibold transition',
              !filters.category
                ? 'border-forest-500 bg-forest-50 text-forest-600'
                : 'border-line bg-white text-ink-soft hover:border-sage-400',
            )}
          >
            <Sparkles size={12} /> All lots
          </button>
          {Object.entries(CATEGORY_META).map(([value, meta]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, category: prev.category === value ? '' : value }))}
              className={cn(
                'flex items-center gap-1 rounded-lg border px-2 py-2 text-left text-[11px] font-semibold transition',
                filters.category === value
                  ? 'border-forest-500 bg-forest-50 text-forest-600'
                  : 'border-line bg-white text-ink-soft hover:border-sage-400',
              )}
            >
              <span aria-hidden>{meta.icon}</span>
              <span className="whitespace-nowrap">{meta.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[12px] font-bold text-ink">Origin state</p>
        <select
          value={filters.state}
          onChange={(e) => setFilters((prev) => ({ ...prev, state: e.target.value }))}
          className="select h-10 text-[12.5px]"
          aria-label="Filter by origin state"
        >
          <option value="">All states</option>
          {NIGERIA_STATES.map((state) => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="mb-2 text-[12px] font-bold text-ink">Farm-gate price (₦)</p>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="Min"
            aria-label="Minimum price"
            value={filters.minPrice}
            onChange={(e) => setFilters((prev) => ({ ...prev, minPrice: e.target.value }))}
            className="h-10 text-[12.5px]"
          />
          <Input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="Max"
            aria-label="Maximum price"
            value={filters.maxPrice}
            onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: e.target.value }))}
            className="h-10 text-[12.5px]"
          />
        </div>
      </div>

      <Checkbox
        checked={filters.freshOnly}
        onCheckedChange={(checked) => setFilters((prev) => ({ ...prev, freshOnly: Boolean(checked) }))}
        label="Harvested in the last 7 days"
        description="Only show lots with a recent harvest date."
      />

      <div className="space-y-2 border-t border-line pt-4">
        <Button type="button" size="sm" className="w-full" onClick={onApply}>
          Apply filters
        </Button>
        <Button type="button" variant="ghost" size="sm" className="w-full" onClick={onReset}>
          <RotateCcw size={13} /> Reset all
        </Button>
      </div>
    </div>
  )
}

function BasketRail({ onCheckout }) {
  const { items, total, count, deliveryFee, loading } = useCart()
  const priceOf = (item) => Number(item.unit_price ?? item.price ?? 0)
  const subtotal = items.reduce((sum, item) => sum + priceOf(item) * Number(item.quantity || 0), 0)
  const activeCount = count || items.length

  return (
    <aside className="rounded-card border border-line bg-white shadow-card xl:sticky xl:top-24">
      <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
        <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-ink">
          <ShoppingCart size={15} className="text-forest-500" /> Procurement basket
        </h2>
        <span className="rounded-full bg-forest-50 px-2 py-0.5 text-[10.5px] font-bold text-forest-600">
          {activeCount}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-sage-100 text-muted">
            <Package size={18} />
          </span>
          <p className="mt-3 text-[12.5px] font-semibold text-ink">No lots committed yet</p>
          <p className="mt-1 text-[11.5px] leading-4 text-muted">
            Add a lot to stage an escrow commitment. Funds move only at checkout.
          </p>
        </div>
      ) : (
        <>
          <ul className="max-h-[340px] divide-y divide-line overflow-y-auto scroll-thin">
            {items.map((item) => (
              <li key={item.produce_id || item.id} className="flex gap-2.5 px-4 py-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-sage-100 text-forest-400">
                  <Sprout size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[12px] font-semibold text-ink">{item.commodity_name}</p>
                  <p className="text-[10.5px] text-muted tnum">
                    {qtyUnit(item.quantity, item.unit)} × {money(priceOf(item))}
                  </p>
                </div>
                <p className="shrink-0 text-[11.5px] font-bold text-ink tnum">
                  {money(priceOf(item) * Number(item.quantity || 0))}
                </p>
              </li>
            ))}
          </ul>

          <div className="space-y-2 border-t border-line px-4 py-3.5 text-[12px]">
            <div className="flex justify-between text-muted">
              <span>Produce subtotal</span>
              <span className="font-semibold text-ink tnum">{money(subtotal || total)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Freight (est.)</span>
              <span className="font-semibold text-ink tnum">{money(deliveryFee)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2">
              <span className="font-semibold text-ink">Escrow commitment</span>
              <span className="font-display text-[15px] font-extrabold text-forest-600 tnum">
                {money((subtotal || total) + deliveryFee)}
              </span>
            </div>
          </div>
        </>
      )}

      <div className="border-t border-line p-4">
        <Button
          size="sm"
          className="w-full"
          disabled={items.length === 0 || loading}
          onClick={onCheckout}
        >
          Review escrow checkout <ArrowRight size={14} />
        </Button>
        <Link
          to="/escrow"
          className="mt-2.5 block text-center text-[10.5px] font-semibold text-muted hover:text-forest-600"
        >
          How milestone settlement works
        </Link>
      </div>
    </aside>
  )
}

export default function Marketplace() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const cart = useCart()

  const [filters, setFilters] = useState(() => ({
    ...initialFilters,
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    state: searchParams.get('state') || '',
  }))
  const [, setApplied] = useState(0)
  const [page, setPage] = useState(1)
  const [lots, setLots] = useState([])
  const [meta, setMeta] = useState({ total: 0, pages: 1, current: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mobileFilters, setMobileFilters] = useState(false)
  const [addingId, setAddingId] = useState(null)
  const resultsRef = useRef(null)

  const canTrade = !user || user.role === 'buyer'

  const params = useMemo(() => {
    const [sortBy, sortOrder] = filters.sort.split(':')
    const query = {
      per_page: 9,
      page,
      sort_by: sortBy,
      sort_order: sortOrder,
      availability_status: 'available',
    }
    if (filters.q.trim()) query.search = filters.q.trim()
    if (filters.category) query.category = filters.category
    if (filters.state) query.state = filters.state
    if (filters.minPrice) query.min_price = filters.minPrice
    if (filters.maxPrice) query.max_price = filters.maxPrice
    if (filters.freshOnly) query.fresh_only = 1
    return query
  }, [filters, page])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    const timer = setTimeout(() => {
      produceService
        .list(params)
        .then((res) => {
          if (!active) return
          const payload = res.data || {}
          setLots(payload.data || [])
          setMeta({
            total: payload.total || 0,
            pages: payload.last_page || 1,
            current: payload.current_page || 1,
          })
        })
        .catch((err) => {
          if (!active) return
          setLots([])
          setError(parseError(err))
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 280)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [params])

  useEffect(() => {
    const next = new URLSearchParams()
    if (filters.q.trim()) next.set('q', filters.q.trim())
    if (filters.category) next.set('category', filters.category)
    if (filters.state) next.set('state', filters.state)
    setSearchParams(next, { replace: true })
  }, [filters.q, filters.category, filters.state, setSearchParams])

  useEffect(() => {
    if (cart.items.length === 0 && useAuth.getState().isLoggedIn) cart.fetch().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function apply() {
    setPage(1)
    setApplied((value) => value + 1)
    setMobileFilters(false)
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function reset() {
    setFilters(initialFilters)
    setPage(1)
    setApplied((value) => value + 1)
  }

  async function addToBasket(lot) {
    if (!user) {
      toast.info('Sign in to stage an escrow commitment')
      navigate('/login', { state: { from: '/commodities' } })
      return
    }
    if (user.role !== 'buyer') {
      toast.error('Only buyer accounts can commit escrow')
      return
    }
    setAddingId(lot.id)
    try {
      await cart.add(lot.id, 1)
      toast.success(`${lot.commodity_name} added to your basket`)
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setAddingId(null)
    }
  }

  const activeFilterCount = [
    filters.category,
    filters.state,
    filters.minPrice,
    filters.maxPrice,
    filters.freshOnly,
  ].filter(Boolean).length

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="Spot exchange"
        title="Verified agricultural lots"
        description="Farm-gate pricing from registered growers and co-operatives. Every lot settles through milestone escrow."
        actions={
          <>
            <div className="hidden items-center gap-2 rounded-btn border border-line bg-white px-3 md:flex">
              <Search size={15} className="text-muted" />
              <input
                value={filters.q}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, q: e.target.value }))
                  setPage(1)
                }}
                placeholder="Search commodity or description"
                aria-label="Search lots"
                className="h-10 w-56 bg-transparent text-[13px] outline-none placeholder:text-muted/60 lg:w-64"
              />
              {filters.q && (
                <button type="button" onClick={() => setFilters((prev) => ({ ...prev, q: '' }))} aria-label="Clear search">
                  <X size={14} className="text-muted hover:text-ink" />
                </button>
              )}
            </div>
            <Button variant="outline" size="md" className="lg:hidden" onClick={() => setMobileFilters(true)}>
              <Filter size={15} /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white px-4 py-3 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-2.5 py-1 text-[11px] font-bold text-forest-600">
            <span className="h-1.5 w-1.5 rounded-full bg-forest-500" />
            Live board
          </span>
          <p className="text-[12.5px] text-muted">
            <span className="font-semibold text-ink">{meta.total}</span> lots available ·{' '}
            farm-gate pricing inclusive of escrow protection
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-[11.5px] font-semibold text-muted">Sort</label>
          <select
            id="sort"
            value={filters.sort}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, sort: e.target.value }))
              setPage(1)
            }}
            className="h-9 rounded-btn border border-line bg-white px-2.5 text-[12px] font-medium text-ink-soft outline-none focus:border-forest-500"
          >
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>{sort.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[224px_minmax(0,1fr)] xl:grid-cols-[224px_minmax(0,1fr)_286px]">
        <aside className="hidden self-start lg:sticky lg:top-24 lg:block">
          <div className="rounded-card border border-line bg-white p-4 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink">
                <SlidersHorizontal size={14} className="text-forest-500" /> Refine board
              </p>
              {(activeFilterCount > 0 || filters.q) && (
                <button type="button" onClick={reset} className="text-[10.5px] font-semibold text-forest-600 hover:underline">
                  Clear
                </button>
              )}
            </div>
            <FilterControls
              filters={filters}
              setFilters={(updater) => {
                setFilters(updater)
                setPage(1)
              }}
              onReset={reset}
              onApply={apply}
            />
          </div>

          <div className="mt-4 rounded-card border border-forest-100 bg-forest-50 p-4">
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-forest-700">
              <MapPin size={13} /> Origin-linked supply
            </p>
            <p className="mt-1.5 text-[11px] leading-5 text-forest-700/75">
              State filters match the farm-gate location recorded by the grower, not the carrier&apos;s depot.
            </p>
          </div>
        </aside>

        <div ref={resultsRef} className="min-w-0 scroll-mt-24">
          {error && (
            <div className="mb-4 rounded-card border border-critical-200 bg-critical-50 px-4 py-3 text-[12.5px] text-critical-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <LotCardSkeleton key={i} />
              ))}
            </div>
          ) : lots.length === 0 ? (
            <EmptyState
              icon={Sprout}
              title="No lots match this board view"
              description="Try a wider price range or clear the origin filter. New harvest lots are published throughout the day."
              action={
                <Button variant="outline" onClick={reset}>
                  <RotateCcw size={14} /> Reset filters
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {lots.map((lot) => (
                <LotCard
                  key={lot.id}
                  lot={lot}
                  canTrade={canTrade}
                  adding={addingId === lot.id}
                  onAdd={() => addToBasket(lot)}
                />
              ))}
            </div>
          )}

          <Pagination
            className="mt-6"
            page={meta.current}
            pages={meta.pages}
            total={meta.total}
            perPage={9}
            onChange={(next) => {
              setPage(next)
              resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          />

          <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-muted">
            <ChevronDown size={13} className="mt-0.5 shrink-0" />
            Prices are set by the grower per stated unit at the farm gate. Freight is estimated at checkout from
            the destination LGA and confirmed against the carrier e-Waybill.
          </p>
        </div>

        <div className="lg:col-span-2 xl:col-span-1">
          <BasketRail onCheckout={() => navigate('/cart')} />
        </div>
      </div>

      <Sheet
        open={mobileFilters}
        onOpenChange={setMobileFilters}
        title="Refine the board"
        description="Filters apply to live availability and farm-gate origin."
        side="bottom"
      >
        <FilterControls
          filters={filters}
          setFilters={(updater) => {
            setFilters(updater)
            setPage(1)
          }}
          onReset={reset}
          onApply={apply}
        />
      </Sheet>
    </div>
  )
}
