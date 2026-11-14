import clsx from 'clsx'

const TONES = {
  brand: 'badge-brand',
  success: 'badge-success',
  lime: 'badge-lime',
  amber: 'badge-amber',
  danger: 'badge-danger',
  neutral: 'badge-neutral',
  dark: 'badge-dark'
}

export function Badge({ tone = 'neutral', icon: Icon, className, children }) {
  return (
    <span className={clsx(TONES[tone] || TONES.neutral, className)}>
      {Icon && <Icon size={12} aria-hidden />}
      {children}
    </span>
  )
}

export function Chip({ active, className, children, ...rest }) {
  const Comp = rest.to ? 'a' : 'button'
  return (
    <Comp className={clsx('chip', active && 'chip-active', className)} {...rest}>
      {children}
    </Comp>
  )
}

const STATUS = {
  pending: { label: 'Pending', tone: 'amber' },
  unpaid: { label: 'Unpaid', tone: 'amber' },
  processing: { label: 'Processing', tone: 'amber' },
  confirmed: { label: 'Confirmed', tone: 'brand' },
  active: { label: 'Active', tone: 'success' },
  available: { label: 'Available', tone: 'success' },
  approved: { label: 'Approved', tone: 'success' },
  paid: { label: 'Paid', tone: 'success' },
  completed: { label: 'Completed', tone: 'success' },
  delivered: { label: 'Delivered', tone: 'success' },
  shipped: { label: 'Shipped', tone: 'lime' },
  in_transit: { label: 'In transit', tone: 'lime' },
  out_for_delivery: { label: 'Out for delivery', tone: 'lime' },
  assigned: { label: 'Assigned', tone: 'brand' },
  picked_up: { label: 'Picked up', tone: 'lime' },
  draft: { label: 'Draft', tone: 'neutral' },
  sold_out: { label: 'Sold out', tone: 'neutral' },
  out_of_stock: { label: 'Out of stock', tone: 'neutral' },
  inactive: { label: 'Inactive', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  canceled: { label: 'Cancelled', tone: 'danger' },
  rejected: { label: 'Rejected', tone: 'danger' },
  failed: { label: 'Failed', tone: 'danger' },
  suspended: { label: 'Suspended', tone: 'danger' }
}

export function StatusBadge({ status, className }) {
  const key = String(status || '').toLowerCase().replace(/[\s-]+/g, '_')
  const meta = STATUS[key] || { label: status || 'Unknown', tone: 'neutral' }
  return (
    <Badge tone={meta.tone} className={className}>
      {meta.label}
    </Badge>
  )
}
