import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, BadgeCheck, Banknote, Building2, Check, ChevronRight, ClipboardCheck,
  CloudOff, FlaskConical, Landmark, Lock, MapPin, PackageCheck, Scale,
  ShieldCheck, Sprout, Tractor, Truck, Users, Warehouse, Weight,
} from 'lucide-react'
import { produceService } from '../lib/services'
import { compactMoney, money } from '../lib/format'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Section } from '../components/ui/Card'
import { LotCard, LotCardSkeleton } from '../components/market/LotCard'
import { MilestoneSchedule } from '../components/finance/Escrow'

const PROCESS = [
  {
    step: '01',
    icon: Sprout,
    title: 'List at the farm gate',
    body: 'Farmers publish harvest lots with quantity, unit and harvest window — by smartphone or USSD. Origin LGA and aggregation hub are captured at source.',
    note: 'No listing fee',
  },
  {
    step: '02',
    icon: Lock,
    title: 'Buyer commits to escrow',
    body: '100% of buyer capital is pre-funded into a CBN-regulated custodial vault before the lot is reserved. Farmers trade against settled money, not promises.',
    note: '100% pre-funded',
  },
  {
    step: '03',
    icon: Truck,
    title: 'Weighbridge & lab gate',
    body: 'Carriers issue an e-Waybill at origin. Destination gross–tare variance beyond 1.0% or off-spec moisture automatically holds the balance.',
    note: '≤ 1.0% tolerance',
  },
  {
    step: '04',
    icon: Banknote,
    title: 'Milestone settlement',
    body: 'Escrow releases in three statutory tranches against verified weight, lab sign-off and the buyer’s silo receiving receipt. No manual release.',
    note: '10 / 60 / 30 split',
  },
]

const STAKEHOLDERS = [
  {
    role: 'Farmers & co-ops',
    icon: Tractor,
    tone: 'forest',
    headline: 'Paid on proof, not on promises.',
    points: [
      'Zero-cost harvest listing with photo intake',
      '50% lower counterparty default exposure',
      'USSD authorisation where data is scarce',
      'Transparent weight and grade records',
    ],
    to: '/register',
    cta: 'Open a farmer account',
  },
  {
    role: 'Industrial buyers',
    icon: Building2,
    tone: 'gold',
    headline: 'Procure at scale with custody.',
    points: [
      'Verified grower and origin directory',
      'Batch procurement across multiple farms',
      'Laboratory and weighbridge evidence trail',
      'One settlement ledger per order',
    ],
    to: '/commodities',
    cta: 'Enter the spot exchange',
  },
  {
    role: 'Logistics carriers',
    icon: Truck,
    tone: 'sprout',
    headline: 'Haul against guaranteed freight.',
    points: [
      'Freight pre-funded inside escrow',
      'Digital e-Waybill and proof of delivery',
      'Weight variance logged at both gates',
      'Dispatch board with live milestones',
    ],
    to: '/dispatch',
    cta: 'View the dispatch board',
  },
]

