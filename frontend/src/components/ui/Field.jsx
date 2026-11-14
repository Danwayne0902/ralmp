import clsx from 'clsx'

export function Field({ label, hint, error, id, required, htmlFor, className, children }) {
  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <label htmlFor={htmlFor || id} className="label">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <span className="error-text">{error}</span>
      ) : hint ? (
        <span className="help">{hint}</span>
      ) : null}
    </div>
  )
}

export function Input({ className, invalid, ...rest }) {
  return <input className={clsx('field', invalid && 'field-error', className)} {...rest} />
}

export function Textarea({ className, invalid, ...rest }) {
  return <textarea className={clsx('field', invalid && 'field-error', className)} {...rest} />
}

export function Select({ className, invalid, children, ...rest }) {
  return (
    <select className={clsx('select', invalid && 'field-error', className)} {...rest}>
      {children}
    </select>
  )
}

export function Checkbox({ label, hint, className, ...rest }) {
  return (
    <label className={clsx('flex cursor-pointer items-start gap-2.5 text-sm text-ink', className)}>
      <input type="checkbox" className="check" {...rest} />
      {(label || hint) && (
        <span className="leading-tight">
          {label && <span className="font-medium">{label}</span>}
          {hint && <span className="mt-0.5 block text-xs text-sand-500">{hint}</span>}
        </span>
      )}
    </label>
  )
}

export function Radio({ label, className, ...rest }) {
  return (
    <label className={clsx('flex cursor-pointer items-center gap-2.5 text-sm text-ink', className)}>
      <input type="radio" className="check rounded-full" {...rest} />
      {label && <span className="font-medium">{label}</span>}
    </label>
  )
}
