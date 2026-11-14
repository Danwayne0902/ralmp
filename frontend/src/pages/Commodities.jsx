import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BadgeCheck, Filter, MapPin, Package, Search, SlidersHorizontal, X } from 'lucide-react'
import { produceService } from '../lib/services'
import { imgUrl, money } from '../lib/format'
import { Button, EmptyState, Field, Input, Select, Skeleton } from '../components/ui'
import { nigeriaStates } from '../data/nigeria'

const categoryOptions = [
  { value: '', label: 'All categories' },
  { value: 'vegetables', label: '🥬 Vegetables' },
  { value: 'fruits', label: '🍎 Fruits' },
  { value: 'grains', label: '🌾 Grains & Cereals' },
  { value: 'tubers', label: '🥔 Tubers' },
  { value: 'legumes', label: '🫘 Legumes' },
  { value: 'spices', label: '🌶️ Spices & Herbs' }
]

const sorts = [
  { value: 'created_at:desc', label: 'Newest first' },
  { value: 'price:asc', label: 'Price: low to high' },
  { value: 'price:desc', label: 'Price: high to low' },
  { value: 'harvest_date:desc', label: 'Recently harvested' }
]

const EMPTY = { search: '', category: '', state: '', min_price: '', max_price: '', sort: 'created_at:desc', fresh: false }

