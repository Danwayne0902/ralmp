import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CalendarDays, Copy, Edit3, Eye, MapPin, Package, Plus,
  Search, Sprout, Trash2, TrendingUp, TriangleAlert,
} from 'lucide-react'
import { PageHeader, Stat, Table, Th, Td, Tr, EmptyState, Skeleton, Pagination } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Tabs } from '../components/ui/Tabs'
import { Modal } from '../components/ui/Overlay'
import { produceService } from '../lib/services'
import { fmtDate, money, qtyUnit, unitOne } from '../lib/format'
import { parseError } from '../lib/utils'
import { CATEGORY_META } from '../data/nigeria'

export default function FarmerListings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [listings, setListings] = useState([])
  const [meta, setMeta] = useState({ total: 0, pages: 1, current: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('all')
  const [target, setTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const page = Number(searchParams.get('page') || 1)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await produceService.mine({ page, per_page: 12 })
      setListings(res.data?.data || [])
      setMeta({
        total: res.data?.total || 0,
        pages: res.data?.last_page || 1,
        current: res.data?.current_page || 1,
      })
    } catch (err) {
      setError(parseError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const filtered = useMemo(() => {
    let rows = listings
    if (tab !== 'all') rows = rows.filter((lot) => lot.availability_status === tab)
    const term = q.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((lot) =>
      [lot.commodity_name, lot.category, lot.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    )
  }, [listings, tab, q])

  const stats = useMemo(() => {
    const live = listings.filter((lot) => lot.availability_status === 'available')
    return {
      live: live.length,
      value: live.reduce((sum, lot) => sum + Number(lot.price || 0) * Number(lot.quantity || 0), 0),
      out: listings.filter((lot) => lot.availability_status === 'out_of_stock').length,
      photos: listings.filter((lot) => lot.images?.length).length,
    }
  }, [listings])

  async function confirmDelete() {
    if (!target) return
    setDeleting(true)
    try {
      await produceService.remove(target.id)
      toast.success(`${target.commodity_name} removed from the market`)
      setTarget(null)
      await load()
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setDeleting(false)
    }
  }

  async function duplicate(lot) {
    try {
      await produceService.create({
        commodity_name: `${lot.commodity_name} (copy)`,
        category: lot.category,
        quantity: lot.quantity,
        unit: lot.unit,
        price: lot.price,
        location: lot.location,
        harvest_date: lot.harvest_date?.slice(0, 10),
        expiry_date: lot.expiry_date?.slice(0, 10),
        description: lot.description || '',
      })
      toast.success('Lot duplicated as a new listing')
      await load()
    } catch (err) {
      toast.error(parseError(err))
    }
  }

  function setPage(next) {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(next))
    setSearchParams(params)
  }

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="Farm hub · inventory"
        title="My harvest lots"
        description="Publish, price and retire the lots buyers see on the spot exchange."
        actions={
          <Button asChild>
            <Link to="/farmer/listings/create">
              <Plus size={15} /> Add harvest
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Sprout} label="Live lots" value={stats.live} hint={`${meta.total} lots on record`} />
        <Stat icon={TrendingUp} label="Value for sale" value={money(stats.value)} tone="sprout" hint="Farm-gate value of live lots" size="lg" />
        <Stat icon={Package} label="Out of stock" value={stats.out} tone="gold" hint="Restore volume to relist" />
        <Stat icon={CalendarDays} label="With photography" value={stats.photos} tone="neutral" hint={`${meta.total - stats.photos} lots need images`} />
      </div>

      {error && (
        <p className="mt-4 rounded-card border border-critical-200 bg-critical-50 px-4 py-3 text-[12.5px] text-critical-600">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onValueChange={setTab}
          items={[
            { value: 'all', label: 'All lots', count: listings.length },
            { value: 'available', label: 'Live', count: stats.live },
            { value: 'out_of_stock', label: 'Out of stock', count: stats.out },
            { value: 'unavailable', label: 'Paused' },
          ]}
          size="sm"
        />
        <div className="flex h-9 items-center gap-2 rounded-btn border border-line bg-white px-3">
          <Search size={14} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search lots"
            aria-label="Search my lots"
            className="h-full w-44 bg-transparent text-[12px] outline-none placeholder:text-muted/60"
          />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-card border border-line bg-white shadow-card">
        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Sprout}
            title={listings.length === 0 ? 'Publish your first harvest' : 'No lots in this view'}
            description={
              listings.length === 0
                ? 'List quantity, unit and farm-gate price. Buyers commit escrow before the lot leaves your gate.'
                : 'Switch tabs or clear the search to see the rest of your inventory.'
            }
            className="border-0 shadow-none"
            action={
              listings.length === 0 ? (
                <Button asChild><Link to="/farmer/listings/create">Add harvest</Link></Button>
              ) : (
                <Button variant="outline" onClick={() => { setTab('all'); setQ('') }}>Clear view</Button>
              )
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table minWidth={860}>
                <thead>
                  <tr>
                    <Th>Commodity</Th>
                    <Th>Origin</Th>
                    <Th className="text-right">Volume</Th>
                    <Th className="text-right">Farm-gate price</Th>
                    <Th className="text-right">Value for sale</Th>
                    <Th>Harvest</Th>
                    <Th>State</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lot) => (
                    <Tr key={lot.id}>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sage-100 text-forest-500">
                            <Sprout size={15} />
                          </span>
                          <div className="min-w-0">
                            <Link to={`/commodities/${lot.id}`} className="block break-words font-semibold text-ink hover:text-forest-600">
                              {lot.commodity_name}
                            </Link>
                            <p className="text-[10.5px] capitalize text-muted">{CATEGORY_META[lot.category]?.label || lot.category}</p>
                          </div>
                        </div>
                      </Td>
                      <Td className="max-w-[150px]">
                        <p className="flex items-center gap-1 break-words text-[11.5px]">
                          <MapPin size={11} className="shrink-0 text-muted" /> {lot.location}
                        </p>
                      </Td>
                      <Td className="text-right tnum">{Number(lot.quantity).toLocaleString('en-NG')} {lot.unit}</Td>
                      <Td className="text-right tnum">{money(lot.price)}</Td>
                      <Td className="text-right font-semibold text-ink tnum">
                        {money(Number(lot.price) * Number(lot.quantity))}
                      </Td>
                      <Td className="text-[11.5px] text-muted">{fmtDate(lot.harvest_date)}</Td>
                      <Td>
                        <Badge tone={lot.availability_status === 'available' ? 'verified' : lot.availability_status === 'out_of_stock' ? 'pending' : 'neutral'} size="sm">
                          {lot.availability_status === 'available' ? 'Live' : lot.availability_status?.replace('_', ' ')}
                        </Badge>
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-0.5">
                          <Button asChild variant="ghost" size="icon-sm">
                            <Link to={`/commodities/${lot.id}`} aria-label={`View ${lot.commodity_name}`}><Eye size={14} /></Link>
                          </Button>
                          <Button asChild variant="ghost" size="icon-sm">
                            <Link to={`/farmer/listings/${lot.id}/edit`} aria-label={`Edit ${lot.commodity_name}`}><Edit3 size={14} /></Link>
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => duplicate(lot)} aria-label={`Duplicate ${lot.commodity_name}`}>
                            <Copy size={13} />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => setTarget(lot)} aria-label={`Delete ${lot.commodity_name}`}>
                            <Trash2 size={14} className="text-critical-600" />
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>

            <ul className="divide-y divide-line md:hidden">
              {filtered.map((lot) => (
                <li key={lot.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/commodities/${lot.id}`} className="block break-words text-[13.5px] font-bold text-ink">
                        {lot.commodity_name}
                      </Link>
                      <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-muted">
                        <MapPin size={10} /> {lot.location}
                      </p>
                    </div>
                    <Badge tone={lot.availability_status === 'available' ? 'verified' : 'neutral'} size="sm">
                      {lot.availability_status === 'available' ? 'Live' : lot.availability_status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="mt-2.5 flex items-end justify-between">
                    <div>
                      <p className="text-[11px] text-muted tnum">{qtyUnit(lot.quantity, lot.unit)} · {money(lot.price)}/{unitOne(lot.unit)}</p>
                      <p className="text-[10px] text-muted">Harvested {fmtDate(lot.harvest_date)}</p>
                    </div>
                    <p className="font-display text-[15px] font-extrabold text-forest-600 tnum">
                      {money(Number(lot.price) * Number(lot.quantity))}
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/farmer/listings/${lot.id}/edit`}><Edit3 size={12} /> Edit</Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => duplicate(lot)}>
                      <Copy size={12} /> Copy
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setTarget(lot)}>
                      <Trash2 size={12} /> Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <Pagination
        className="mt-5"
        page={meta.current}
        pages={meta.pages}
        total={meta.total}
        perPage={12}
        onChange={setPage}
      />

      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-line bg-white p-4">
        <TriangleAlert size={15} className="mt-0.5 shrink-0 text-harvest-500" />
        <p className="text-[11px] leading-5 text-muted">
          Deleting a listing removes it from the market right away and cannot be undone. If a buyer has already
          taken some stock, the order record is kept and our team will contact you.
        </p>
      </div>

      <Modal
        open={Boolean(target)}
        onOpenChange={(open) => !open && setTarget(null)}
        title="Delete this lot?"
        description="The listing will be removed from the spot exchange. Existing orders against it are not deleted."
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)} disabled={deleting}>Keep lot</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete lot'}
            </Button>
          </>
        }
        size="sm"
      >
        {target && (
          <div className="rounded-xl border border-line bg-canvas px-4 py-3">
            <p className="text-[13px] font-bold text-ink">{target.commodity_name}</p>
            <p className="mt-0.5 text-[11.5px] text-muted tnum">
              {Number(target.quantity).toLocaleString('en-NG')} {target.unit} · {money(target.price)} per {unitOne(target.unit)}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[10.5px] text-muted">
              <MapPin size={10} /> {target.location}
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
