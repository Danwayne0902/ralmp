import { ArrowDownToLine, Check, Lock, ShieldCheck, Snowflake, Truck } from 'lucide-react'
import { cn } from '../../lib/utils'
import { money } from '../../lib/format'
import { escrowSchedule } from '../../lib/orders'
import { StateBadge } from '../ui/Badge'
import { Progress } from '../ui/Data'

export function EscrowLedger({ order, className, showTitle = true }) {
  const subtotal = Number(order?.subtotal ?? 0)
  const delivery = Number(order?.delivery_fee ?? 0)
  const total = Number(order?.total_price ?? order?.total_amount ?? subtotal + delivery)

  return (
    <div className={cn('rounded-xl border border-line bg-white', className)}>
      {showTitle && (
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="flex items-center gap-2 text-[13px] font-bold text-ink">
            <ShieldCheck size={15} className="text-forest-500" /> Payment record
          </h3>
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">NGN (₦)</span>
        </div>
      )}
      <dl className="divide-y divide-line px-4 text-[12.5px]">
        <div className="flex items-center justify-between gap-3 py-2.5">
          <dt className="text-muted">Produce value</dt>
          <dd className="font-semibold text-ink tnum">{money(subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-2.5">
          <dt className="text-muted">Delivery</dt>
          <dd className="font-semibold text-ink tnum">{money(delivery)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-2.5">
          <dt className="text-muted">Quality and moisture check</dt>
          <dd className="font-semibold text-forest-600">No charge</dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-2.5">
          <dt className="text-muted">Escrow holding fee</dt>
          <dd className="font-semibold text-forest-600">Free</dd>
        </div>
      </dl>
      <div className="border-t border-line px-4 py-3.5">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">Total order value</p>
        <p className="mt-0.5 font-display text-[26px] font-extrabold leading-8 tracking-tight text-forest-600 tnum">
          {money(total)}
        </p>
        <p className="mt-1 text-[11px] leading-4 text-muted">
          It is paid out step by step as pickup, checks and delivery are confirmed.
        </p>
      </div>
    </div>
  )
}

function deliveryPart(order) {
  const fee = Number(order?.delivery_fee ?? 0)
  const release = order?.escrow?.releases?.find((row) => row.milestone === 'delivery')

  if (!release && fee <= 0) return null

  const paid = order?.payment_status === 'paid'
  let state = 'unfunded'
  let stateLabel = 'Not paid yet'

  if (release) {
    if (release.status === 'released') {
      state = 'settled'
      stateLabel = release.payout?.status === 'paid' ? 'Sent to transporter' : 'Ready to send'
    } else if (release.status === 'held' || release.status === 'cancelled') {
      state = 'frozen'
      stateLabel = release.status === 'cancelled' ? 'Not paid' : 'On hold'
    } else {
      state = paid ? 'in_progress' : 'unfunded'
      stateLabel = release.trigger || 'Waiting for delivery'
    }
  } else if (paid) {
    state = 'in_progress'
    stateLabel = 'Waiting for delivery'
  }

  return {
    key: 'delivery',
    index: 'D',
    share: 0,
    title: 'Delivery payment',
    short: 'Delivery',
    trigger: 'Paid to the transporter when the goods are delivered.',
    amount: release ? Number(release.amount) : fee,
    state,
    stateLabel,
  }
}

export function MilestoneSchedule({ order, compact = false, className, title = 'Payment plan' }) {
  const delivery = deliveryPart(order)
  const schedule = delivery ? [...escrowSchedule(order), delivery] : escrowSchedule(order)
  const settled = schedule.filter((m) => m.state === 'settled').length
  const pct = Math.round((settled / schedule.length) * 100)

  return (
    <div className={cn('rounded-card border border-line bg-white', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
            <Lock size={15} className="text-forest-500" /> {title}
          </h2>
          <p className="mt-0.5 text-[11.5px] text-muted">
            {settled} of {schedule.length} payments made · {pct}% paid
          </p>
        </div>
        <span className="rounded-full border border-forest-100 bg-forest-50 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-forest-600">
          Step by step
        </span>
      </div>

      <div className="px-5 pt-4">
        <Progress value={pct} />
      </div>

      <ol className="divide-y divide-line px-5">
        {schedule.map((m) => (
          <li key={m.key} className="flex gap-3.5 py-4">
            <span
              className={cn(
                'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[11px] font-bold',
                m.state === 'settled' && 'border-forest-500 bg-forest-500 text-white',
                m.state === 'in_progress' && 'border-harvest-300 bg-harvest-50 text-harvest-600',
                m.state === 'unfunded' && 'border-harvest-300 bg-harvest-50 text-harvest-600',
                m.state === 'held' && 'border-line bg-sage-100 text-muted',
                m.state === 'frozen' && 'border-critical-200 bg-critical-50 text-critical-600',
              )}
            >
              {m.state === 'settled' ? <Check size={14} strokeWidth={3} /> : m.index}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">
                    <span className="text-muted">{m.share > 0 ? `${Math.round(m.share * 100)}%` : 'Delivery'}</span> — {m.title}
                  </p>
                  {!compact && <p className="mt-0.5 text-[11.5px] leading-4 text-muted">{m.trigger}</p>}
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-bold text-ink tnum">{money(m.amount)}</p>
                  <div className="mt-1 flex justify-end">
                    <StateBadge state={m.state} label={m.stateLabel} />
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p className="flex items-start gap-2 border-t border-line px-5 py-3 text-[11px] leading-4 text-muted">
        <Snowflake size={13} className="mt-0.5 shrink-0 text-forest-500" />
        If the moisture or weight is outside the agreed limit, the rest of the money stays on hold for review.
      </p>
    </div>
  )
}

export function SettlementTimeline({ order, className }) {
  const arrived = ['delivered', 'completed'].includes(order?.status)
  const steps = [
    { key: 'placed', label: 'Order placed', icon: ShieldCheck, note: order?.created_at },
    { key: 'confirmed', label: 'Farmer confirmed', icon: Check, note: order?.paid_at || order?.updated_at },
    { key: 'transit', label: 'In transit', icon: Truck, note: order?.delivery_date },
    { key: 'delivered', label: 'Delivered', icon: ArrowDownToLine, note: arrived ? (order?.delivery?.actual_delivery_time || order?.updated_at) : null },
  ]
  const activeIndex = arrived ? 3 : order?.status === 'shipped' ? 2 : ['confirmed', 'processing'].includes(order?.status) ? 1 : 0

  return (
    <ol className={cn('grid gap-3 sm:grid-cols-4', className)}>
      {steps.map((step, i) => {
        const done = i <= activeIndex
        return (
          <li
            key={step.key}
            className={cn(
              'rounded-xl border p-3.5',
              done ? 'border-forest-100 bg-forest-50' : 'border-line bg-white',
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'grid h-7 w-7 place-items-center rounded-full',
                  done ? 'bg-forest-500 text-white' : 'bg-sage-100 text-muted',
                )}
              >
                <step.icon size={13} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Step {i + 1}</span>
            </div>
            <p className={cn('mt-2 text-[12.5px] font-semibold', done ? 'text-forest-700' : 'text-ink-soft')}>
              {step.label}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">{step.note ? new Date(step.note).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : 'Pending'}</p>
          </li>
        )
      })}
    </ol>
  )
}
