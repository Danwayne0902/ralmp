export const ORDER_STATUSES = [
  { value: '', label: 'All orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'In transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
]

export const STATUS_META = {
  pending: { label: 'Pending', tone: 'pending', step: 0 },
  accepted: { label: 'Accepted', tone: 'verified', step: 1 },
  confirmed: { label: 'Confirmed', tone: 'verified', step: 1 },
  processing: { label: 'Processing', tone: 'pending', step: 1 },
  shipped: { label: 'In transit', tone: 'transit', step: 2 },
  delivered: { label: 'Delivered', tone: 'delivered', step: 3 },
  completed: { label: 'Completed', tone: 'delivered', step: 3 },
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
    title: 'Escrow vault allocation & dispatch advance',
    short: 'Dispatch advance',
    trigger: 'Origin weighbridge tare-gross slip and signed carrier e-Waybill.',
  },
  {
    key: 't2',
    index: 'M2',
    share: 0.6,
    title: 'Destination weighbridge gate-in & lab sign-off',
    short: 'Weighbridge & lab',
    trigger: 'Automated gross-tare check (≤1.0% variance) and moisture assay within tolerance.',
  },
  {
    key: 't3',
    index: 'M3',
    share: 0.3,
    title: 'Silo discharge & final buyer acceptance',
    short: 'Final acceptance',
    trigger: 'Digitally signed silo receiving receipt from the buyer procurement officer.',
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
        stateLabel = 'Awaiting waybill'
      }
    } else if (tranche.key === 't2') {
      if (arrived) state = 'settled'
      else if (dispatched) {
        state = 'in_progress'
        stateLabel = 'Awaiting weighbridge'
      }
    } else if (tranche.key === 't3') {
      if (accepted) state = 'settled'
      else if (arrived) {
        state = 'in_progress'
        stateLabel = 'Awaiting silo acceptance'
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
  settled: { label: 'Settled', tone: 'verified' },
  in_progress: { label: 'Awaiting sign-off', tone: 'pending' },
  unfunded: { label: 'Awaiting funding', tone: 'pending' },
  held: { label: 'Locked in escrow', tone: 'neutral' },
  frozen: { label: 'Frozen', tone: 'critical' },
}

export const TIMELINE_STEPS = [
  { key: 'placed', label: 'Order placed', note: 'Buyer commits funds to escrow' },
  { key: 'confirmed', label: 'Farmer confirmed', note: 'Lot reserved and graded' },
  { key: 'shipped', label: 'In transit', note: 'Carrier e-Waybill issued' },
  { key: 'delivered', label: 'Delivered & settled', note: 'Silo sign-off releases balance' },
]
