import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Banknote, BadgeCheck, CheckCircle2, CircleAlert, Clock3, Download, KeyRound,
  Landmark, Lock, RefreshCw, Send, ShieldCheck, Snowflake, Wallet,
} from 'lucide-react'
import { PageHeader, Stat, Table, Th, Td, Tr, EmptyState, Skeleton, Progress } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Overlay'
import { adminService, escrowService, orderService, paymentService, payoutService } from '../lib/services'
import { escrowSchedule, escrowReleasedAll, escrowHeldAll, TRANCHE_SPLIT } from '../lib/orders'
import { fmtDate, fmtDateTime, money } from '../lib/format'
import { downloadCsv, parseError } from '../lib/utils'
import { useAuth } from '../store/auth'
import { toast } from 'sonner'

const MILESTONE_LABELS = {
  pickup: 'Pickup payment',
  quality: 'Main payment',
  final: 'Final payment',
  delivery: 'Delivery payment',
}

function milestoneLabel(release) {
  return MILESTONE_LABELS[release.milestone] || release.label || 'Payment'
}

function waitingOn(release) {
  if (release.milestone === 'delivery') return 'Waiting for the buyer and the farmer to confirm delivery'
  if (release.milestone === 'pickup') return 'Waiting for the driver to send the pickup note'
  return 'Waiting for the buyer to confirm the goods arrived'
}

function payoutState(payout) {
  if (!payout) return { label: 'No payout yet', tone: 'neutral' }
  if (payout.status === 'paid') return { label: 'Paid', tone: 'verified' }
  if (['sending', 'pending', 'otp'].includes(payout.transfer_status)) return { label: 'Sending', tone: 'pending' }
  return { label: 'Ready to send', tone: 'pending' }
}

