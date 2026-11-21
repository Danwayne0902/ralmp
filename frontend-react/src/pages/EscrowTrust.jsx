import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, Banknote, Building2, Check, ChevronRight, CircleAlert, ClipboardCheck,
  FileText, Gavel, Landmark, Lock, Scale, ShieldCheck, Snowflake, Sprout, Truck,
  Wallet, Warehouse, Weight,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Callout } from '../components/ui/Card'
import { EscrowLedger, MilestoneSchedule } from '../components/finance/Escrow'
import { produceService } from '../lib/services'
import { money, qtyUnit } from '../lib/format'

const TRANCHE_MODEL = [
  {
    share: '10%',
    title: 'Dispatch advance',
    icon: Truck,
    trigger: 'Pickup weight note',
    body: 'Paid when the transporter sends the pickup weight note. It helps with fuel and driver costs. It is never the full value of the goods.',
  },
  {
    share: '60%',
    title: 'Main payment',
    icon: ClipboardCheck,
    trigger: 'Buyer confirms the goods arrived',
    body: 'Released as soon as the buyer confirms the goods arrived in good order. Until then it stays in escrow.',
  },
  {
    share: '30%',
    title: 'Order closing payment',
    icon: Warehouse,
    trigger: 'Buyer confirms the goods arrived',
    body: 'Released on the same confirmation, right after the main payment. This closes the order and completes the farmer’s money.',
  },
]

const FREEZE = [
  { title: 'Weight difference', body: 'Somebody reports a difference between the pickup weight and the delivery weight.', icon: Weight },
  { title: 'Quality complaint', body: 'The buyer reports that the goods are not as agreed.', icon: CircleAlert },
  { title: 'Missing proof', body: 'No sample, no delivery note, or no receiving slip on record.', icon: FileText },
  { title: 'Open complaint', body: 'There is an open complaint on the order and no decision yet.', icon: Gavel },
]

const CUSTODY = [
  {
    title: 'Held in escrow',
    icon: Landmark,
    body: 'Buyer money is held in escrow against the order. It is released only when the matching proof is in.',
  },
  {
    title: 'Proof before payment',
    icon: ShieldCheck,
    body: 'Money moves only after its proof arrives: pickup by the transporter, checks by our team, or delivery by the buyer.',
  },
  {
    title: 'Written record',
    icon: ClipboardCheck,
    body: 'Every payment, status change and delivery note is saved on the order. That record is used if there is a complaint.',
  },
  {
    title: 'Money back if cancelled',
    icon: Banknote,
    body: 'If an order is cancelled or rejected, the goods stay with the farmer and any money not yet released is put on hold for review.',
  },
]

const FAQ = [
  {
    q: 'When is my money taken?',
    a: 'Only when you pay. Creating an order holds the stock but does not take money. You see the full amount before you approve the payment.',
  },
  {
    q: 'Who can release the escrow?',
    a: 'Each part has its own proof. The transporter marks pickup for the first 10%. The buyer confirming the goods arrived releases the other 90%, in two parts of 60% and 30%. The delivery fee is released after the buyer and the farmer both confirm delivery.',
  },
  {
    q: 'What happens if the goods are not as agreed?',
    a: 'The rest of the money stays on hold. The buyer can accept a lower price, reject the goods, or ask for a neutral review. The full record is kept.',
  },
  {
    q: 'Are there holding fees?',
    a: 'There is no holding fee for now. If that changes, you will see the fee before you pay.',
  },
  {
    q: 'Can a farmer be paid before delivery?',
    a: 'Only the 10% pickup payment, and only after the pickup weight note is uploaded. The rest stays in the account until delivery is confirmed.',
  },
]