export default function Commodities() {
  const [params] = useSearchParams()
  const [filters, setFilters] = useState({
    ...EMPTY,
    search: params.get('search') || '',
    category: params.get('category') || ''
  })
  const [draft, setDraft] = useState(filters)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [meta, setMeta] = useState({ total: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sort_by, sort_order] = filters.sort.split(':')
      const res = await produceService.list({
        search: filters.search || undefined,
        category: filters.category || undefined,
        state: filters.state || undefined,
        min_price: filters.min_price || undefined,
        max_price: filters.max_price || undefined,
        fresh_only: filters.fresh ? 1 : undefined,
        sort_by,
        sort_order,
        per_page: 48
      })
      setItems(res.data.data || [])
      setMeta({ total: res.data.total || 0 })
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const category = params.get('category')
    const search = params.get('search')
    if (category === null && search === null) return
    setFilters((f) => ({
      ...f,
      category: category ?? f.category,
      search: search ?? f.search
    }))
    setDraft((d) => ({
      ...d,
      category: category ?? d.category,
      search: search ?? d.search
    }))
  }, [params])

  const activeCount = useMemo(
    () => ['search', 'category', 'state', 'min_price', 'max_price'].filter((k) => filters[k]).length + (filters.fresh ? 1 : 0),
    [filters]
  )

  function apply() {
    setFilters(draft)
    setShowFilters(false)
  }

  function reset() {
    setDraft(EMPTY)
    setFilters(EMPTY)
  }

  function renderFilters(prefix) {
    return (
      <div className="space-y-4">
        <Field id={`${prefix}-search`} label="Commodity">
          <Input
            id={`${prefix}-search`}
            placeholder="e.g. tomatoes, maize"
            value={draft.search}
            onChange={(e) => setDraft({ ...draft, search: e.target.value })}
          />
        </Field>
        <Field id={`${prefix}-category`} label="Category">
          <Select id={`${prefix}-category`} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
            {categoryOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </Field>
        <Field id={`${prefix}-state`} label="State">
          <Select id={`${prefix}-state`} value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })}>
            <option value="">All states</option>
            {nigeriaStates.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id={`${prefix}-min`} label="Min ₦">
            <Input id={`${prefix}-min`} type="number" min="0" placeholder="0" value={draft.min_price} onChange={(e) => setDraft({ ...draft, min_price: e.target.value })} />
          </Field>
          <Field id={`${prefix}-max`} label="Max ₦">
            <Input id={`${prefix}-max`} type="number" min="0" placeholder="Any" value={draft.max_price} onChange={(e) => setDraft({ ...draft, max_price: e.target.value })} />
          </Field>
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[color:var(--hairline)] bg-white px-3.5 py-3">
          <input
            type="checkbox"
            checked={draft.fresh}
            onChange={(e) => setDraft({ ...draft, fresh: e.target.checked })}
            className="check"
          />
          <span className="text-sm font-medium text-ink">Fresh only (last 7 days)</span>
        </label>
        <div className="flex gap-2 pt-1">
          <Button onClick={apply} className="flex-1">Apply filters</Button>
          <Button variant="ghost" onClick={reset}>Reset</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container-page py-12 sm:py-16">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-2xs font-bold uppercase tracking-[.24em] text-brand-600">Marketplace</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Fresh produce, direct from farmers
          </h1>
          <p className="mt-2 max-w-xl text-sm text-sand-500">
            {meta.total > 0 ? `${meta.total.toLocaleString()} listing${meta.total === 1 ? '' : 's'}` : 'Live listings'} from verified producers across Nigeria.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            aria-label="Sort listings"
            value={filters.sort}
            onChange={(e) => { setFilters((f) => ({ ...f, sort: e.target.value })); setDraft((d) => ({ ...d, sort: e.target.value })) }}
            className="w-48"
          >
            {sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          <Button variant="outline" className="lg:hidden" leftIcon={SlidersHorizontal} onClick={() => setShowFilters(true)}>
            Filters{activeCount > 0 && <span className="ml-0.5 rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">{activeCount}</span>}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="card sticky top-24 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink"><Filter size={15} className="text-brand-600" /> Filters</h2>
              {activeCount > 0 && <button type="button" onClick={reset} className="text-xs font-semibold text-brand-700 hover:underline">Clear</button>}
            </div>
            {renderFilters('side')}
          </div>
        </aside>

        <div>
          {/* Search bar */}
          <div className="card mb-5 flex items-center gap-2 p-2">
            <span className="pl-2 text-sand-400"><Search size={17} /></span>
            <input
              className="w-full border-0 bg-transparent px-1 py-2 text-sm text-ink outline-none placeholder:text-sand-400"
              placeholder="Search produce, description or category…"
              aria-label="Search produce"
              value={draft.search}
              onChange={(e) => setDraft({ ...draft, search: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && apply()}
            />
            <Button size="sm" onClick={apply} className="shrink-0">Search</Button>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card overflow-hidden">
                  <Skeleton className="h-44 w-full" />
                  <div className="space-y-3 p-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                    <div className="flex items-end justify-between pt-3">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-14" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No commodities found"
              description="Try adjusting your search or filters to see more produce."
              action={<Button onClick={reset}>Reset filters</Button>}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.3), ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link to={`/commodities/${p.id}`} className="card-interactive group flex h-full flex-col overflow-hidden">
                    <div className="relative h-44 overflow-hidden bg-brand-50">
                      {p.images?.[0] ? (
                        <img src={imgUrl(p.images[0])} alt={p.commodity_name} className="h-full w-full object-cover transition duration-500 ease-snap group-hover:scale-105" loading="lazy" />
                      ) : (
                        <div className="grid h-full place-items-center text-5xl">🌾</div>
                      )}
                      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-white/90 px-2.5 py-1 text-2xs font-bold uppercase tracking-wide text-brand-700 backdrop-blur">
                          {p.category}
                        </span>
                        {p.availability_status === 'available' && (
                          <span className="rounded-full bg-lime-300 px-2.5 py-1 text-2xs font-bold uppercase tracking-wide text-ink">
                            In stock
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="truncate font-display text-sm font-bold text-ink">{p.commodity_name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-xs text-sand-500">
                        <MapPin size={11} /> {p.location}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-sand-500">
                        <BadgeCheck size={11} className="text-brand-600" /> {p.user?.name || 'Verified farmer'}
                      </p>
                      <p className="mt-2 line-clamp-2 flex-1 text-xs leading-relaxed text-sand-500">{p.description}</p>
                      <div className="mt-3 flex items-end justify-between border-t border-[color:var(--hairline)] pt-3">
                        <div>
                          <p className="font-mono text-lg font-bold tracking-tight text-brand-700 tnum">₦{money(p.price)}</p>
                          <p className="text-[10px] text-sand-400">per {p.unit}</p>
                        </div>
                        <span className="rounded-lg bg-brand-50 px-2 py-1 text-[10px] font-bold text-brand-700 tnum">
                          {money(p.quantity)} {p.unit}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end bg-ink-950/40 backdrop-blur-sm lg:hidden"
            onClick={() => setShowFilters(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border-t border-[color:var(--hairline)] bg-white p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-ink">Filters</h2>
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  aria-label="Close filters"
                  className="grid h-8 w-8 place-items-center rounded-lg text-sand-400 transition hover:bg-ink/[0.05] hover:text-ink"
                >
                  <X size={18} />
                </button>
              </div>
              {renderFilters('sheet')}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
