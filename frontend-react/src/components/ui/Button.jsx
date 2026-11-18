import { Slot } from '@radix-ui/react-slot'
import { Loader2 } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex max-w-full select-none items-center justify-center gap-2 whitespace-nowrap rounded-btn text-center font-semibold leading-tight transition-[background-color,border-color,color,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-forest-500 text-white shadow-[0_1px_2px_rgba(15,36,23,.16)] hover:bg-forest-600 active:bg-forest-700',
        secondary:
          'border-[1.5px] border-forest-500 bg-white text-forest-600 hover:bg-forest-50 active:bg-forest-100',
        accent:
          'bg-harvest-300 text-ink shadow-[0_1px_2px_rgba(15,36,23,.12)] hover:bg-harvest-200 active:bg-harvest-400',
        outline:
          'border border-line bg-white text-ink-soft hover:border-sage-400 hover:bg-sage-50 active:bg-sage-100',
        ghost: 'text-ink-soft hover:bg-sage-100 hover:text-ink',
        quiet: 'text-muted hover:bg-sage-100 hover:text-ink',
        danger:
          'border border-critical-200 bg-critical-50 text-critical-600 hover:bg-critical-100',
        link: 'h-auto rounded-none px-0 text-forest-600 underline-offset-4 hover:underline',
        dark: 'bg-forest-900 text-white hover:bg-forest-800',
      },
      size: {
        sm: 'min-h-9 px-3 py-1.5 text-[13px]',
        md: 'min-h-10 px-4 py-2 text-[13.5px]',
        lg: 'min-h-12 px-5 py-2.5 text-sm',
        xl: 'min-h-[52px] px-6 py-3 text-[15px]',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export function Button({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }) {
  const classes = cn(buttonVariants({ variant, size }), className)

  if (asChild) {
    return (
      <Slot className={classes} {...props}>
        {children}
      </Slot>
    )
  }

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}

export { buttonVariants }
