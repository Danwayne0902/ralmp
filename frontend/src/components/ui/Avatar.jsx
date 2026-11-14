import clsx from 'clsx'
import { initials } from '../../lib/format'

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-2xs',
  md: 'h-10 w-10 text-xs',
  lg: 'h-12 w-12 text-sm',
  xl: 'h-16 w-16 text-lg'
}

const PALETTE = [
  'bg-brand-100 text-brand-800',
  'bg-lime-100 text-lime-900',
  'bg-amber-100 text-amber-800',
  'bg-brand-600 text-white',
  'bg-ink text-white',
  'bg-sand-200 text-sand-800'
]

function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

export function Avatar({ name = '', src, size = 'md', className, ring }) {
  const tone = PALETTE[hash(name || 'user') % PALETTE.length]
  return (
    <span
      className={clsx(
        'grid shrink-0 place-items-center overflow-hidden rounded-lg font-bold uppercase tracking-wide',
        SIZES[size] || SIZES.md,
        tone,
        ring && 'ring-2 ring-white',
        className
      )}
      title={name}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        initials(name)
      )}
    </span>
  )
}

export function AvatarGroup({ names = [], max = 4, size = 'sm' }) {
  const shown = names.slice(0, max)
  const rest = names.length - shown.length
  return (
    <div className="flex items-center">
      {shown.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} size={size} ring className="-ml-2 first:ml-0" />
      ))}
      {rest > 0 && (
        <span
          className={clsx(
            '-ml-2 grid place-items-center rounded-lg bg-sand-200 font-bold text-sand-700 ring-2 ring-white',
            SIZES[size] || SIZES.sm
          )}
        >
          +{rest}
        </span>
      )}
    </div>
  )
}
