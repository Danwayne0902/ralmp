import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, BadgeCheck, Banknote, Building2, Check, ChevronRight, ClipboardCheck,
  FlaskConical, Landmark, Lock, MapPin, PackageCheck, Scale,
  ShieldCheck, Sprout, Tractor, Truck, Users, Warehouse, Weight,
} from 'lucide-react'
import { produceService } from '../lib/services'
import { compactMoney, money, qtyUnit } from '../lib/format'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Section } from '../components/ui/Card'
import { LotCard, LotCardSkeleton } from '../components/market/LotCard'
import { MilestoneSchedule } from '../components/finance/Escrow'

const PROCESS = [
  {
    step: '01',
    icon: Sprout,
    title: 'List your harvest',
    body: 'Farmers post what they have, how much there is, and when it will be ready. You can add photos and set your own price.',
    note: 'Free to list',
  },
  {
    step: '02',
    icon: Lock,
    title: 'Buyer pays first',
    body: 'The buyer pays the full amount into escrow before the goods move. No credit. No waiting on promises.',
    note: '100% paid upfront',
  },
  {
    step: '03',
    icon: Truck,
    title: 'Weight and quality check',
    body: 'The load is weighed at pickup and again at delivery, and both weights stay on the order. If something is wrong, the buyer can keep the money in escrow and open a complaint.',
    note: 'Both weights kept',
  },
  {
    step: '04',
    icon: Banknote,
    title: 'Farmer gets paid',
    body: '10% is released at pickup. The other 60% and 30% are released together when the buyer confirms the goods arrived. Nobody can skip a step.',
    note: '10 / 60 / 30',
  },
]

const STAKEHOLDERS = [
  {
    role: 'Farmers & co-ops',
    icon: Tractor,
    tone: 'forest',
    headline: 'Get paid for what you grow.',
    points: [
      'List for free and add photos',
      'Buyer pays before pickup',
      'See every weight and grade',
      'One clear record for each sale',
    ],
    to: '/register',
    cta: 'Create a farmer account',
  },
  {
    role: 'Industrial buyers',
    icon: Building2,
    tone: 'gold',
    headline: 'Buy in bulk with confidence.',
    points: [
      'Find real farmers and real stock',
      'Buy from more than one farm at once',
      'See weight and quality reports',
      'One clear record for every order',
    ],
    to: '/commodities',
    cta: 'See what is for sale',
  },
  {
    role: 'Logistics carriers',
    icon: Truck,
    tone: 'sprout',
    headline: 'Earn on every trip.',
    points: [
      'Delivery money is funded first',
      'Send delivery notes from your phone',
      'Record weight at both ends',
      'See every job in one place',
    ],
    to: '/dispatch',
    cta: 'See delivery jobs',
  },
]

