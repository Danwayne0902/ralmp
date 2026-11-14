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

const TRANCHE_MODEL = [
  {
    share: '10%',
    title: 'Dispatch advance',
    icon: Truck,
    trigger: 'Origin weighbridge slip',
    body: 'Released when the carrier files the gross–tare slip at the farm gate. It funds fuel and driver mobilisation — never the full cargo value.',
  },
  {
    share: '60%',
    title: 'Weighbridge & assay',
    icon: Weight,
    trigger: 'Destination weight and lab pass',
    body: 'Released only when destination gross–tare reconciles to origin within 1.0% and the sealed sample passes the contracted moisture and aflatoxin band.',
  },
  {
    share: '30%',
    title: 'Silo acceptance',
    icon: Warehouse,
    trigger: 'Buyer receiving receipt',
    body: 'Released on the buyer’s signed silo receiving receipt. This closes the order and completes the grower’s payout.',
  },
]

const FREEZE = [
  { title: 'Weight variance', body: 'Destination gross–tare diverges from the origin slip by more than 1.0%.', icon: Weight },
  { title: 'Off-spec assay', body: 'Moisture or aflatoxin falls outside the band disclosed on the order.', icon: CircleAlert },
  { title: 'Missing evidence', body: 'No sealed sample, no receiving receipt, or no carrier waybill on record.', icon: FileText },
  { title: 'Open arbitration', body: 'A dispute file is open on the order and has not been awarded.', icon: Gavel },
]

const CUSTODY = [
  {
    title: 'Segregated trust account',
    icon: Landmark,
    body: 'Buyer funds are held in a designated custodial trust arrangement, outside RALMP operating accounts. The platform cannot draw on them for working capital.',
  },
  {
    title: 'Dual authorisation',
    icon: ShieldCheck,
    body: 'Release requires an evidence event plus settlement-desk sign-off. No individual administrator can move a tranche.',
  },
  {
    title: 'Written-down ledger',
    icon: ClipboardCheck,
    body: 'Every payment, status change and tracking event is appended to the order record. The ledger is the evidence bundle in a dispute.',
  },
  {
    title: 'Reversal path',
    icon: Banknote,
    body: 'Cancelled or rejected orders restore the grower’s stock. Captured funds return to the buyer through the same rail, net of nothing.',
  },
]

