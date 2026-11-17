export const ORDER_STATUSES = [
  { value: '', label: 'All orders' },
  { value: 'pending', label: 'Waiting' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Being prepared' },
  { value: 'shipped', label: 'On the way' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Finished' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
]

export const STATUS_META = {
  pending: { label: 'Waiting', tone: 'pending', step: 0 },
  accepted: { label: 'Accepted', tone: 'verified', step: 1 },
  confirmed: { label: 'Confirmed', tone: 'verified', step: 1 },
  processing: { label: 'Being prepared', tone: 'pending', step: 1 },
  shipped: { label: 'On the way', tone: 'transit', step: 2 },
  delivered: { label: 'Delivered', tone: 'delivered', step: 3 },
  completed: { label: 'Finished', tone: 'delivered', step: 3 },
  cancelled: { label: 'Cancelled', tone: 'critical', step: 0 },
  rejected: { label: 'Rejected', tone: 'critical', step: 0 },
}

export function statusMeta(status) {
  return STATUS_META[status] || { label: status || 'Unknown', tone: 'neutral', step: 0 }
}

export const TRANCHE_SPLIT = [
  {
    key: 't1',
    index: 'M1',
    share: 0.1,
    title: 'First payment at pickup',
    short: 'Pickup payment',
    trigger: 'Pickup weight note and a signed delivery note.',
  },
  {
    key: 't2',
    index: 'M2',
    share: 0.6,
    title: 'Second payment after checks',
    short: 'Weight and quality',
    trigger: 'Weight within 1.0% and moisture within the agreed range.',
  },
  {
    key: 't3',
    index: 'M3',
    share: 0.3,
    title: 'Final payment on delivery',
    short: 'Final payment',
    trigger: 'The buyer signs that the goods arrived.',
  },
]

// Escrow state follows evidence, not optimism: a tranche is only "settled" once the
// order has reached the milestone that releases it. Funding alone never releases money.
export function escrowSchedule(order) {
  if (!order) return []
  const total = Number(order.total_price ?? order.total_amount ?? 0)
  const status = order.status
  const paid = order.payment_status === 'paid'
  const dispatched = ['shipped', 'delivered', 'completed'].includes(status)
  const arrived = ['delivered', 'completed'].includes(status)
  const accepted = status === 'completed'

  return TRANCHE_SPLIT.map((tranche) => {
    let state = 'held'
    let stateLabel

    if (status === 'cancelled' || status === 'rejected') {
      state = 'frozen'
    } else if (!paid) {
      state = 'unfunded'
    } else if (tranche.key === 't1') {
      if (dispatched) state = 'settled'
      else {
        state = 'in_progress'
        stateLabel = 'Waiting for delivery note'
      }
    } else if (tranche.key === 't2') {
      if (arrived) state = 'settled'
      else if (dispatched) {
        state = 'in_progress'
        stateLabel = 'Waiting for weight check'
      }
    } else if (tranche.key === 't3') {
      if (accepted) state = 'settled'
      else if (arrived) {
        state = 'in_progress'
        stateLabel = 'Waiting for buyer sign-off'
      }
    }

    return {
      ...tranche,
      amount: Math.round(total * tranche.share),
      state,
      stateLabel,
    }
  })
}

export function escrowReleased(order) {
  return escrowSchedule(order)
    .filter((t) => t.state === 'settled')
    .reduce((sum, t) => sum + t.amount, 0)
}

export const TRANCHE_STATE_META = {
  settled: { label: 'Paid', tone: 'verified' },
  in_progress: { label: 'Waiting for proof', tone: 'pending' },
  unfunded: { label: 'Not paid yet', tone: 'pending' },
  held: { label: 'Held safely', tone: 'neutral' },
  frozen: { label: 'On hold', tone: 'critical' },
}

export const TIMELINE_STEPS = [
  { key: 'placed', label: 'Order placed', note: 'Buyer pays into escrow' },
  { key: 'confirmed', label: 'Farmer accepts', note: 'Produce reserved for the buyer' },
  { key: 'shipped', label: 'On the way', note: 'Transporter sends the delivery note' },
  { key: 'delivered', label: 'Delivered', note: 'Buyer signs and the rest is paid' },
]
