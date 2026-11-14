import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Edit3, MapPin, Package, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { produceService } from '../lib/services'
import { fmtDate, imgUrl, money } from '../lib/format'
import PageHeader from '../components/PageHeader'
import { Badge, Button, EmptyState, Skeleton, StatusBadge } from '../components/ui'

const EASE = [0.22, 1, 0.36, 1]

export default function FarmerListings() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await produceService.mine({ per_page: 100 })
      setItems(res.data.data || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function remove(id) {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return
    try {
      await produceService.remove(id)
      setItems((list) => list.filter((x) => x.id !== id))
      toast.success('Listing deleted')
    } catch {
      toast.error('Could not delete listing')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title="My listings"
        subtitle="Manage and track your farm produce."
        actions={
          <Button to="/farmer/listings/create" leftIcon={Plus}>
            New listing
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No listings yet"
          description="Publish your first harvest so buyers can find and order it."
          action={
            <Button to="/farmer/listings/create" leftIcon={Plus}>
              Create listing
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((l, i) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE, delay: Math.min(i, 8) * 0.04 }}
            >
              <div className="card card-interactive flex h-full flex-col overflow-hidden">
                <div className="relative h-40 overflow-hidden bg-sand-100">
                  {l.images?.[0] ? (
                    <img src={imgUrl(l.images[0])} alt={l.commodity_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-5xl" aria-hidden>
                      {l.emoji || '🌾'}
                    </div>
                  )}
                  <span className="absolute left-3 top-3">
                    <StatusBadge status={l.availability_status} />
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <h3 className="truncate font-display text-sm font-bold text-ink">{l.commodity_name}</h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-sand-500">
                    <MapPin size={11} /> {l.location}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-[color:var(--hairline)] bg-sand-50 px-2.5 py-2">
                      <p className="text-2xs font-semibold uppercase tracking-wide text-sand-400">Stock</p>
                      <p className="font-mono text-xs font-bold tnum text-ink">
                        {money(l.quantity)} {l.unit}
                      </p>
                    </div>
                    <div className="rounded-lg border border-brand-100 bg-brand-50 px-2.5 py-2">
                      <p className="text-2xs font-semibold uppercase tracking-wide text-brand-600/70">Price</p>
                      <p className="font-mono text-xs font-bold tnum text-brand-700">₦{money(l.price)}</p>
                    </div>
                  </div>

                  <p className="mt-2 text-2xs text-sand-400">Harvested {fmtDate(l.harvest_date)}</p>

                  <div className="mt-4 flex gap-2 border-t border-[color:var(--hairline)] pt-3">
                    <Button to={`/farmer/listings/${l.id}/edit`} variant="outline" size="sm" leftIcon={Edit3} className="flex-1 justify-center">
                      Edit
                    </Button>
                    <Button
                      variant="danger-soft"
                      size="sm"
                      onClick={() => remove(l.id)}
                      aria-label={`Delete ${l.commodity_name}`}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && items.length > 0 && (
        <p className="text-center text-xs text-sand-400">
          <Badge tone="neutral">{items.length}</Badge> listings in your inventory
        </p>
      )}
    </div>
  )
}