const FAQ = [
  {
    q: 'When exactly is my money captured?',
    a: 'At the payment step only. Creating an order reserves stock but does not capture funds. The checkout screen discloses the full commitment before you authorise Paystack.',
  },
  {
    q: 'Who can release the escrow?',
    a: 'No single party. The carrier files a weighbridge slip, the laboratory files an assay, and the buyer files a receiving receipt. Each event advances a fixed tranche.',
  },
  {
    q: 'What happens if the lot is off-spec?',
    a: 'The remaining balance freezes immediately. The buyer can accept a price adjustment, reject the lot, or escalate to arbitration. The order ledger is preserved throughout.',
  },
  {
    q: 'Are there custody fees?',
    a: 'The current pilot framework waives the custody fee. Any future fee would be disclosed on the checkout screen before authorisation.',
  },
  {
    q: 'Can a grower be paid before delivery?',
    a: 'Only the 10% dispatch advance, and only against the origin weighbridge slip. The cargo value stays in custody until destination evidence clears.',
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
  const modelOrder = { subtotal: 40000, delivery_fee: 2500, total_price: 42500, status: 'pending', payment_status: 'pending' }

  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-forest-900 text-white">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-[0.12]" aria-hidden />
        <div className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-sprout-400/20 blur-3xl" aria-hidden />
        <div className="page-wrap relative py-14 sm:py-20">
          <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <Badge tone="dark" size="md">
                <ShieldCheck size={12} className="text-harvest-300" /> Tripartite custodial escrow
              </Badge>
              <h1 className="mt-5 max-w-[18ch] font-display text-[34px] font-extrabold leading-[1.08] tracking-[-0.03em] text-white sm:text-[46px]">
                Money moves only when the evidence does.
              </h1>
              <p className="mt-4 max-w-xl text-[14px] leading-7 text-forest-100/75">
                RALMP holds buyer capital in a segregated custodial trust. Three fixed tranches release against
                weight, assay and silo acceptance — never against a phone call or a handshake.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild variant="accent" size="lg">
                  <Link to="/commodities">
                    Enter the spot exchange <ArrowRight size={16} />
                  </Link>
                </Button>
              </div>

              <dl className="mt-9 grid max-w-lg grid-cols-2 gap-x-6 gap-y-4 border-t border-white/15 pt-6 sm:grid-cols-3">
                {[
                  { value: '10 / 60 / 30', label: 'Tranche split' },
                  { value: '≤ 1.0%', label: 'Weight tolerance' },
                  { value: '3 gates', label: 'Evidence events' },
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
                Illustrative commitment · ₦42,500
              </p>
              <MilestoneSchedule order={modelOrder} className="border-0 bg-white shadow-modal" />
              <p className="px-1 pt-2 text-[10px] leading-4 text-forest-100/55">
                Worked example only. The binding split and amounts are fixed at order creation and disclosed before
                payment.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="page-wrap page-pad">
        <section className="py-12 sm:py-16">
          <Reveal>
            <div className="max-w-2xl">
              <p className="label-caps text-forest-500">Custody architecture</p>
              <h2 className="mt-2 font-display text-[27px] font-extrabold leading-9 tracking-[-0.02em] text-ink sm:text-[34px] sm:leading-[42px]">
                Four controls that make remote procurement safe.
              </h2>
              <p className="mt-3 text-[14px] leading-6 text-muted">
                The escrow is not a promise of good behaviour. It is a set of technical and institutional
                constraints that make misappropriation structurally difficult.
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
              <p className="label-caps text-forest-500">Release mechanics</p>
              <h2 className="mt-2 font-display text-[27px] font-extrabold leading-9 tracking-[-0.02em] text-ink sm:text-[34px] sm:leading-[42px]">
                Three tranches. Three independent triggers.
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
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-forest-600">Release trigger</p>
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
                <Snowflake size={17} className="text-forest-500" /> Freeze conditions
              </h2>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                Any one of these holds the remaining balance. A freeze is not a penalty — it is a pause until the
                evidence is complete.
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
              <div className="rounded-card border border-line bg-white shadow-card">
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <div>
                    <h2 className="font-display text-[15px] font-bold text-ink">Worked commitment</h2>
                    <p className="mt-0.5 text-[11px] text-muted">Illustrative ₦42,500 order at the farm gate</p>
                  </div>
                  <Badge tone="pending" size="sm">Unfunded model</Badge>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <EscrowLedger order={modelOrder} showTitle={false} className="border-0" />
                  <div className="rounded-xl border border-forest-100 bg-forest-50 p-4">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-forest-600">How to read it</p>
                    <ul className="mt-2 space-y-2 text-[11px] leading-5 text-forest-700/80">
                      <li className="flex gap-1.5"><Check size={11} className="mt-0.5 shrink-0" /> Base produce value covers the farm-gate price.</li>
                      <li className="flex gap-1.5"><Check size={11} className="mt-0.5 shrink-0" /> Freight is pre-funded inside the same escrow.</li>
                      <li className="flex gap-1.5"><Check size={11} className="mt-0.5 shrink-0" /> No custody fee is charged under the pilot.</li>
                      <li className="flex gap-1.5"><Check size={11} className="mt-0.5 shrink-0" /> Every tranche is a percentage of the total.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Callout tone="gold" icon={Scale} title="Arbitration is the backstop">
                When the evidence genuinely disagrees — a disputed weight, a contested sample — the order moves to
                mediation and then arbitration under the Arbitration and Mediation Act 2023. The custodial trustee
                executes the award.
              </Callout>
            </div>
          </div>
        </section>

        <section className="pb-12 sm:pb-16">
          <div className="max-w-2xl">
            <p className="label-caps text-forest-500">Questions buyers actually ask</p>
            <h2 className="mt-2 font-display text-[27px] font-extrabold leading-9 tracking-[-0.02em] text-ink sm:text-[32px] sm:leading-[40px]">
              Straight answers on custody.
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
                <p className="label-caps text-harvest-600">Trade on evidence</p>
                <h2 className="mt-2 max-w-lg font-display text-[26px] font-extrabold leading-8 tracking-[-0.02em] text-ink sm:text-[32px] sm:leading-[40px]">
                  Open an account and commit against verified supply.
                </h2>
                <p className="mt-3 max-w-xl text-[13px] leading-6 text-muted">
                  Buyers fund escrow; growers list at the farm gate; carriers haul pre-funded freight. The same
                  settlement rail serves all three.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link to="/register">Open an account <ArrowRight size={16} /></Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/commodities">Browse verified lots</Link>
                  </Button>
                </div>
              </div>
              <div className="flex flex-col justify-center gap-4 border-t border-line bg-forest-500 p-7 text-white lg:border-l lg:border-t-0 sm:p-9">
                {[
                  { icon: Building2, label: 'Buyers', text: 'Fund once, release on evidence' },
                  { icon: Sprout, label: 'Growers', text: 'Trade against cleared capital' },
                  { icon: Truck, label: 'Carriers', text: 'Haul pre-funded freight' },
                  { icon: Wallet, label: 'Settlement', text: 'NIBSS instant transfer rails' },
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
              Custody held with the settlement trustee · CBN Circular FSR/DIR/GEN/07/041
            </p>
            <Link to="/settlements" className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-forest-600 hover:underline">
              Open the settlement ledger <ChevronRight size={12} />
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
