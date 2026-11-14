import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary: 'btn-primary',
  accent: 'btn-accent',
  dark: 'btn-dark',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  'danger-soft': 'btn-danger-soft'
}

const SIZES = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
  icon: 'btn-icon',
  'icon-lg': 'btn-icon-lg'
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon: Left,
  rightIcon: Right,
  className,
  children,
  to,
  href,
  type = 'button',
  disabled,
  ...rest
}) {
  const classes = clsx(VARIANTS[variant] || VARIANTS.primary, SIZES[size], className)
  const glyph = size === 'md' ? 17 : size === 'lg' ? 18 : 15

  const inner = (
    <>
      {loading ? (
        <Loader2 size={glyph} className="animate-spin" aria-hidden />
      ) : (
        Left && <Left size={glyph} aria-hidden />
      )}
      {children != null && <span className="truncate">{children}</span>}
      {!loading && Right && <Right size={glyph} aria-hidden />}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {inner}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {inner}
      </a>
    )
  }
  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {inner}
    </button>
  )
}