const ASSURANCE = [
  { icon: Landmark, title: 'Money kept safe', body: 'Buyer money is held in escrow until each step is proven. Both sides can see the record.' },
  { icon: Scale, title: 'Honest weights', body: 'Goods are weighed at pickup and at delivery, and both weights stay on the order record.' },
  { icon: FlaskConical, title: 'Quality checks', body: 'Moisture and grade records stay with the order. An admin can pause a payment while a complaint is reviewed.' },
  { icon: ShieldCheck, title: 'Fair dispute process', body: 'If both sides disagree, a neutral person looks at the evidence and decides.' },
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

function HeroRail({ lot }) {
  const value = lot ? Number(lot.price || 0) * Number(lot.quantity || 0) : 0
  const qty = lot ? qtyUnit(lot.quantity, lot.unit) : ''
  const title = lot ? `${qty} of ${lot.commodity_name}` : 'No listing yet'
  const origin = lot?.location || 'Farm gate'
  const payments = [
    { label: 'Pickup payment', share: '10%', amount: value * 0.1, state: 'Paid at the farm gate' },
    { label: 'Main payment', share: '60%', amount: value * 0.6, state: 'Paid when the buyer confirms' },
    { label: 'Final payment', share: '30%', amount: value * 0.3, state: 'Paid on the same confirmation' },
  ]

  return (
    <div className="relative">
      <div className="absolute -inset-3 rounded-[24px] bg-forest-500/10 blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-card border border-line bg-white shadow-modal">
        <div className="flex items-center justify-between border-b border-line bg-forest-900 px-5 py-3.5 text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-harvest-300" />
            <p className="text-[12px] font-semibold">How your money is held</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-forest-100">
            <span className="h-1.5 w-1.5 rounded-full bg-harvest-300" /> Live listing
          </span>
        </div>

        <div className="px-5 pt-4">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">Newest listing on the market</p>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <p className="font-display text-[30px] font-extrabold leading-9 tracking-tight text-forest-600 tnum">
              {value > 0 ? money(value) : '—'}
            </p>
            <Badge tone="neutral" size="sm">{lot ? 'Full price' : 'Waiting'}</Badge>
          </div>
          <p className="mt-1 break-words text-[11.5px] leading-5 text-muted">
            {lot
              ? `${title}. The buyer pays all of it into escrow first. The farmer and the transporter know the money is there.`
              : 'New listings appear here as soon as farmers add their harvest.'}
          </p>
        </div>

        <div className="mt-4 divide-y divide-line border-y border-line">
          {payments.map((payment) => (
            <div key={payment.label} className="flex items-center gap-3 px-5 py-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line bg-sage-100 text-muted">
                <Lock size={12} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-ink">
                  {payment.label} <span className="font-normal text-muted">· {payment.share}</span>
                </p>
                <p className="break-words text-[10.5px] text-muted">{payment.state}</p>
              </div>
              <p className="shrink-0 text-[12.5px] font-bold text-ink tnum">
                {value > 0 ? money(payment.amount) : payment.share}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between bg-canvas px-5 py-3">
          <p className="flex items-center gap-1.5 break-words text-[10.5px] font-medium text-muted">
            <MapPin size={11} /> {origin} → buyer
          </p>
          <Link to="/escrow" className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-forest-600 hover:underline">
            How it works <ChevronRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [lots, setLots] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    produceService
      .list({ per_page: 3, sort_by: 'created_at', sort_order: 'desc' })
      .then((res) => {
        if (active) {
          setLots(res.data?.data || [])
          setTotal(Number(res.data?.total || 0))
        }
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

  const showcase = lots[0]
  const showcaseValue = showcase
    ? Number(showcase.price || 0) * Number(showcase.quantity || 0)
    : 0

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
                  <BadgeCheck size={12} /> Money held safely
                </Badge>
                <Badge tone="outline" size="md">Farm to buyer, checked at every step</Badge>
              </div>

              <h1 className="mt-5 max-w-[16ch] font-display text-[38px] font-extrabold leading-[1.06] tracking-[-0.03em] text-ink sm:text-[52px] lg:text-[58px]">
                Sell your harvest. <span className="text-forest-500">Get paid safely.</span>
              </h1>

              <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted sm:text-base">
                RALMP links farmers, buyers and transporters across Nigeria. The buyer pays into a safe
                escrow account before the goods move. So the farmer knows the money is there, and the
                buyer knows the goods are real.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button asChild size="xl">
                  <Link to="/commodities">
                    See what is for sale <ArrowRight size={17} />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="xl">
                  <Link to="/register">Create an account</Link>
                </Button>
              </div>

              <dl className="mt-9 grid max-w-lg grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-6 sm:grid-cols-4">
                {[
                  { value: '10/60/30', label: 'Pay plan' },
                  { value: '≤1.0%', label: 'Weight check' },
                  { value: '36+1', label: 'States and FCT' },
                  { value: total ? String(total) : '—', label: 'Live listings' },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="font-display text-[17px] font-extrabold tracking-tight text-ink tnum">{item.value}</dt>
                    <dd className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted">{item.label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <HeroRail lot={showcase} />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <div className="border-b border-line bg-white">
        <div className="page-wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted">
            What you can count on
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {['Real farmers', 'Money held safely', 'Honest weights', 'A fair way to settle'].map((name) => (
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
          eyebrow="Fresh from the farm"
          title="What farmers are selling now."
          description="Every listing comes from a real farmer or co-op. Prices are per unit at the farm."
          action={
            <Button asChild variant="outline" size="md">
              <Link to="/commodities">
                See all listings <ArrowRight size={15} />
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
                <p className="mt-3 font-display text-base font-bold text-ink">No produce listed right now.</p>
                <p className="mt-1 text-[13px] text-muted">
                  Farmers add new listings often. Check again soon or create an account to start selling.
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
              <p className="label-caps text-forest-500">How payment works</p>
              <h2 className="mt-2.5 font-display text-[28px] font-bold leading-9 tracking-[-0.02em] text-ink sm:text-[36px] sm:leading-[44px]">
                Four steps from farm to money.
              </h2>
              <p className="mt-3 text-[14.5px] leading-6 text-muted">
                No handshakes. No credit. Each step leaves proof, and the money moves only when the proof is there.
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
          eyebrow="For everyone in the chain"
          title="One place. Three kinds of work."
          description="Farmers, buyers and transporters each get their own simple workspace, all on the same safe payment system."
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
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-harvest-300">Safe payments</p>
            <h2 className="mt-3 max-w-lg font-display text-[30px] font-extrabold leading-9 tracking-[-0.02em] text-white sm:text-[38px] sm:leading-[46px]">
              The money is held until each step is proven.
            </h2>
            <p className="mt-4 max-w-xl text-[14px] leading-6 text-forest-100/75">
              The buyer pays into escrow. The money is released only when the agreed proof is
              uploaded. If the two sides disagree, a neutral review decides.
            </p>

            <div className="mt-7 space-y-4">
              {[
                { icon: Landmark, title: 'Clear record', body: 'Every order keeps its own payment record, so both sides can see what is held and what has been paid.' },
                { icon: Weight, title: 'Two weight records', body: 'Weight at pickup is compared with weight at delivery. A big gap puts the money on hold.' },
                { icon: ClipboardCheck, title: 'Clear order history', body: 'Every status change, payment and delivery note is saved on the order.' },
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
                See how escrow works <ArrowRight size={15} />
              </Link>
            </Button>
          </div>

          <div className="space-y-4">
            {showcaseValue > 0 ? (
              <>
                <MilestoneSchedule
                  className="border-forest-700 bg-white/95 text-ink shadow-modal"
                  order={{ total_price: showcaseValue, status: 'pending', payment_status: 'pending' }}
                />
                <p className="text-[11px] leading-5 text-forest-100/55">
                  Example using the newest listing: {qtyUnit(showcase.quantity, showcase.unit)} of{' '}
                  {showcase.commodity_name} at {money(showcaseValue)}. The real split is shown before payment.
                </p>
              </>
            ) : (
              <div className="rounded-card border border-forest-700 bg-white/95 p-5 text-ink shadow-modal">
                <p className="font-display text-[15px] font-bold">How the money is split</p>
                <ul className="mt-3 space-y-2 text-[12.5px] text-muted">
                  <li>10% when the goods leave the farm.</li>
                  <li>90% when the buyer confirms the goods arrived.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Assurance */}
      <div className="page-wrap">
        <Section
          eyebrow="Why people trust us"
          title="Proof, not promises."
          description="These are the checks that let a buyer send money to a farmer they have never met."
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

      {/* CTA */}
      <div className="page-wrap">
        <div className="my-14 overflow-hidden rounded-card border border-forest-200 bg-white shadow-card sm:my-20">
          <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
            <div className="p-7 sm:p-10">
              <p className="label-caps text-harvest-600">Start trading safely</p>
              <h2 className="mt-2 max-w-lg font-display text-[28px] font-extrabold leading-9 tracking-[-0.02em] text-ink sm:text-[34px] sm:leading-[42px]">
                Bring your harvest, your business or your truck.
              </h2>
              <p className="mt-3 max-w-xl text-[13.5px] leading-6 text-muted">
                Anyone can create an account: farmers, co-ops, buyers and transporters. You can start right away.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/register">Create an account <ArrowRight size={16} /></Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/login">Sign in</Link>
                </Button>
              </div>
            </div>
            <div className="relative flex flex-col justify-center gap-4 border-t border-line bg-forest-500 p-7 text-white lg:border-l lg:border-t-0 sm:p-9">
              <div className="pointer-events-none absolute inset-0 dot-grid opacity-20" aria-hidden />
              {[
                { icon: Users, label: 'Farmers and co-ops', value: 'Sell and get paid on time' },
                { icon: Warehouse, label: 'Buyers and processors', value: 'Buy checked stock in bulk' },
                { icon: PackageCheck, label: 'Transporters', value: 'Move goods that are already paid for' },
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
                  Value of the newest listings shown
                </p>
                <p className="mt-1 font-display text-[24px] font-extrabold tracking-tight tnum">
                  {compactMoney(lots.reduce((sum, lot) => sum + Number(lot.price || 0) * Number(lot.quantity || 0), 0))}
                </p>
                <p className="text-[10.5px] text-forest-100/60">Based on the three newest listings on this page</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
