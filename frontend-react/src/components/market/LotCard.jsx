import { Link } from 'react-router-dom'
import { BadgeCheck, CalendarDays, Clock3, MapPin, Package, ShieldCheck, Sprout } from 'lucide-react'
import { cn } from '../../lib/utils'
import { daysBetween, fmtDate, imgUrl, money, unitOne } from '../../lib/format'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

export function LotCard({ lot, onAdd, adding = false, canTrade = true, className }) {
  const verified = Boolean(lot?.user?.verification_status)
  const shelf = daysBetween(new Date(), lot?.expiry_date)
  const fresh = shelf === null ? null : shelf > 14 ? 'Fresh lot' : shelf > 0 ? `${shelf} days shelf life` : 'Past expiry'
  const stock = Number(lot?.quantity || 0)
  // "Low" is unit-sensitive: 22 tonnes is a large lot, 22 tubers is not.
  const unit = String(lot?.unit || '').toLowerCase()
  const lowThreshold = /^tons?$|^tonnes?$/.test(unit) ? 2 : /^bags?$|^crates?$/.test(unit) ? 20 : 50
  const stockLow = stock > 0 && stock < lowThreshold

  return (
    <article
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-card border border-line bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-forest-200 hover:shadow-lift',
        className,
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-sage-100">
        {lot?.images?.[0] ? (
          <img
            src={imgUrl(lot.images[0])}
            alt={lot.commodity_name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center text-4xl text-forest-300">
            <Sprout size={38} strokeWidth={1.4} />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
          <Badge tone={verified ? 'verified' : 'pending'} size="sm" className="bg-white/95 backdrop-blur">
            <BadgeCheck size={11} />
            {verified ? 'Verified grower' : 'Verification pending'}
          </Badge>
          <Badge tone="dark" size="sm" className="capitalize">
            {lot?.category || 'produce'}
          </Badge>
        </div>
        {fresh && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-forest-900/85 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
            {fresh}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
          <BadgeCheck size={12} className={verified ? 'text-forest-500' : 'text-sage-400'} />
          <span className="break-words">{lot?.user?.name || 'Independent grower'}</span>
          <span className="text-sage-400">·</span>
          <span className="break-words">{lot?.user?.state || lot?.location?.split(',')?.pop()?.trim()}</span>
        </p>

        <h3 className="mt-1.5 font-display text-[15px] font-bold leading-5 text-ink">
          <Link to={`/commodities/${lot.id}`} className="hover:text-forest-600">
            {lot?.commodity_name}
          </Link>
        </h3>

        <p className="mt-1 flex items-center gap-1 text-[11.5px] text-muted">
          <MapPin size={11} className="shrink-0" />
          <span className="break-words">{lot?.location || 'Nigeria'}</span>
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-sage-50 px-2 py-1 text-[10.5px] font-medium text-muted">
            <Package size={10} /> {money(stock)} {lot?.unit} available
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-sage-50 px-2 py-1 text-[10.5px] font-medium text-muted">
            <CalendarDays size={10} /> Harvested {fmtDate(lot?.harvest_date, { month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1.5 border-t border-line pt-3.5">
          <div>
            <p className="font-display text-[19px] font-extrabold leading-6 tracking-tight text-forest-600 tnum">
              {money(lot?.price)}
            </p>
            <p className="text-[10.5px] font-medium text-muted">per {unitOne(lot?.unit)}</p>
          </div>
          {stockLow ? (
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-harvest-50 px-2 py-1 text-[10px] font-bold text-harvest-600">
              <Clock3 size={10} /> Low stock
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-forest-50 px-2 py-1 text-[10px] font-bold text-forest-600">
              <ShieldCheck size={10} /> Escrow protected
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to={`/commodities/${lot.id}`}>Inspect lot</Link>
          </Button>
          {canTrade ? (
            <Button variant="primary" size="sm" className="w-full" onClick={onAdd} disabled={adding || stock < 1}>
              {stock < 1 ? 'Sold out' : adding ? 'Adding…' : 'Commit escrow'}
            </Button>
          ) : (
            <Button asChild variant="primary" size="sm" className="w-full">
              <Link to={`/commodities/${lot.id}`}>View lot</Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}

export function LotCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-white shadow-card">
      <div className="skeleton aspect-[16/10] rounded-none" />
      <div className="space-y-2 p-4">
        <div className="skeleton h-3 w-2/3" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton h-10 w-full" />
      </div>
    </div>
  )
}
