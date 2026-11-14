import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { initials } from '../../lib/format'

export function Stat({ icon: Icon, label, value, hint, tone = 'forest', delta, className, size = 'md' }) {
  const tones = {
    forest: { icon: 'bg-forest-50 text-forest-600', value: 'text-ink' },
    gold: { icon: 'bg-harvest-50 text-harvest-600', value: 'text-ink' },
    sprout: { icon: 'bg-sprout-100 text-sprout-600', value: 'text-ink' },
    neutral: { icon: 'bg-sage-100 text-muted', value: 'text-ink' },
    critical: { icon: 'bg-critical-50 text-critical-600', value: 'text-critical-600' },
  }
  const toneSet = tones[tone] || tones.forest
  return (
    <div className={cn('rounded-card border border-line bg-surface p-4 shadow-card sm:p-5', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
        {Icon && (
          <span className={cn('grid h-8 w-8 place-items-center rounded-lg', toneSet.icon)}>
            <Icon size={15} />
          </span>
        )}
      </div>
      <p className={cn('mt-2 font-display font-extrabold tracking-tight tnum', size === 'lg' ? 'text-[28px] leading-8' : 'text-[22px] leading-7', toneSet.value)}>
        {value}
      </p>
      {(hint || delta) && (
        <div className="mt-1.5 flex items-center gap-2">
          {delta !== undefined && (
            <span className={cn(
              'rounded px-1.5 py-0.5 text-[10.5px] font-bold',
              Number(delta) >= 0 ? 'bg-forest-50 text-forest-600' : 'bg-critical-50 text-critical-600',
            )}>
              {Number(delta) >= 0 ? '+' : ''}{delta}%
            </span>
          )}
          {hint && <p className="break-words text-[11.5px] text-muted">{hint}</p>}
        </div>
      )}
    </div>
  )
}

export function Progress({ value = 0, className, tone = 'forest' }) {
  const tones = { forest: 'bg-forest-500', gold: 'bg-harvest-300', sprout: 'bg-sprout-400' }
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-sage-200', className)}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', tones[tone] || tones.forest)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export function Avatar({ name, src, size = 'md', className }) {
  const sizes = { sm: 'h-8 w-8 text-[10px]', md: 'h-10 w-10 text-xs', lg: 'h-12 w-12 text-sm', xl: 'h-16 w-16 text-lg' }
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-forest-500 to-forest-700 font-bold text-white',
        sizes[size],
        className,
      )}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials(name)}
    </span>
  )
}

export function Table({ className, children, minWidth = 720 }) {
  return (
    <div className="w-full min-w-0 max-w-full overflow-x-auto">
      <table className={cn('w-full border-collapse text-left text-[13px]', className)} style={{ minWidth }}>
        {children}
      </table>
    </div>
  )
}

export function Th({ className, ...props }) {
  return (
    <th
      className={cn(
        'whitespace-nowrap border-b border-line bg-canvas px-4 py-3 text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted',
        className,
      )}
      {...props}
    />
  )
}

export function Td({ className, ...props }) {
  return <td className={cn('border-b border-line px-4 py-3.5 align-middle text-ink-soft', className)} {...props} />
}

export function Tr({ className, ...props }) {
  return <tr className={cn('transition-colors hover:bg-sage-50/70', className)} {...props} />
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-card border border-dashed border-sage-400 bg-white/60 px-6 py-14 text-center', className)}>
      {Icon && (
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-forest-50 text-forest-500">
          <Icon size={22} />
        </span>
      )}
      <h3 className="mt-4 font-display text-base font-bold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-5 text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Loading({ label = 'Loading', className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-muted', className)}>
      <Loader2 size={22} className="animate-spin text-forest-500" />
      <p className="text-[13px] font-medium">{label}</p>
    </div>
  )
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} />
}

export function PageHeader({ eyebrow, title, description, actions, breadcrumb, className }) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0 max-w-3xl">
        {breadcrumb}
        {eyebrow && <p className="label-caps text-forest-500">{eyebrow}</p>}
        <h1 className="mt-1.5 font-display text-[26px] font-bold leading-8 tracking-[-0.02em] text-ink sm:text-[31px] sm:leading-9">
          {title}
        </h1>
        {description && <p className="mt-1.5 text-[13.5px] leading-5 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Pagination({ page, pages, onChange, total, perPage = 12, className }) {
  if (!pages || pages <= 1) return null
  const list = []
  const start = Math.max(1, page - 2)
  const end = Math.min(pages, start + 4)
  for (let i = start; i <= end; i += 1) list.push(i)

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <p className="text-[12px] text-muted">
        Showing <span className="font-semibold text-ink-soft">{Math.min((page - 1) * perPage + 1, total)}</span>
        {' \u2013 '}
        <span className="font-semibold text-ink-soft">{Math.min(page * perPage, total)}</span> of{' '}
        <span className="font-semibold text-ink-soft">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="h-9 rounded-btn border border-line bg-white px-3 text-[12px] font-semibold text-ink-soft transition hover:border-sage-400 disabled:opacity-40"
        >
          Previous
        </button>
        {list.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              'h-9 min-w-9 rounded-btn border px-2.5 text-[12px] font-semibold transition',
              n === page
                ? 'border-forest-500 bg-forest-500 text-white'
                : 'border-line bg-white text-ink-soft hover:border-sage-400',
            )}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
          className="h-9 rounded-btn border border-line bg-white px-3 text-[12px] font-semibold text-ink-soft transition hover:border-sage-400 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}
