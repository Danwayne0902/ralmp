import { cn } from '../../lib/utils'

export function Card({ className, as: Comp = 'div', ...props }) {
  return <Comp className={cn('min-w-0 rounded-card border border-line bg-surface shadow-card', className)} {...props} />
}

export function CardHeader({ title, description, action, icon: Icon, className, children }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4', className)}>
      {children || (
        <>
          <div className="flex items-start gap-3">
            {Icon && (
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-forest-50 text-forest-600">
                <Icon size={17} />
              </span>
            )}
            <div>
              <h2 className="font-display text-[15px] font-bold leading-5 text-ink">{title}</h2>
              {description && <p className="mt-0.5 text-xs leading-5 text-muted">{description}</p>}
            </div>
          </div>
          {action}
        </>
      )}
    </div>
  )
}

export function CardBody({ className, ...props }) {
  return <div className={cn('p-5', className)} {...props} />
}

export function CardFooter({ className, ...props }) {
  return <div className={cn('flex flex-wrap items-center gap-3 border-t border-line px-5 py-4', className)} {...props} />
}

export function Section({ eyebrow, title, description, action, className, children, align = 'left' }) {
  return (
    <section className={cn('py-12 sm:py-16', className)}>
      <div className={cn('flex flex-wrap items-end justify-between gap-4', align === 'center' && 'justify-center text-center')}>
        <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
          {eyebrow && <p className="label-caps text-forest-500">{eyebrow}</p>}
          {title && <h2 className="mt-2 font-display text-[26px] font-bold leading-8 tracking-[-0.015em] text-ink sm:text-[32px] sm:leading-10">{title}</h2>}
          {description && <p className="mt-2.5 text-sm leading-6 text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function KeyValue({ label, children, className, mono = false }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-2', className)}>
      <dt className="shrink-0 text-[13px] text-muted">{label}</dt>
      <dd className={cn('min-w-0 break-words text-right text-[13px] font-semibold text-ink', mono && 'tnum')}>{children}</dd>
    </div>
  )
}

export function Callout({ tone = 'sage', icon: Icon, title, children, className }) {
  const tones = {
    sage: 'border-forest-100 bg-forest-50 text-forest-700',
    gold: 'border-harvest-200 bg-harvest-50 text-harvest-600',
    critical: 'border-critical-200 bg-critical-50 text-critical-600',
    neutral: 'border-line bg-sage-50 text-ink-soft',
  }
  return (
    <div className={cn('flex gap-3 rounded-xl border p-4', tones[tone] || tones.sage, className)}>
      {Icon && <Icon size={17} className="mt-0.5 shrink-0" />}
      <div className="min-w-0 text-[13px] leading-5">
        {title && <p className="mb-0.5 font-semibold">{title}</p>}
        <div className="opacity-90">{children}</div>
      </div>
    </div>
  )
}
