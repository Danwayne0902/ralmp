import clsx from 'clsx'
import { motion } from 'framer-motion'

export default function Tabs({ tabs = [], value, onChange, className, variant = 'pill' }) {
  return (
    <div
      role="tablist"
      className={clsx(
        'flex items-center gap-1 overflow-x-auto scroll-x',
        variant === 'pill' && 'rounded-xl border border-[color:var(--hairline)] bg-sand-100 p-1',
        variant === 'underline' && 'gap-4 border-b border-[color:var(--hairline)]',
        className
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === value
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.id)}
            className={clsx(
              'relative inline-flex shrink-0 items-center gap-2 px-3.5 py-2 text-sm font-semibold transition',
              variant === 'pill' && 'rounded-lg',
              variant === 'underline' && 'rounded-none pb-3',
              variant === 'pill' && (active ? 'text-ink' : 'text-sand-600 hover:text-ink'),
              variant === 'underline' && (active ? 'text-brand-700' : 'text-sand-500 hover:text-ink')
            )}
          >
            {variant === 'pill' && active && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 -z-10 rounded-lg bg-white shadow-xs"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            {Icon && <Icon size={15} />}
            {tab.label}
            {tab.count != null && (
              <span
                className={clsx(
                  'rounded-full px-1.5 py-0.5 text-2xs font-bold',
                  active ? 'bg-brand-100 text-brand-800' : 'bg-sand-200 text-sand-600'
                )}
              >
                {tab.count}
              </span>
            )}
            {variant === 'underline' && active && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
