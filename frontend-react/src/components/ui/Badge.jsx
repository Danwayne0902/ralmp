import { cva } from 'class-variance-authority'
import {
  BadgeCheck, CircleAlert, CircleDot, Clock3, PackageCheck, ShieldCheck, Snowflake, Truck,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { statusMeta } from '../../lib/orders'

const badgeVariants = cva(
  'inline-flex shrink-0 self-start items-center gap-1.5 whitespace-nowrap rounded-full border text-center font-semibold leading-none [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        verified: 'border-forest-200 bg-forest-50 text-forest-600',
        pending: 'border-harvest-200 bg-harvest-50 text-harvest-600',
        transit: 'border-transit-200 bg-transit-50 text-transit-700',
        delivered: 'border-delivered-100 bg-delivered-50 text-delivered-700',
        critical: 'border-critical-200 bg-critical-50 text-critical-600',
        neutral: 'border-line bg-sage-100 text-muted',
        gold: 'border-harvest-200 bg-harvest-300 text-ink',
        dark: 'border-forest-700 bg-forest-900 text-white',
        outline: 'border-line bg-white text-ink-soft',
        live: 'border-forest-200 bg-white text-forest-600',
      },
      size: {
        sm: 'px-2 py-1 text-[10.5px]',
        md: 'px-2.5 py-1 text-[11.5px]',
        lg: 'px-3 py-1.5 text-xs',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
)

export function Badge({ className, tone, size, ...props }) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
}

const TONE_ICONS = {
  verified: BadgeCheck,
  pending: Clock3,
  transit: Truck,
  delivered: PackageCheck,
  critical: CircleAlert,
  neutral: CircleDot,
  gold: ShieldCheck,
  live: CircleDot,
  dark: ShieldCheck,
  outline: CircleDot,
  frozen: Snowflake,
}

export function StatusBadge({ status, size = 'md', className }) {
  const meta = statusMeta(status)
  const Icon = TONE_ICONS[meta.tone] || CircleDot
  return (
    <Badge tone={meta.tone} size={size} className={className}>
      <Icon size={11} strokeWidth={2.4} />
      {meta.label}
    </Badge>
  )
}

export function StateBadge({ state, size = 'sm', label }) {
  const map = {
    settled: { tone: 'verified', label: 'Settled' },
    in_progress: { tone: 'pending', label: 'Awaiting sign-off' },
    unfunded: { tone: 'pending', label: 'Awaiting funding' },
    held: { tone: 'neutral', label: 'Locked in escrow' },
    frozen: { tone: 'critical', label: 'Frozen' },
  }
  const meta = map[state] || map.held
  const text = label || meta.label
  const Icon = TONE_ICONS[meta.tone] || CircleDot
  return (
    <Badge tone={meta.tone} size={size}>
      <Icon size={10} strokeWidth={2.6} />
      {text}
    </Badge>
  )
}

export function VerifiedBadge({ verified, size = 'sm' }) {
  return verified ? (
    <Badge tone="verified" size={size}>
      <BadgeCheck size={11} /> Verified
    </Badge>
  ) : (
    <Badge tone="neutral" size={size}>
      <Clock3 size={11} /> Verification pending
    </Badge>
  )
}
