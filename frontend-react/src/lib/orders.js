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

const RELEASE_BY_TRANCHE = { t1: 'pickup', t2: 'quality', t3: 'final' }

// The platform keeps a slice of every payment part. The rate comes with the
// escrow rows; this is only the fallback for orders with no escrow yet.
export const DEFAULT_FEE_PERCENT = 5

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

export function escrowFeePercent(order) {
  if (!order) return DEFAULT_FEE_PERCENT
  const releases = Array.isArray(order.escrow?.releases) ? order.escrow.releases : []
  const withRate = releases.find((row) => row?.fee_percent != null && Number(row.fee_percent) > 0)
  if (withRate) return Number(withRate.fee_percent)
  return Number(order.fee_percent ?? DEFAULT_FEE_PERCENT)
}

// Gross escrow amount in, money the payee actually receives out.
export function escrowNet(amount, rate, release) {
  const gross = Number(amount) || 0
  if (release?.net_amount != null) return Number(release.net_amount)
  return round2(gross - (gross * (Number(rate) || 0)) / 100)
}

function releaseState(release) {
  if (!release) return { state: 'held', stateLabel: 'Not set up yet' }
  if (release.status === 'released') {
    return {
      state: 'settled',
      stateLabel: release.payout?.status === 'paid' ? 'Sent to you' : 'Ready to send',
    }
  }
  if (release.status === 'held' || release.status === 'cancelled') {
    return { state: 'frozen', stateLabel: release.status === 'cancelled' ? 'Not paid' : 'On hold' }
  }
  return { state: 'in_progress', stateLabel: release.trigger || 'Waiting for proof' }
}

// Escrow state follows evidence, not optimism. When the API has a real escrow
// schedule we use it; otherwise the order status is only a display fallback.
export function escrowSchedule(order) {
  if (!order) return []
  const total = Number(order.total_price ?? order.total_amount ?? 0)
  const base = Number(order.subtotal ?? 0) > 0 ? Number(order.subtotal) : total
  const releases = Array.isArray(order.escrow?.releases) ? order.escrow.releases : []
  const rate = escrowFeePercent(order)

  if (releases.length > 0) {
    return TRANCHE_SPLIT.map((tranche) => {
      const release = releases.find((row) => row.milestone === RELEASE_BY_TRANCHE[tranche.key])
      const state = releaseState(release)
      const amount = release ? Number(release.amount) : Math.round(base * tranche.share)
      const net = escrowNet(amount, rate, release)
      return {
        ...tranche,
        amount,
        net,
        fee: round2(amount - net),
        ...state,
        release,
      }
    })
  }

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

    const amount = Math.round(base * tranche.share)
    const net = escrowNet(amount, rate)

    return {
      ...tranche,
      amount,
      net,
      fee: round2(amount - net),
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

export function escrowHeld(order) {
  return escrowSchedule(order)
    .filter((t) => t.state === 'held' || t.state === 'in_progress')
    .reduce((sum, t) => sum + t.amount, 0)
}

export function escrowBase(order) {
  if (!order) return 0
  const subtotal = Number(order.subtotal ?? 0)
  return subtotal > 0 ? subtotal : Number(order.total_price ?? 0)
}

// What is left for the payee once the platform fee is taken off each part.
// Use these wherever the farmer or the driver is looking at the figures.
export function escrowReleasedNet(order) {
  return round2(
    escrowSchedule(order)
      .filter((t) => t.state === 'settled')
      .reduce((sum, t) => sum + t.net, 0),
  )
}

export function escrowHeldNet(order) {
  return round2(
    escrowSchedule(order)
      .filter((t) => t.state === 'held' || t.state === 'in_progress')
      .reduce((sum, t) => sum + t.net, 0),
  )
}

export function escrowNetBase(order) {
  return round2(escrowSchedule(order).reduce((sum, t) => sum + t.net, 0))
}

// Whole-order money movement, including the delivery payment. The 10/60/30
// schedule above covers the farmer only; these helpers are for the payments
// desk, where every part of the order matters.
export function escrowReleasedAll(order) {
  const releases = order?.escrow?.releases
  if (Array.isArray(releases) && releases.length > 0) {
    return releases
      .filter((release) => release.status === 'released')
      .reduce((sum, release) => sum + Number(release.amount || 0), 0)
  }
  return escrowReleased(order)
}

export function escrowHeldAll(order) {
  const releases = order?.escrow?.releases
  if (Array.isArray(releases) && releases.length > 0) {
    return releases
      .filter((release) => ['pending', 'held'].includes(release.status))
      .reduce((sum, release) => sum + Number(release.amount || 0), 0)
  }
  return escrowHeld(order)
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