function Reveal({ children, delay = 0, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default function EscrowTrust() {
  const [sample, setSample] = useState(null)

  useEffect(() => {
    let active = true
    produceService
      .list({ per_page: 1, sort_by: 'created_at', sort_order: 'desc' })
      .then((res) => {
        if (active) setSample(res.data?.data?.[0] || null)
      })
      .catch(() => {
        if (active) setSample(null)
      })
    return () => {
      active = false
    }
  }, [])

  const sampleValue = sample ? Number(sample.price || 0) * Number(sample.quantity || 0) : 0
  const modelOrder = sampleValue
    ? { subtotal: sampleValue, delivery_fee: 0, total_price: sampleValue, status: 'pending', payment_status: 'pending' }
    : null

  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-forest-900 text-white">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-[0.12]" aria-hidden />
        <div className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-sprout-400/20 blur-3xl" aria-hidden />
        <div className="page-wrap relative py-14 sm:py-20">
          <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <Badge tone="dark" size="md">
                <ShieldCheck size={12} className="text-harvest-300" /> Safe escrow payments
              </Badge>
              <h1 className="mt-5 max-w-[18ch] font-display text-[34px] font-extrabold leading-[1.08] tracking-[-0.03em] text-white sm:text-[46px]">
                Your money moves only when the job is done.
              </h1>
              <p className="mt-4 max-w-xl text-[14px] leading-7 text-forest-100/75">
                We hold the buyer's money in escrow. It is paid out in three parts as each proof is
                uploaded. Never on a phone call. Never on a handshake.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild variant="accent" size="lg">
                  <Link to="/commodities">
                    See what is for sale <ArrowRight size={16} />
                  </Link>
                </Button>
              </div>

              <dl className="mt-9 grid max-w-lg grid-cols-2 gap-x-6 gap-y-4 border-t border-white/15 pt-6 sm:grid-cols-3">
                {[
                  { value: '10 / 60 / 30', label: 'Pay split' },
                  { value: '≤ 1.0%', label: 'Weight allowance' },
                  { value: '3 checks', label: 'Before payment' },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="font-display text-[16px] font-extrabold tracking-tight tnum">{item.value}</dt>
                    <dd className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-forest-300">{item.label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-card border border-forest-700 bg-forest-800/60 p-4 backdrop-blur">
              <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-forest-300">
                {modelOrder ? `Live example · ${money(sampleValue)}` : 'Example split · 10 / 60 / 30'}
              </p>
              {modelOrder ? (
                <MilestoneSchedule order={modelOrder} className="border-0 bg-white shadow-modal" />
              ) : (
                <div className="rounded-card bg-white p-5 text-ink shadow-modal">
                  <p className="font-display text-[15px] font-bold">How the money is split</p>
                  <ul className="mt-3 space-y-2 text-[12.5px] text-muted">
                    <li>10% when the goods leave the farm.</li>
                    <li>90% when the buyer confirms the goods arrived.</li>
                  </ul>
                </div>
              )}
              <p className="px-1 pt-2 text-[10px] leading-4 text-forest-100/55">
                {modelOrder
                  ? `Example from the newest listing: ${qtyUnit(sample.quantity, sample.unit)} of ${sample.commodity_name}. The real split is shown before you pay.`
                  : 'The real split and amounts are shown before you pay.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="page-wrap page-pad">
        <section className="py-12 sm:py-16">
          <Reveal>
            <div className="max-w-2xl">
              <p className="label-caps text-forest-500">How your money is kept safe</p>
              <h2 className="mt-2 font-display text-[27px] font-extrabold leading-9 tracking-[-0.02em] text-ink sm:text-[34px] sm:leading-[42px]">
                Four things that keep your money safe.
              </h2>
              <p className="mt-3 text-[14px] leading-6 text-muted">
                Escrow is not a promise. It is a set of rules that make it very hard for anyone to take the money.
              </p>
            </div>
          </Reveal>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {CUSTODY.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.05}>
                <div className="flex h-full gap-3.5 rounded-card border border-line bg-white p-5 shadow-card">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-forest-50 text-forest-600">
                    <item.icon size={18} />
                  </span>
                  <div>
                    <h3 className="font-display text-[14px] font-bold text-ink">{item.title}</h3>
                    <p className="mt-1 text-[12px] leading-5 text-muted">{item.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="pb-12 sm:pb-16">
          <Reveal>
            <div className="max-w-2xl">
              <p className="label-caps text-forest-500">When money is paid</p>
              <h2 className="mt-2 font-display text-[27px] font-extrabold leading-9 tracking-[-0.02em] text-ink sm:text-[34px] sm:leading-[42px]">
                Three payments. One clear record.
              </h2>
            </div>
          </Reveal>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {TRANCHE_MODEL.map((tranche, index) => (
              <Reveal key={tranche.title} delay={index * 0.06}>
                <div className="relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-white p-5 shadow-card">
                  <div className="flex items-start justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-forest-500 text-white">
                      <tranche.icon size={19} />
                    </span>
                    <span className="font-display text-[28px] font-extrabold tracking-tight text-sage-400 tnum">
                      {tranche.share}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-[15px] font-bold text-ink">{tranche.title}</h3>
                  <p className="mt-1 flex-1 text-[12px] leading-5 text-muted">{tranche.body}</p>
                  <div className="mt-4 rounded-lg border border-forest-100 bg-forest-50 px-3 py-2">
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-forest-600">Paid when</p>
                    <p className="mt-0.5 text-[11.5px] font-semibold text-forest-700">{tranche.trigger}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="pb-12 sm:pb-16">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
              <h2 className="flex items-center gap-2 font-display text-[17px] font-bold text-ink">
                <Snowflake size={17} className="text-forest-500" /> When payment is paused
              </h2>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                Any one of these can pause the rest of the money. It is not a punishment. It is a pause until the record is complete.
              </p>
              <ul className="mt-5 space-y-3">
                {FREEZE.map((item) => (
                  <li key={item.title} className="flex gap-3 rounded-xl border border-line bg-canvas p-3.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-forest-600">
                      <item.icon size={15} />
                    </span>
                    <div>
                      <p className="text-[12.5px] font-semibold text-ink">{item.title}</p>
                      <p className="mt-0.5 text-[11px] leading-4 text-muted">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              {modelOrder && (
                <div className="rounded-card border border-line bg-white shadow-card">
                  <div className="flex items-center justify-between border-b border-line px-5 py-4">
                    <div>
                      <h2 className="font-display text-[15px] font-bold text-ink">Live example</h2>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {money(sampleValue)} · {qtyUnit(sample.quantity, sample.unit)} of {sample.commodity_name}
                      </p>
                    </div>
                    <Badge tone="pending" size="sm">Not paid yet</Badge>
                  </div>
                  <div className="grid gap-4 p-5 sm:grid-cols-2">
                    <EscrowLedger order={modelOrder} showTitle={false} className="border-0" />
                    <div className="rounded-xl border border-forest-100 bg-forest-50 p-4">
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-forest-600">How to read it</p>
                      <ul className="mt-2 space-y-2 text-[11px] leading-5 text-forest-700/80">
                        <li className="flex gap-1.5"><Check size={11} className="mt-0.5 shrink-0" /> The produce price is paid first.</li>
                        <li className="flex gap-1.5"><Check size={11} className="mt-0.5 shrink-0" /> Delivery money is kept in the same account.</li>
                        <li className="flex gap-1.5"><Check size={11} className="mt-0.5 shrink-0" /> No holding fee is charged for now.</li>
                        <li className="flex gap-1.5"><Check size={11} className="mt-0.5 shrink-0" /> Each part is a share of the total.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <Callout tone="gold" icon={Scale} title="A neutral review is the backstop">
                If the two sides really disagree about the weight or the sample, the order goes to a neutral review.
                Our team then follows the decision and moves the money as ordered.
              </Callout>
            </div>
          </div>
        </section>

        <section className="pb-12 sm:pb-16">
          <div className="max-w-2xl">
            <p className="label-caps text-forest-500">Common questions</p>
            <h2 className="mt-2 font-display text-[27px] font-extrabold leading-9 tracking-[-0.02em] text-ink sm:text-[32px] sm:leading-[40px]">
              Simple answers about your money.
            </h2>
          </div>
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            {FAQ.map((item) => (
              <div key={item.q} className="rounded-card border border-line bg-white p-5">
                <p className="font-display text-[13.5px] font-bold text-ink">{item.q}</p>
                <p className="mt-1.5 text-[12px] leading-6 text-muted">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-14 sm:pb-20">
          <div className="overflow-hidden rounded-card border border-forest-200 bg-white shadow-card">
            <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
              <div className="p-7 sm:p-10">
                <p className="label-caps text-harvest-600">Trade safely</p>
                <h2 className="mt-2 max-w-lg font-display text-[26px] font-extrabold leading-8 tracking-[-0.02em] text-ink sm:text-[32px] sm:leading-[40px]">
                  Create an account and start trading.
                </h2>
                <p className="mt-3 max-w-xl text-[13px] leading-6 text-muted">
                  Buyers pay into escrow. Farmers list at the farm. Transporters move goods that are already paid for. Everyone uses the same system.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link to="/register">Create an account <ArrowRight size={16} /></Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/commodities">See what is for sale</Link>
                  </Button>
                </div>
              </div>
              <div className="flex flex-col justify-center gap-4 border-t border-line bg-forest-500 p-7 text-white lg:border-l lg:border-t-0 sm:p-9">
                {[
                  { icon: Building2, label: 'Buyers', text: 'Pay once, release step by step' },
                  { icon: Sprout, label: 'Farmers', text: 'Sell knowing the money is there' },
                  { icon: Truck, label: 'Carriers', text: 'Move goods that are already paid for' },
                  { icon: Wallet, label: 'Payment', text: 'Fast bank transfers' },
                ].map((row) => (
                  <div key={row.label} className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/12 text-harvest-300">
                      <row.icon size={16} />
                    </span>
                    <div>
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-forest-100/70">{row.label}</p>
                      <p className="mt-0.5 text-[12.5px] font-semibold">{row.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
            <p className="flex items-center gap-2 text-[11px] text-muted">
              <Lock size={13} className="text-forest-500" />
              Your money is kept in a safe account by our team
            </p>
            <Link to="/settlements" className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-forest-600 hover:underline">
              See payments <ChevronRight size={12} />
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
