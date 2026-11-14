import { forwardRef, useId } from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { Check, Minus } from 'lucide-react'
import { cn } from '../../lib/utils'

export function Field({ label, hint, error, required, children, className, htmlFor }) {
  return (
    <div className={cn('block', className)}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-semibold text-ink-soft">
            {label} {required && <span className="text-harvest-500">*</span>}
          </span>
          {hint && <span className="text-[11px] text-muted">{hint}</span>}
        </label>
      )}
      {children}
      {error && <p className="mt-1.5 text-[12px] font-medium text-critical-600">{error}</p>}
    </div>
  )
}

export const Input = forwardRef(function Input({ className, prefix, suffix, ...props }, ref) {
  if (!prefix && !suffix) {
    return <input ref={ref} className={cn('input', className)} {...props} />
  }
  return (
    <div className="relative flex h-12 w-full items-center rounded-btn border border-line bg-surface transition focus-within:border-forest-500 hover:border-sage-400">
      {prefix && (
        <span className="grid h-full shrink-0 place-items-center border-r border-line bg-canvas px-3.5 text-[13px] font-semibold text-muted">
          {prefix}
        </span>
      )}
      <input
        ref={ref}
        className={cn('h-full w-full bg-transparent px-4 text-sm text-ink outline-none placeholder:text-muted/60', className)}
        {...props}
      />
      {suffix && <span className="shrink-0 pr-3.5 text-[12px] text-muted">{suffix}</span>}
    </div>
  )
})

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('textarea', className)} {...props} />
})

export const NativeSelect = forwardRef(function NativeSelect({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn('select', className)} {...props}>
      {children}
    </select>
  )
})

export function Checkbox({ className, checked, onCheckedChange, label, description, disabled }) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-3', disabled && 'opacity-60')}>
      <CheckboxPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[4px] border-[1.5px] border-sage-400 bg-white transition data-[state=checked]:border-forest-500 data-[state=checked]:bg-forest-500 data-[state=indeterminate]:border-forest-500 data-[state=indeterminate]:bg-forest-500',
          className,
        )}
      >
        <CheckboxPrimitive.Indicator className="text-white">
          {checked === 'indeterminate' ? <Minus size={13} strokeWidth={3} /> : <Check size={13} strokeWidth={3} />}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {(label || description) && (
        <label htmlFor={id} className="min-w-0 cursor-pointer select-none">
          {label && <span className="block text-[13px] font-medium text-ink-soft">{label}</span>}
          {description && <span className="mt-0.5 block text-[12px] leading-5 text-muted">{description}</span>}
        </label>
      )}
    </div>
  )
}

export function Switch({ checked, onCheckedChange, label, description, id: idProp }) {
  const generated = useId()
  const id = idProp || generated
  return (
    <div className="flex items-center justify-between gap-4">
      {(label || description) && (
        <label htmlFor={id} className="min-w-0 cursor-pointer">
          {label && <span className="block text-[13px] font-semibold text-ink-soft">{label}</span>}
          {description && <span className="mt-0.5 block text-[12px] leading-5 text-muted">{description}</span>}
        </label>
      )}
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative h-6 w-11 shrink-0 rounded-full border border-transparent bg-sage-300 transition data-[state=checked]:bg-forest-500"
      >
        <SwitchPrimitive.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[22px]" />
      </SwitchPrimitive.Root>
    </div>
  )
}

export function RoleCard({ active, icon: Icon, title, description, onClick, className, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'group relative flex h-full flex-col rounded-xl border p-4 text-left transition',
        active
          ? 'border-forest-500 bg-forest-50 shadow-[0_0_0_1px_#176B3A]'
          : 'border-line bg-white hover:border-sage-400 hover:bg-sage-50',
        className,
      )}
    >
      <span className="flex items-center justify-between">
        <span
          className={cn(
            'grid h-10 w-10 place-items-center rounded-lg transition',
            active ? 'bg-forest-500 text-white' : 'bg-forest-50 text-forest-600',
          )}
        >
          <Icon size={18} />
        </span>
        {badge}
      </span>
      <span className="mt-3 block text-[13.5px] font-bold text-ink">{title}</span>
      <span className="mt-1 block text-[12px] leading-5 text-muted">{description}</span>
    </button>
  )
}

export function ServiceNotice({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-forest-100 bg-forest-50 px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-forest-600">
            <Icon size={16} />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-forest-700">{title}</p>
          <p className="text-[12px] leading-5 text-forest-600/80">{children}</p>
        </div>
      </div>
      {action}
    </div>
  )
}
