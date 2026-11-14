import clsx from 'clsx'
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

export function Spinner({ label, className, size = 36 }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3 py-16 text-sand-400', className)}>
      <Loader2 size={size} className="animate-spin text-brand-600" aria-hidden />
      {label && <span className="text-sm">{label}</span>}
      <span className="sr-only">Loading</span>
    </div>
  )
}

export default Spinner

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="container-page flex min-h-[55vh] items-center justify-center">
      <Spinner label={label} />
    </div>
  )
}

export function Skeleton({ className }) {
  return <div className={clsx('skeleton', className)} />
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={clsx('space-y-2.5', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-3.5" style={{ width: `${100 - i * 12}%` }} />
      ))}
    </div>
  )
}

export function ProgressBar({ value = 0, tone = 'brand', className, showLabel }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  const tones = { brand: 'bg-brand-600', lime: 'bg-lime-400', amber: 'bg-amber-500', danger: 'bg-red-500' }
  return (
    <div className={className}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-sand-200">
        <div
          className={clsx('h-full rounded-full transition-[width] duration-500 ease-snap', tones[tone] || tones.brand)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <p className="mt-1 text-xs font-medium text-sand-500">{pct}%</p>}
    </div>
  )
}

export function Timeline({ items = [], className }) {
  if (!items.length) return null
  return (
    <ol className={clsx('relative space-y-0', className)}>
      {items.map((item, i) => {
        const last = i === items.length - 1
        const state = item.state || 'todo'
        return (
          <li key={item.key ?? i} className="relative flex gap-3.5 pb-6 last:pb-0">
            {!last && (
              <span
                className={clsx(
                  'absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px',
                  state === 'done' ? 'bg-brand-300' : 'bg-sand-200'
                )}
                aria-hidden
              />
            )}
            <span
              className={clsx(
                'relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 bg-white',
                state === 'done' && 'border-brand-600 bg-brand-600 text-white',
                state === 'current' && 'border-brand-600 text-brand-600',
                state === 'todo' && 'border-sand-200 text-sand-300'
              )}
            >
              {state === 'done' ? <Check size={14} strokeWidth={3} /> : <span className="h-2 w-2 rounded-full bg-current" />}
            </span>
            <div className="pt-1">
              <p className={clsx('text-sm font-bold', state === 'todo' ? 'text-sand-400' : 'text-ink')}>{item.title}</p>
              {item.description && <p className="mt-0.5 text-xs leading-relaxed text-sand-500">{item.description}</p>}
              {item.time && <p className="mt-1 font-mono text-2xs uppercase tracking-wide text-sand-400">{item.time}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function Pagination({ page = 1, pages = 1, onChange, className }) {
  if (pages <= 1) return null
  const nums = []
  const add = (n) => nums.push(n)
  add(1)
  for (let i = page - 1; i <= page + 1; i += 1) if (i > 1 && i < pages) add(i)
  if (pages > 1) add(pages)
  const unique = [...new Set(nums)].sort((a, b) => a - b)

  return (
    <nav className={clsx('flex items-center justify-center gap-1.5', className)} aria-label="Pagination">
      <button
        type="button"
        onClick={() => onChange?.(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="btn-outline btn-icon"
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>
      {unique.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && unique[i - 1] !== n - 1 && <span className="px-1 text-sand-400">…</span>}
          <button
            type="button"
            onClick={() => onChange?.(n)}
            aria-current={n === page ? 'page' : undefined}
            className={clsx(
              'grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-semibold transition',
              n === page ? 'bg-brand-600 text-white' : 'text-sand-600 hover:bg-ink/[0.05] hover:text-ink'
            )}
          >
            {n}
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => onChange?.(Math.min(pages, page + 1))}
        disabled={page >= pages}
        className="btn-outline btn-icon"
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  )
}
