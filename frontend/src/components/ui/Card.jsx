import clsx from 'clsx'
import { TrendingDown, TrendingUp } from 'lucide-react'

export function Card({ className, interactive, as: Comp = 'div', ...rest }) {
  return <Comp className={clsx(interactive ? 'card-interactive' : 'card', className)} {...rest} />
}

export function CardHeader({ title, subtitle, icon: Icon, actions, className, children }) {
  return (
    <div className={clsx('flex items-start justify-between gap-4 border-b border-[color:var(--hairline)] px-5 py-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <Icon size={17} />
          </span>
        )}
        <div className="min-w-0">
          {title && <h3 className="truncate font-display text-[15px] font-bold text-ink">{title}</h3>}
          {subtitle && <p className="mt-0.5 text-xs text-sand-500">{subtitle}</p>}
          {children}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function CardBody({ className, ...rest }) {
  return <div className={clsx('p-5', className)} {...rest} />
}

export function CardFooter({ className, ...rest }) {
  return (
    <div
      className={clsx('flex items-center justify-between gap-3 border-t border-[color:var(--hairline)] px-5 py-4', className)}
      {...rest}
    />
  )
}

const TONES = {
  brand: 'bg-brand-50 text-brand-700',
  lime: 'bg-lime-100 text-lime-800',
  amber: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-600',
  neutral: 'bg-sand-100 text-sand-700'
}

export function StatCard({ icon: Icon, label, value, hint, delta, tone = 'brand', className }) {
  const up = typeof delta === 'number' ? delta >= 0 : null
  return (
    <div className={clsx('card p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        {Icon && (
          <span className={clsx('grid h-11 w-11 place-items-center rounded-xl', TONES[tone] || TONES.brand)}>
            <Icon size={20} />
          </span>
        )}
        {delta != null && (
          <span
            className={clsx(
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-2xs font-bold',
              up ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-600'
            )}
          >
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="metric mt-4">{value}</p>
      <p className="mt-1 text-[13px] font-medium text-sand-600">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-sand-400">{hint}</p>}
    </div>
  )
}

export function SectionHeading({ eyebrow, title, subtitle, align = 'left', actions, className, children }) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-4',
        align === 'center' && 'items-center text-center',
        actions && 'sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className={clsx(align === 'center' && 'mx-auto max-w-2xl')}>
        {eyebrow && (
          <p className="mb-2 text-2xs font-bold uppercase tracking-[.22em] text-brand-600">{eyebrow}</p>
        )}
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-[1.75rem]">
          {title}
        </h2>
        {subtitle && <p className="mt-2 text-sm leading-relaxed text-sand-500">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={clsx('card flex flex-col items-center px-6 py-16 text-center', className)}>
      {Icon && (
        <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon size={28} strokeWidth={1.8} />
        </span>
      )}
      <h3 className="font-display text-base font-bold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-sand-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function InfoRow({ label, value, icon: Icon, className }) {
  return (
    <div className={clsx('flex items-center justify-between gap-4 py-2.5', className)}>
      <span className="inline-flex items-center gap-2 text-[13px] text-sand-500">
        {Icon && <Icon size={14} className="text-sand-400" />}
        {label}
      </span>
      <span className="text-[13px] font-semibold text-ink">{value}</span>
    </div>
  )
}