export default function Settlements() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('orders')
  const [pendingReleases, setPendingReleases] = useState([])
  const [upcomingReleases, setUpcomingReleases] = useState([])
  const [recentReleases, setRecentReleases] = useState([])
  const [pendingPayouts, setPendingPayouts] = useState([])
  const [acting, setActing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [otpFor, setOtpFor] = useState(null)
  const [otp, setOtp] = useState('')
  const [fees, setFees] = useState(null)
  const isAdmin = user?.role === 'admin'

  async function load() {
    setLoading(true)
    try {
      const [orderRes, paymentRes, releasesRes, payoutsRes, feesRes] = await Promise.all([
        orderService.list({ per_page: 100 }),
        paymentService.history().catch(() => ({ data: { payments: [] } })),
        isAdmin
          ? escrowService.pending().catch(() => ({ data: { releases: [], upcoming: [], recent: [] } }))
          : Promise.resolve({ data: { releases: [], upcoming: [], recent: [] } }),
        isAdmin
          ? payoutService.list({ status: 'pending', per_page: 50 }).catch(() => ({ data: { data: [] } }))
          : Promise.resolve({ data: { data: [] } }),
        isAdmin
          ? adminService.fees().catch(() => ({ data: null }))
          : Promise.resolve({ data: null }),
      ])
      setOrders(orderRes.data?.data || [])
      setPayments(paymentRes.data?.payments || [])
      setPendingReleases(releasesRes.data?.releases || [])
      setUpcomingReleases(releasesRes.data?.upcoming || [])
      setRecentReleases(releasesRes.data?.recent || [])
      setPendingPayouts(payoutsRes.data?.data || [])
      setFees(feesRes.data || null)
      setError('')
    } catch (err) {
      setError(parseError(err))
    } finally {
      setLoading(false)
    }
  }

  async function releasePayment(release) {
    setActing(release.id)
    try {
      await escrowService.release(release.id, 'Signed off in the payments desk.')
      const who = release.payee?.name || release.order?.farmer?.name || 'the payee'
      toast.success(`${money(release.net_amount ?? release.amount)} released to ${who}`, {
        description: `Order #${release.order_id}. It is now ready for the bank transfer.`,
      })
      setConfirm(null)
      await load()
    } catch (err) {
      toast.error('The payment was not released', { description: parseError(err) })
    } finally {
      setActing(null)
    }
  }

  async function sendPayout(payout) {
    setActing(payout.id)
    try {
      const res = await payoutService.send(payout.id)
      if (res.data?.needs_otp) {
        setOtpFor(payout.id)
        setOtp('')
        toast.info(res.data.message)
      } else {
        toast.success(`Bank transfer started for ${payout.user?.name || 'the payee'}`, {
          description: `${money(payout.amount)} is on its way. It is marked paid when the bank confirms.`,
        })
      }
      setConfirm(null)
      await load()
    } catch (err) {
      toast.error('The bank transfer was not started', { description: parseError(err) })
      await load()
    } finally {
      setActing(null)
    }
  }

  async function finishTransfer() {
    if (!otpFor || otp.trim().length < 4) {
      toast.error('Enter the code Paystack sent to the business phone.')
      return
    }
    setActing(otpFor)
    try {
      const res = await payoutService.finalizeOtp(otpFor, otp.trim())
      toast.success(res.data?.message || 'Transfer finished')
      setOtpFor(null)
      setOtp('')
      await load()
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setActing(null)
    }
  }

  async function markPayoutSent(payout) {
    setActing(payout.id)
    try {
      await payoutService.markPaid(payout.id, 'Paid outside Paystack and confirmed by the payments desk.')
      toast.success(`${money(payout.amount)} marked as paid to ${payout.user?.name || 'the payee'}`, {
        description: 'This was a manual confirmation. No Paystack transfer was started.',
      })
      setConfirm(null)
      await load()
    } catch (err) {
      toast.error('The payout was not marked paid', { description: parseError(err) })
    } finally {
      setActing(null)
    }
  }

  function runConfirm() {
    if (!confirm) return
    if (confirm.kind === 'release') return releasePayment(confirm.release)
    if (confirm.kind === 'send') return sendPayout(confirm.payout)
    if (confirm.kind === 'paid') return markPayoutSent(confirm.payout)
  }

  const confirmDetails = (() => {
    if (!confirm) return null

    if (confirm.kind === 'release') {
      const release = confirm.release
      const who = release.payee?.name || release.order?.farmer?.name || 'the payee'
      const net = release.net_amount ?? release.amount
      const fee = Math.max(0, Number(release.amount || 0) - Number(net || 0))
      return {
        title: 'Release this money?',
        description: `You are about to sign off ${money(net)} to ${who} for order #${release.order_id}.`,
        lines: [
          ['Payment part', milestoneLabel(release)],
          ['Released from escrow', money(release.amount)],
          ...(fee > 0 ? [['Platform fee', `− ${money(fee)}`]] : []),
          ['Payee receives', money(net)],
        ],
        warning: 'This moves the money out of escrow and creates a payout. It cannot be undone from this screen.',
        confirmLabel: 'Yes, release the money',
        danger: false,
      }
    }

    const payout = confirm.payout
    const name = payout.user?.name || 'this payee'
    const bankName = payout.bank_name || payout.user?.bank_name
    const account = payout.account_number || payout.user?.account_number
    const masked = account ? `****${String(account).slice(-4)}` : null

    if (confirm.kind === 'send') {
      return {
        title: 'Send this money?',
        description: `A bank transfer of ${money(payout.amount)} will go to ${name}.`,
        lines: [
          ['Payee', name],
          ['Bank', bankName || 'No bank on file'],
          ['Account', masked || 'No account number on file'],
          ['Amount', money(payout.amount)],
        ],
        warning: masked
          ? 'Paystack starts the transfer. The payout is marked paid only when the bank confirms it.'
          : 'This payee has no bank details on file, so the transfer will fail until they add them.',
        confirmLabel: 'Yes, send the money',
        danger: false,
      }
    }

    return {
      title: 'Mark this payout as paid?',
      description: `This records ${money(payout.amount)} as sent to ${name} outside Paystack.`,
      lines: [
        ['Payee', name],
        ['Amount', money(payout.amount)],
        ['Method', 'Manual bank transfer'],
      ],
      warning: 'Only do this if you have proof the money reached the payee. Their screen will show it as paid.',
      confirmLabel: 'Yes, mark it paid',
      danger: true,
    }
  })()

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totals = useMemo(() => {
    const active = orders.filter((order) => !['cancelled', 'rejected'].includes(order.status))
    const committed = active.reduce((sum, order) => sum + Number(order.total_price || 0), 0)
    const released = active.reduce((sum, order) => sum + escrowReleasedAll(order), 0)
    const held = active.reduce((sum, order) => sum + escrowHeldAll(order), 0)
    const frozen = orders
      .filter((order) => ['cancelled', 'rejected'].includes(order.status))
      .reduce((sum, order) => sum + escrowHeldAll(order), 0)
    return { committed, released, held, frozen, activeCount: active.length }
  }, [orders])

  const trancheSummary = useMemo(
    () =>
      TRANCHE_SPLIT.map((tranche) => {
        let settled = 0
        let held = 0
        orders.forEach((order) => {
          const row = escrowSchedule(order).find((item) => item.key === tranche.key)
          if (!row) return
          if (row.state === 'settled') settled += row.amount
          else if (row.state === 'held' || row.state === 'in_progress') held += row.amount
        })
        return { ...tranche, settled, held }
      }),
    [orders],
  )

  function exportLedger() {
    const rows = orders.map((order) => ({
      order_id: order.id,
      date: order.order_date || order.created_at,
      farmer: order.farmer?.name || '',
      commodity: order.produce?.commodity_name || order.items?.[0]?.produce?.commodity_name || '',
      total: order.total_price,
      payment_status: order.payment_status,
      reference: order.payment_reference || '',
      status: order.status,
      released: escrowReleasedAll(order),
    }))
    downloadCsv(`ralmp-settlement-ledger-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="Payments"
        title="Payments and escrow"
        description="Every naira you paid, where it is, and what released it."
        actions={
          <>
            <Button variant="outline" size="md" onClick={load} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </Button>
            <Button variant="outline" size="md" onClick={exportLedger} disabled={!orders.length}>
              <Download size={15} /> Export CSV
            </Button>
          </>
        }
      />

      {error && (
        <p className="mb-4 rounded-card border border-critical-200 bg-critical-50 px-4 py-3 text-[12.5px] text-critical-600">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[108px] rounded-card" />)
        ) : (
          <>
            <Stat icon={Wallet} label="Order value" value={money(totals.committed)} hint={`${totals.activeCount} ${totals.activeCount === 1 ? 'active order' : 'active orders'}`} size="lg" />
            <Stat icon={Landmark} label="Still in escrow" value={money(totals.held)} tone="gold" hint="Paid but not released" size="lg" />
            <Stat icon={CheckCircle2} label="Released from escrow" value={money(totals.released)} tone="sprout" hint="Paid to farmers and transporters" size="lg" />
            <Stat icon={Snowflake} label="On hold / returned" value={money(totals.frozen)} tone={totals.frozen > 0 ? 'critical' : 'neutral'} hint="Cancelled or rejected orders" size="lg" />
          </>
        )}
      </div>

      {isAdmin && (
        <div className="mt-5 rounded-card border border-line bg-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="font-display text-[15px] font-bold text-ink">Platform fees</h2>
              <p className="mt-0.5 text-[11px] text-muted">
                Money kept by RALMP from released goods and delivery payments.
              </p>
            </div>
            <Badge tone="neutral" size="sm">
              {fees ? `${Number(fees.fee_percent).toLocaleString('en-NG')}% per release` : 'Fee rate loading'}
            </Badge>
          </div>

          {!fees ? (
            <p className="px-5 py-6 text-[12px] text-muted">Could not load the fee record just now.</p>
          ) : (
            <>
              <div className="grid gap-3 p-5 sm:grid-cols-3">
                <div className="rounded-xl border border-forest-200 bg-forest-50/60 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-forest-700/70">Fees earned</p>
                  <p className="mt-1 font-display text-[22px] font-extrabold tracking-tight text-forest-700 tnum">
                    {money(fees.totals?.amount || 0)}
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-muted">
                    From {money(fees.totals?.base || 0)} released
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-canvas p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">This month</p>
                  <p className="mt-1 font-display text-[22px] font-extrabold tracking-tight text-ink tnum">
                    {money(fees.this_month?.amount || 0)}
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-muted">
                    {fees.this_month?.count || 0} {fees.this_month?.count === 1 ? 'release' : 'releases'}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-canvas p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Fee split</p>
                  <dl className="mt-1.5 space-y-1 text-[11px]">
                    {(fees.by_kind || []).length === 0 && <p className="text-muted">Nothing taken yet.</p>}
                    {(fees.by_kind || []).map((row) => (
                      <div key={row.kind} className="flex justify-between gap-2">
                        <dt className="capitalize text-muted">{row.kind}</dt>
                        <dd className="font-semibold text-ink tnum">{money(row.total)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>

              {(fees.recent || []).length > 0 ? (
                <div className="border-t border-line">
                  <Table minWidth={640}>
                    <thead>
                      <tr>
                        <Th>Order</Th>
                        <Th>Paid to</Th>
                        <Th>Kind</Th>
                        <Th className="text-right">Base</Th>
                        <Th className="text-right">Fee kept</Th>
                        <Th>When</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {fees.recent.slice(0, 8).map((fee) => (
                        <Tr key={fee.id}>
                          <Td>
                            <Link to={`/orders/${fee.order_id}`} className="font-semibold text-forest-600 hover:underline">
                              #{fee.order_id}
                            </Link>
                          </Td>
                          <Td>
                            <p className="text-[11.5px]">{fee.payee?.name || 'Member'}</p>
                            <p className="text-[10px] capitalize text-muted">{fee.payee?.role?.replace('_', ' ')}</p>
                          </Td>
                          <Td><Badge tone="neutral" size="sm" className="capitalize">{fee.kind}</Badge></Td>
                          <Td className="text-right tnum">{money(fee.base_amount)}</Td>
                          <Td className="text-right font-semibold text-forest-600 tnum">{money(fee.amount)}</Td>
                          <Td className="text-[10.5px] text-muted">{fmtDateTime(fee.created_at)}</Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <p className="border-t border-line px-5 py-5 text-[11.5px] text-muted">
                  No platform fee has been taken yet. A fee is recorded each time money is released to a farmer or a
                  driver.
                </p>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-5">
          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="font-display text-[15px] font-bold text-ink">{isAdmin ? 'All orders' : 'Your orders'}</h2>
                <p className="mt-0.5 text-[11px] text-muted">All amounts in naira. Each step follows the order record.</p>
              </div>
              <div className="flex rounded-lg border border-line bg-canvas p-0.5">
                {[
                  { value: 'orders', label: 'Orders' },
                  { value: 'payments', label: 'Payments' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTab(item.value)}
                    className={`rounded-md px-3 py-1.5 text-[11.5px] font-semibold transition ${
                      tab === item.value ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : tab === 'orders' ? (
              orders.length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title="No payments yet"
                  description="When you pay for an order, every step will show here."
                  className="border-0 shadow-none"
                  action={<Button asChild><Link to="/commodities">Buy produce</Link></Button>}
                />
              ) : (
                <>
                  <div className="hidden md:block">
                    <Table minWidth={760} className="[&_th]:px-3 [&_td]:px-3">
                      <thead>
                        <tr>
                          <Th>Order</Th>
                          <Th>Farmer</Th>
                          <Th className="text-right">Value</Th>
                          <Th className="text-right">Released</Th>
                          <Th>Held</Th>
                          <Th>Order status</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => {
                          const released = escrowReleasedAll(order)
                          const held = escrowHeldAll(order)
                          const total = Number(order.total_price || 0)
                          const frozen = ['cancelled', 'rejected'].includes(order.status)
                          const moneyState = order.payment_status !== 'paid'
                            ? { label: 'Not paid', tone: 'pending' }
                            : held > 0
                              ? { label: frozen ? 'On hold' : 'Held safely', tone: frozen ? 'critical' : 'verified' }
                              : { label: frozen ? 'Order closed' : 'All released', tone: 'neutral' }
                          return (
                            <Tr key={order.id}>
                              <Td>
                                <Link to={`/orders/${order.id}`} className="font-semibold text-ink hover:text-forest-600">
                                  #{order.id}
                                </Link>
                                <p className="text-[10px] text-muted">{fmtDate(order.order_date || order.created_at)}</p>
                              </Td>
                              <Td className="break-words">{order.farmer?.name || '—'}</Td>
                              <Td className="text-right font-semibold text-ink tnum">{money(total)}</Td>
                              <Td className="text-right text-forest-600 tnum">{money(released)}</Td>
                              <Td>
                                <p className="text-muted tnum">{money(held)}</p>
                                <Badge tone={moneyState.tone} size="sm" className="mt-1">{moneyState.label}</Badge>
                              </Td>
                              <Td><StatusBadge status={order.status} size="sm" /></Td>
                            </Tr>
                          )
                        })}
                      </tbody>
                    </Table>
                  </div>

                  <ul className="divide-y divide-line md:hidden">
                    {orders.map((order) => {
                      const total = Number(order.total_price || 0)
                      const released = escrowReleasedAll(order)
                      const held = escrowHeldAll(order)
                      return (
                        <li key={order.id}>
                          <Link to={`/orders/${order.id}`} className="block px-4 py-3.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[13px] font-bold text-ink">Order #{order.id}</p>
                                <p className="break-words text-[10.5px] text-muted">{order.farmer?.name || 'Farmer'} · {fmtDate(order.order_date)}</p>
                              </div>
                              <StatusBadge status={order.status} size="sm" />
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-2 text-[10.5px]">
                              <div><p className="text-muted">Total</p><p className="font-semibold text-ink tnum">{money(total)}</p></div>
                              <div><p className="text-muted">Paid out</p><p className="font-semibold text-forest-600 tnum">{money(released)}</p></div>
                              <div><p className="text-muted">In escrow</p><p className="font-semibold text-muted tnum">{money(held)}</p></div>
                            </div>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )
            ) : payments.length === 0 ? (
              <EmptyState
                icon={Banknote}
                title="No card or bank payments yet"
                description="Paystack payments will show here after your first order."
                className="border-0 shadow-none"
              />
            ) : (
              <Table minWidth={640}>
                <thead>
                  <tr>
                    <Th>Reference</Th>
                    <Th>Order</Th>
                    <Th className="text-right">Amount</Th>
                    <Th>State</Th>
                    <Th>Paid at</Th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <Tr key={payment.id || payment.reference}>
                      <Td className="font-mono text-[11px]">{payment.reference}</Td>
                      <Td>
                        <Link to={`/orders/${payment.order_id}`} className="font-semibold text-ink hover:text-forest-600">
                          #{payment.order_id}
                        </Link>
                      </Td>
                      <Td className="text-right font-semibold tnum">{money(payment.amount)}</Td>
                      <Td>
                        <Badge tone={payment.status === 'success' ? 'verified' : payment.status === 'pending' ? 'pending' : 'critical'} size="sm">
                          {payment.status}
                        </Badge>
                      </Td>
                      <Td className="text-[11.5px] text-muted">{payment.paid_at ? fmtDateTime(payment.paid_at) : '—'}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>

          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
              <Lock size={15} className="text-forest-500" /> Payment parts
            </h2>
            <p className="mt-0.5 text-[11px] text-muted">Money still in escrow is waiting for the step it belongs to.</p>
            <div className="mt-4 space-y-3">
              {trancheSummary.map((tranche) => {
                const total = tranche.settled + tranche.held
                const pct = total ? Math.round((tranche.settled / total) * 100) : 0
                return (
                  <div key={tranche.key} className="rounded-xl border border-line px-3.5 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[12px] font-semibold text-ink">
                        <span className="text-muted">{tranche.index} · {Math.round(tranche.share * 100)}%</span> {tranche.short}
                      </p>
                      <p className="text-[11.5px] font-bold text-ink tnum">
                        {money(tranche.settled)} <span className="font-normal text-muted">/ {money(total)}</span>
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={pct} />
                      <span className="w-9 shrink-0 text-right text-[10.5px] font-semibold text-muted tnum">{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          {isAdmin && (
            <div className="rounded-card border border-harvest-200 bg-harvest-50/60 p-5 shadow-card">
              <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-harvest-700">
                <CheckCircle2 size={12} /> Waiting for your approval
              </p>
              {pendingReleases.length === 0 ? (
                <p className="mt-2 text-[11.5px] leading-5 text-muted">
                  Nothing is due. Money appears here when the step it waits for is done.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-harvest-200/70">
                  {pendingReleases.slice(0, 5).map((release) => {
                    const net = release.net_amount ?? release.amount
                    const fee = Number(release.amount || 0) - Number(net || 0)
                    return (
                      <li key={release.id} className="py-2.5 first:pt-0">
                        <div className="min-w-0">
                          <p className="break-words text-[11.5px] font-semibold text-ink">
                            Order #{release.order_id} · {milestoneLabel(release)}
                          </p>
                          <p className="break-words text-[10.5px] text-muted">
                            {release.payee?.name || release.order?.farmer?.name || 'Payee'} · {money(net)}
                            {fee > 0.004 && <> after {money(fee)} fee</>}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-1.5"
                          loading={acting === release.id}
                          onClick={() => setConfirm({ kind: 'release', release })}
                        >
                          Review and release
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {upcomingReleases.length > 0 && (
                <p className="mt-2 border-t border-harvest-200/70 pt-2 text-[10.5px] leading-4 text-muted">
                  {upcomingReleases.length} more {upcomingReleases.length === 1 ? 'payment is' : 'payments are'} in
                  escrow but not due yet. See “Not due yet” below.
                </p>
              )}
            </div>
          )}

          {isAdmin && upcomingReleases.length > 0 && (
            <div className="rounded-card border border-line bg-white p-5 shadow-card">
              <p className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
                <Clock3 size={12} /> Not due yet
                <span className="rounded-full bg-canvas px-1.5 py-0.5 text-[9.5px] font-bold tracking-normal text-ink-soft tnum">
                  {upcomingReleases.length}
                </span>
              </p>
              <p className="mt-1 text-[10.5px] leading-4 text-muted">
                These are still in escrow. They cannot be signed off until the step each one waits for is done.
              </p>
              <ul className="mt-2 divide-y divide-line">
                {upcomingReleases.slice(0, 6).map((release) => (
                  <li key={release.id} className="py-2.5 first:pt-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words text-[11.5px] font-semibold text-ink">
                          Order #{release.order_id} · {milestoneLabel(release)}
                        </p>
                        <p className="break-words text-[10.5px] text-muted">
                          {release.payee?.name || release.order?.farmer?.name || 'Payee'} · {money(release.net_amount ?? release.amount)}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-4 text-muted">{waitingOn(release)}</p>
                      </div>
                      <Badge tone="neutral" size="sm" className="shrink-0">Not due</Badge>
                    </div>
                  </li>
                ))}
              </ul>
              {upcomingReleases.length > 6 && (
                <p className="mt-2 text-[10px] text-muted">and {upcomingReleases.length - 6} more.</p>
              )}
            </div>
          )}

          {isAdmin && (
            <div className="rounded-card border border-line bg-white p-5 shadow-card">
              <p className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
                <Banknote size={12} /> Payouts to send
                {pendingPayouts.length > 0 && (
                  <span className="rounded-full bg-canvas px-1.5 py-0.5 text-[9.5px] font-bold tracking-normal text-ink-soft tnum">
                    {pendingPayouts.length} waiting
                  </span>
                )}
              </p>
              {pendingPayouts.length === 0 ? (
                <p className="mt-2 text-[11.5px] leading-5 text-muted">No payout is waiting for a bank transfer.</p>
              ) : (
                <ul className="mt-2 max-h-[26rem] divide-y divide-line overflow-y-auto">
                  {pendingPayouts.map((payout) => {
                    const bankName = payout.bank_name || payout.user?.bank_name
                    const account = payout.account_number || payout.user?.account_number
                    // A transfer paused for a one-time code needs the code, not another send.
                    const needsCode = payout.transfer_status === 'otp'
                    const onTheWay = ['sending', 'pending'].includes(payout.transfer_status)
                    return (
                      <li key={payout.id} className="py-2.5 first:pt-0">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="break-words text-[11.5px] font-semibold text-ink">
                              {payout.user?.name || 'Payee'} · {money(payout.amount)}
                            </p>
                            <p className="break-all font-mono text-[9.5px] text-muted">{payout.reference}</p>
                            <p className={account ? 'text-[10.5px] text-muted' : 'text-[10.5px] font-semibold text-harvest-600'}>
                              {account
                                ? `${bankName || 'Bank'} · ****${String(account).slice(-4)}`
                                : 'No bank details yet'}
                            </p>
                            {payout.failure_reason && (
                              <p className="mt-0.5 text-[10px] leading-4 text-critical-600">
                                {payout.failure_reason}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 sm:flex-col sm:items-end sm:gap-y-1">
                            {needsCode ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setOtpFor(payout.id); setOtp('') }}
                              >
                                <KeyRound size={12} /> Enter code
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                loading={acting === payout.id}
                                disabled={onTheWay}
                                onClick={() => setConfirm({ kind: 'send', payout })}
                              >
                                {!acting || acting !== payout.id ? <Send size={12} /> : null}
                                {onTheWay ? 'Sending…' : 'Send money'}
                              </Button>
                            )}
                            <button
                              type="button"
                              className="text-[9.5px] font-semibold text-muted underline underline-offset-2 hover:text-ink"
                              onClick={() => setConfirm({ kind: 'paid', payout })}
                              disabled={acting === payout.id}
                            >
                              Already paid outside Paystack
                            </button>
                          </div>
                        </div>

                        {otpFor === payout.id && (
                          <div className="mt-2 rounded-lg border border-harvest-200 bg-harvest-50 p-2.5">
                            <p className="text-[10.5px] leading-4 text-harvest-600">
                              Paystack sent a one-time code to the business phone. Enter it to finish this transfer.
                            </p>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <input
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                inputMode="numeric"
                                className="h-8 min-w-0 flex-1 rounded-lg border border-sage-300 bg-white px-2 text-[12px] tnum"
                                placeholder="One-time code"
                              />
                              <Button size="sm" loading={acting === payout.id} onClick={finishTransfer}>
                                Finish
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setOtpFor(null); setOtp('') }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          {isAdmin && recentReleases.length > 0 && (
            <div className="rounded-card border border-line bg-white p-5 shadow-card">
              <p className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
                <BadgeCheck size={12} /> Recently released
                <span className="rounded-full bg-canvas px-1.5 py-0.5 text-[9.5px] font-bold tracking-normal text-ink-soft tnum">
                  {recentReleases.length}
                </span>
              </p>
              <p className="mt-1 text-[10.5px] leading-4 text-muted">
                Signed-off payments stay here, including how their bank transfer is going.
              </p>
              <ul className="mt-2 divide-y divide-line">
                {recentReleases.map((release) => {
                  const state = payoutState(release.payout)
                  return (
                    <li key={release.id} className="py-2.5 first:pt-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="break-words text-[11.5px] font-semibold text-ink">
                            Order #{release.order_id} · {milestoneLabel(release)}
                          </p>
                          <p className="break-words text-[10.5px] text-muted">
                            {release.payee?.name || release.order?.farmer?.name || 'Payee'} ·{' '}
                            {money(release.payout?.amount ?? release.net_amount ?? release.amount)}
                          </p>
                          <p className="text-[10px] text-muted">{fmtDateTime(release.released_at)}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge tone="verified" size="sm">Released</Badge>
                          <Badge tone={state.tone} size="sm">{state.label}</Badge>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
              <Landmark size={12} /> Where your money sits
            </p>
            <p className="mt-2 text-[12px] leading-5 text-ink-soft/80">
              Every payment is recorded against the order and stays inside escrow until its step is proven. Payouts go to the payee's saved bank account through Paystack, and the bank confirms each transfer before it is marked sent.
            </p>
            <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-[11.5px]">
              <div className="flex justify-between"><dt className="text-muted">Money held in</dt><dd className="font-semibold text-ink">RALMP escrow account</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Paid through</dt><dd className="font-semibold text-ink">Bank transfer</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Holding fee</dt><dd className="font-semibold text-forest-600">No charge</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Money released by</dt><dd className="font-semibold text-ink">Delivery proof</dd></div>
            </dl>
          </div>

          <div className="rounded-card border border-forest-100 bg-forest-50 p-4">
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-forest-700">
              <ShieldCheck size={13} /> When payment pauses
            </p>
            <ul className="mt-2 space-y-2 text-[11px] leading-5 text-forest-700/80">
              <li>The weight on arrival is more than 1.0% off</li>
              <li>Moisture outside the agreed range</li>
              <li>Buyer has not signed for the goods</li>
              <li>There is an open complaint</li>
            </ul>
          </div>

          <div className="rounded-card border border-line bg-white p-4">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
              <Clock3 size={12} /> Pending action
            </p>
            {orders.filter((order) => order.payment_status !== 'paid' && !['cancelled', 'rejected'].includes(order.status)).length === 0 ? (
              <p className="mt-2 text-[11.5px] leading-5 text-muted">Every active order is fully paid.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {orders
                  .filter((order) => order.payment_status !== 'paid' && !['cancelled', 'rejected'].includes(order.status))
                  .slice(0, 4)
                  .map((order) => (
                    <li key={order.id} className="flex items-center justify-between gap-2 py-2 first:pt-0">
                      <div className="min-w-0">
                        <p className="break-words text-[11.5px] font-semibold text-ink">Order #{order.id}</p>
                        <p className="text-[10px] text-muted">{fmtDate(order.delivery_date)}</p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/payment/${order.id}`}>Fund</Link>
                      </Button>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <Modal
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open && !acting) setConfirm(null)
        }}
        title={confirmDetails?.title}
        description={confirmDetails?.description}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)} disabled={Boolean(acting)}>
              Cancel
            </Button>
            <Button
              variant={confirmDetails?.danger ? 'danger' : 'primary'}
              loading={Boolean(acting)}
              onClick={runConfirm}
            >
              {confirmDetails?.confirmLabel || 'Continue'}
            </Button>
          </>
        }
      >
        {confirmDetails && (
          <div className="space-y-4">
            <dl className="divide-y divide-line rounded-xl border border-line">
              {confirmDetails.lines.map(([label, value]) => (
                <div key={label} className="flex flex-wrap items-baseline justify-between gap-2 px-3.5 py-2.5">
                  <dt className="text-[11.5px] text-muted">{label}</dt>
                  <dd className="break-words text-right text-[12px] font-semibold text-ink tnum">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex gap-2 rounded-xl border border-harvest-200 bg-harvest-50/70 px-3.5 py-3">
              <CircleAlert size={15} className="mt-0.5 shrink-0 text-harvest-700" />
              <p className="text-[11.5px] leading-5 text-harvest-700">{confirmDetails.warning}</p>
            </div>
            <p className="text-[10.5px] leading-4 text-muted">
              You can close this window without changing anything.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