const ASSURANCE = [
  { icon: Landmark, title: 'CBN custodial trust', body: 'Providus Bank trust account and Stanbic IBTC buffer vault under circular FSR/DIR/GEN/07/041.' },
  { icon: Scale, title: 'Weighbridge discipline', body: 'Gross–tare capture at origin and destination with automated variance adjudication at 1.0%.' },
  { icon: FlaskConical, title: 'Moisture & grade assay', body: 'NAFDAC and SON-aligned sampling protocol; off-spec lots freeze settlement and route to arbitration.' },
  { icon: ShieldCheck, title: 'Binding arbitration', body: 'Arbitration and Mediation Act 2023 pathway with evidence preserved in the order ledger.' },
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

function HeroRail() {
  return (
    <div className="relative">
      <div className="absolute -inset-3 rounded-[24px] bg-forest-500/10 blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-card border border-line bg-white shadow-modal">
        <div className="flex items-center justify-between border-b border-line bg-forest-900 px-5 py-3.5 text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-harvest-300" />
            <p className="text-[12px] font-semibold">Custodial settlement rail</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-forest-100">
            <span className="h-1.5 w-1.5 rounded-full bg-harvest-300" /> Illustrative model
          </span>
        </div>

        <div className="px-5 pt-4">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">Worked example · 2 buckets of tomatoes</p>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <p className="font-display text-[30px] font-extrabold leading-9 tracking-tight text-forest-600 tnum">
              {money(42500)}
            </p>
            <Badge tone="neutral" size="sm">Example order</Badge>
          </div>
          <p className="mt-1 text-[11.5px] leading-5 text-muted">
            Buyer capital locked before dispatch. Farmer sees cleared funds, carrier sees funded freight.
          </p>
        </div>

        <div className="mt-4 divide-y divide-line border-y border-line">
          {[
            { label: 'Dispatch advance', share: '10%', amount: 4250, state: 'Released at origin weighbridge', done: true },
            { label: 'Weighbridge & lab', share: '60%', amount: 25500, state: 'Held pending destination assay', done: false },
            { label: 'Silo acceptance', share: '30%', amount: 12750, state: 'Held pending receiving receipt', done: false },
          ].map((tranche) => (
            <div key={tranche.label} className="flex items-center gap-3 px-5 py-3">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${
                  tranche.done
                    ? 'border-forest-500 bg-forest-500 text-white'
                    : 'border-line bg-sage-100 text-muted'
                }`}
              >
                {tranche.done ? <Check size={13} strokeWidth={3} /> : <Lock size={12} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-ink">
                  {tranche.label} <span className="font-normal text-muted">· {tranche.share}</span>
                </p>
                <p className="break-words text-[10.5px] text-muted">{tranche.state}</p>
              </div>
              <p className="shrink-0 text-[12.5px] font-bold text-ink tnum">{money(tranche.amount)}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between bg-canvas px-5 py-3">
          <p className="flex items-center gap-1.5 text-[10.5px] font-medium text-muted">
            <MapPin size={11} /> Ijebu-Ife → Apapa processing mill
          </p>
          <Link to="/escrow" className="inline-flex items-center gap-1 text-[11px] font-bold text-forest-600 hover:underline">
            Read the model <ChevronRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    produceService
      .list({ per_page: 3, sort_by: 'created_at', sort_order: 'desc' })
      .then((res) => {
        if (active) setLots(res.data?.data || [])
      })
      .catch(() => {
        if (active) setLots([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-canvas">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-60" aria-hidden />
        <div className="pointer-events-none absolute -right-40 -top-40 h-[420px] w-[420px] rounded-full bg-sprout-200/40 blur-3xl" aria-hidden />
        <div className="page-wrap relative py-12 sm:py-16 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="verified" size="md">
                  <BadgeCheck size={12} /> CBN-regulated escrow
                </Badge>
                <Badge tone="outline" size="md">Rural Agricultural Market Linkage Platform</Badge>
              </div>

              <h1 className="mt-5 max-w-[16ch] font-display text-[38px] font-extrabold leading-[1.06] tracking-[-0.03em] text-ink sm:text-[52px] lg:text-[58px]">
                Trade harvests like <span className="text-forest-500">financial assets.</span>
              </h1>

              <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted sm:text-base">
                RALMP connects verified Nigerian growers to industrial off-takers through collateralised
                haulage and tripartite escrow. Every lot is weighed, assayed and settled on evidence —
                from farm gate to silo gate.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button asChild size="xl">
                  <Link to="/commodities">
                    Enter the spot exchange <ArrowRight size={17} />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="xl">
                  <Link to="/register">Open an account</Link>
                </Button>
              </div>

              <dl className="mt-9 grid max-w-lg grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-6 sm:grid-cols-4">
                {[
                  { value: '10/60/30', label: 'Tranche release' },
                  { value: '≤1.0%', label: 'Weight tolerance' },
                  { value: '36+1', label: 'States & FCT' },
                  { value: '*347*44#', label: 'USSD trade desk' },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="font-display text-[17px] font-extrabold tracking-tight text-ink tnum">{item.value}</dt>
                    <dd className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted">{item.label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <HeroRail />
          </div>
        </div>
      </section>

      {/* Regulator strip */}
      <div className="border-b border-line bg-white">
        <div className="page-wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted">
            Operating under institutional oversight
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {['Central Bank of Nigeria', 'NIBSS', 'FMAFS', 'NAFDAC', 'SON', 'NSPRI'].map((name) => (
              <span key={name} className="text-[11.5px] font-semibold text-ink-soft/70">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Live market */}
      <div className="page-wrap">
        <Section
          eyebrow="Live spot exchange"
          title="Verified lots, clearing now."
          description="Every listing below is published by a registered grower or co-operative. Prices are per stated unit at the farm gate."
          action={
            <Button asChild variant="outline" size="md">
              <Link to="/commodities">
                Browse all lots <ArrowRight size={15} />
              </Link>
            </Button>
          }
        >
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <LotCardSkeleton key={i} />)
              : lots.map((lot) => (
                  <LotCard key={lot.id} lot={lot} canTrade={false} />
                ))}
            {!loading && lots.length === 0 && (
              <div className="col-span-full rounded-card border border-dashed border-sage-400 bg-white px-6 py-12 text-center">
                <Sprout size={26} className="mx-auto text-forest-400" />
                <p className="mt-3 font-display text-base font-bold text-ink">The exchange is between harvests.</p>
                <p className="mt-1 text-[13px] text-muted">
                  New lots are published daily. Open an account to be notified when your grade clears.
                </p>
              </div>
            )}
          </div>
        </Section>
      </div>

      {/* Process */}
      <section className="border-y border-line bg-white">
        <div className="page-wrap py-14 sm:py-20">
          <Reveal>
            <div className="max-w-2xl">
              <p className="label-caps text-forest-500">The settlement pipeline</p>
              <h2 className="mt-2.5 font-display text-[28px] font-bold leading-9 tracking-[-0.02em] text-ink sm:text-[36px] sm:leading-[44px]">
                Four gates between a harvest and cleared money.
              </h2>
              <p className="mt-3 text-[14.5px] leading-6 text-muted">
                No handshake settlement. No open credit. Each gate produces an evidence record that
                either advances the next tranche or freezes the balance.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PROCESS.map((item, index) => (
              <Reveal key={item.step} delay={index * 0.06}>
                <div className="group relative flex h-full flex-col rounded-card border border-line bg-canvas p-5 transition hover:border-forest-200 hover:bg-white hover:shadow-card">
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-forest-500 text-white shadow-[0_2px_6px_rgba(23,107,58,.28)]">
                      <item.icon size={19} />
                    </span>
                    <span className="font-display text-[22px] font-extrabold tracking-tight text-sage-400">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-[15px] font-bold text-ink">{item.title}</h3>
                  <p className="mt-1.5 flex-1 text-[12.5px] leading-5 text-muted">{item.body}</p>
                  <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-forest-100 bg-white px-2.5 py-1 text-[10.5px] font-bold text-forest-600">
                    <Check size={10} strokeWidth={3} /> {item.note}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stakeholders */}
      <div className="page-wrap">
        <Section
          eyebrow="Built for all three sides of the trade"
          title="One rail. Three operating positions."
          description="Farmers, off-takers and carriers each get a purpose-built workspace on the same escrow ledger."
        >
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {STAKEHOLDERS.map((persona, index) => (
              <Reveal key={persona.role} delay={index * 0.05}>
                <div className="flex h-full flex-col rounded-card border border-line bg-white p-5 shadow-card">
                  <div className="flex items-center justify-between">
                    <span
                      className={`grid h-11 w-11 place-items-center rounded-xl ${
                        persona.tone === 'gold'
                          ? 'bg-harvest-300 text-ink'
                          : persona.tone === 'sprout'
                            ? 'bg-sprout-100 text-sprout-600'
                            : 'bg-forest-50 text-forest-600'
                      }`}
                    >
                      <persona.icon size={20} />
                    </span>
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
                      {persona.role}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-[19px] font-bold leading-6 text-ink">{persona.headline}</h3>
                  <ul className="mt-4 flex-1 space-y-2.5">
                    {persona.points.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-[12.5px] leading-5 text-muted">
                        <span className="mt-1 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-forest-50">
                          <Check size={9} strokeWidth={3.5} className="text-forest-600" />
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant="outline" size="sm" className="mt-5 w-full">
                    <Link to={persona.to}>
                      {persona.cta} <ArrowRight size={14} />
                    </Link>
                  </Button>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>
      </div>

      {/* Escrow deep dive */}
      <section className="border-y border-line bg-forest-900 text-white">
        <div className="page-wrap grid gap-10 py-14 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-harvest-300">Tripartite custodial escrow</p>
            <h2 className="mt-3 max-w-lg font-display text-[30px] font-extrabold leading-9 tracking-[-0.02em] text-white sm:text-[38px] sm:leading-[46px]">
              The buyer&apos;s money is never in the farmer&apos;s hand. Or the carrier&apos;s.
            </h2>
            <p className="mt-4 max-w-xl text-[14px] leading-6 text-forest-100/75">
              Funds sit in a dedicated custodial vault and move only when the platform receives a
              verified evidence event. Three tranches, three triggers — with an arbitration path when
              the evidence disagrees.
            </p>

            <div className="mt-7 space-y-4">
              {[
                { icon: Landmark, title: 'Segregated custody', body: 'Client funds held outside RALMP operating accounts in a CBN-licensed trust arrangement.' },
                { icon: Weight, title: 'Dual weighbridge evidence', body: 'Origin and destination slips are matched automatically; variance beyond tolerance holds the balance.' },
                { icon: ClipboardCheck, title: 'Immutable order ledger', body: 'Every status change, payment and delivery event is written to the order record.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-harvest-300">
                    <item.icon size={16} />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold">{item.title}</p>
                    <p className="mt-0.5 text-[12px] leading-5 text-forest-100/65">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button asChild variant="accent" className="mt-7">
              <Link to="/escrow">
                Understand the escrow model <ArrowRight size={15} />
              </Link>
            </Button>
          </div>

          <div className="space-y-4">
            <MilestoneSchedule
              className="border-forest-700 bg-white/95 text-ink shadow-modal"
              order={{ total_price: 42500, status: 'pending', payment_status: 'pending' }}
            />
            <p className="text-[11px] leading-5 text-forest-100/55">
              Illustrative schedule for a ₦42,500 order. Actual tranche percentages are fixed at order
              creation and disclosed on the checkout screen.
            </p>
          </div>
        </div>
      </section>

      {/* Assurance */}
      <div className="page-wrap">
        <Section
          eyebrow="Institutional assurance"
          title="Evidence, not assurances."
          description="The controls below are the reason a commercial buyer can deploy procurement capital into smallholder supply."
        >
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ASSURANCE.map((item) => (
              <div key={item.title} className="rounded-card border border-line bg-white p-5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-sage-100 text-forest-600">
                  <item.icon size={17} />
                </span>
                <h3 className="mt-3.5 font-display text-[14px] font-bold text-ink">{item.title}</h3>
                <p className="mt-1.5 text-[12px] leading-5 text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Offline band */}
      <section className="border-y border-line bg-sage-100">
        <div className="page-wrap grid gap-8 py-12 sm:py-14 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-forest-600 shadow-card">
              <CloudOff size={22} />
            </span>
            <div className="max-w-2xl">
              <p className="label-caps text-forest-600">Works without data</p>
              <h2 className="mt-1.5 font-display text-[24px] font-extrabold leading-8 tracking-[-0.015em] text-ink sm:text-[28px]">
                A farmer can list, price and authorise payout on a feature phone.
              </h2>
              <p className="mt-2 text-[13.5px] leading-6 text-muted">
                The USSD gateway mirrors the core listing and payout flows. Where connectivity is thin,
                agents at the aggregation hub complete photo intake and quality sampling.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-line bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Dial</p>
              <p className="mt-0.5 font-mono text-[20px] font-bold tracking-tight text-forest-600">*347*44#</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="page-wrap">
        <div className="my-14 overflow-hidden rounded-card border border-forest-200 bg-white shadow-card sm:my-20">
          <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
            <div className="p-7 sm:p-10">
              <p className="label-caps text-harvest-600">Start trading on evidence</p>
              <h2 className="mt-2 max-w-lg font-display text-[28px] font-extrabold leading-9 tracking-[-0.02em] text-ink sm:text-[34px] sm:leading-[42px]">
                Bring your harvest or your procurement mandate to the exchange.
              </h2>
              <p className="mt-3 max-w-xl text-[13.5px] leading-6 text-muted">
                Accounts are open to registered farmers, co-operatives, industrial buyers and licensed
                logistics carriers. Verification is required before your first settlement.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/register">Open an account <ArrowRight size={16} /></Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/login">Sign in to your workspace</Link>
                </Button>
              </div>
            </div>
            <div className="relative flex flex-col justify-center gap-4 border-t border-line bg-forest-500 p-7 text-white lg:border-l lg:border-t-0 sm:p-9">
              <div className="pointer-events-none absolute inset-0 dot-grid opacity-20" aria-hidden />
              {[
                { icon: Users, label: 'Farmers & co-operatives', value: 'Sell forward with cleared funds' },
                { icon: Warehouse, label: 'Off-takers & processors', value: 'Secure grade-verified volume' },
                { icon: PackageCheck, label: 'Carriers', value: 'Haul pre-funded freight' },
              ].map((row) => (
                <div key={row.label} className="relative flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/12 text-harvest-300">
                    <row.icon size={16} />
                  </span>
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-forest-100/70">{row.label}</p>
                    <p className="mt-0.5 text-[13px] font-semibold">{row.value}</p>
                  </div>
                </div>
              ))}
              <div className="relative mt-2 border-t border-white/15 pt-4">
                <p className="text-[11px] text-forest-100/70">
                  Cleared volume to date
                </p>
                <p className="mt-1 font-display text-[24px] font-extrabold tracking-tight tnum">
                  {compactMoney(lots.reduce((sum, lot) => sum + Number(lot.price || 0) * Number(lot.quantity || 0), 0))}
                </p>
                <p className="text-[10.5px] text-forest-100/60">Open listing value on the exchange</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
