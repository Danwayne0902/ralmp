import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Check, ChevronRight, CircleAlert, CloudOff, Grid2X2,
  Info, Phone, RotateCcw, ShieldCheck, Signal, Sprout, Wallet,
} from 'lucide-react'
import { PageHeader } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Callout } from '../components/ui/Card'
import { cn } from '../lib/utils'

const ROOT_MENU = {
  title: 'RALMP Trade Desk',
  subtitle: 'Select an option',
  options: [
    { key: '1', label: 'List my harvest' },
    { key: '2', label: 'Check incoming orders' },
    { key: '3', label: 'Authorise payout release' },
    { key: '4', label: 'Confirm a delivery' },
    { key: '5', label: 'Change language' },
  ],
}

const FLOWS = {
  '1': {
    title: 'List my harvest',
    subtitle: 'Step 1 of 3 · commodity',
    options: [
      { key: '1', label: 'Maize' },
      { key: '2', label: 'Rice paddy' },
      { key: '3', label: 'Soybean' },
      { key: '4', label: 'Cowpea' },
      { key: '0', label: 'Back' },
    ],
  },
  '2': {
    title: 'Incoming orders',
    subtitle: 'Committed escrow orders',
    lines: [
      'Order #2 · Fresh Tomatoes',
      '2 buckets · N42,500',
      'Escrow: funded',
      '',
      '1. Accept order',
      '2. Decline order',
      '0. Back',
    ],
    options: [
      { key: '1', label: 'Accept order' },
      { key: '2', label: 'Decline order' },
      { key: '0', label: 'Back' },
    ],
  },
  '3': {
    title: 'Authorise payout',
    subtitle: 'Milestone release',
    lines: [
      'Tranche: dispatch 10%',
      'Order #2 · funded',
      'Amount: N4,250',
      '',
      'Enter agent PIN to release.',
    ],
    input: { label: 'Agent PIN', placeholder: '••••' },
    options: [{ key: '0', label: 'Back' }],
  },
  '4': {
    title: 'Confirm delivery',
    subtitle: 'Destination receipt',
    lines: [
      'Order #2 · in transit',
      'Destination: Apapa',
      '',
      '1. Confirm arrival',
      '2. Report weight variance',
      '0. Back',
    ],
    options: [
      { key: '1', label: 'Confirm arrival' },
      { key: '2', label: 'Report variance' },
      { key: '0', label: 'Back' },
    ],
  },
  '5': {
    title: 'Language',
    subtitle: 'Choose session language',
    options: [
      { key: '1', label: 'English' },
      { key: '2', label: 'Hausa' },
      { key: '3', label: 'Yoruba' },
      { key: '4', label: 'Igbo' },
      { key: '0', label: 'Back' },
    ],
  },
  '2-1': {
    title: 'Order accepted',
    subtitle: 'Escrow commitment confirmed',
    lines: [
      'Order #2 accepted.',
      'Carrier matching in progress.',
      'You will receive an SMS',
      'when the waybill is issued.',
      '',
      '0. Main menu',
    ],
    success: true,
    options: [{ key: '0', label: 'Main menu' }],
  },
  '2-2': {
    title: 'Order declined',
    subtitle: 'Stock restored',
    lines: [
      'Order #2 declined.',
      'Reserved stock returned',
      'to your listing. Escrow',
      'funds held for review.',
      '',
      '0. Main menu',
    ],
    success: true,
    options: [{ key: '0', label: 'Main menu' }],
  },
  '4-2': {
    title: 'Variance reported',
    subtitle: 'Evidence hold applied',
    lines: [
      'Weight variance logged.',
      'Remaining tranches held',
      'pending destination re-weigh.',
      'Trade desk will call.',
      '',
      '0. Main menu',
    ],
    success: true,
    options: [{ key: '0', label: 'Main menu' }],
  },
}

const PILLARS = [
  {
    icon: Sprout,
    title: 'List without data',
    body: 'A grower can publish quantity, unit and farm-gate price from a feature phone. An agent at the aggregation hub completes photo intake.',
  },
  {
    icon: Wallet,
    title: 'Authorise payout offline',
    body: 'Milestone releases can be confirmed by agent PIN over USSD. The release is written to the same escrow ledger as the web app.',
  },
  {
    icon: ShieldCheck,
    title: 'Same custody rules',
    body: 'USSD does not bypass evidence. A payout still requires the weighbridge, assay or receiving event before it can be authorised.',
  },
]

export default function UssdGateway() {
  const [screen, setScreen] = useState('root')
  const [buffer, setBuffer] = useState('')
  const [trail, setTrail] = useState([])

  const current = screen === 'root' ? ROOT_MENU : FLOWS[screen] || ROOT_MENU

  const keypad = useMemo(
    () => [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['*', '0', '#'],
    ],
    [],
  )

  function goTo(key) {
    setTrail((prev) => [...prev, { screen, key }])

    if (key === '0') {
      if (screen === 'root') return
      if (screen.includes('-')) {
        setScreen('root')
        return
      }
      setScreen('root')
      return
    }

    if (screen === 'root') {
      if (FLOWS[key]) {
        setScreen(key)
      }
      return
    }

    if (screen === '1') {
      if (key === '0') {
        setScreen('root')
        return
      }
      if (['1', '2', '3', '4'].includes(key)) {
        setBuffer('')
        setScreen(key === '1' ? '2' : '2')
      }
      return
    }

    if (screen === '2') {
      if (key === '1') {
        setScreen('2-1')
        return
      }
      if (key === '2') {
        setScreen('2-2')
        return
      }
      return
    }

    if (screen === '4') {
      if (key === '1') {
        setScreen('2-1')
        return
      }
      if (key === '2') {
        setScreen('4-2')
        return
      }
      return
    }

    if (screen === '5') {
      // Language selection returns to root with a confirmation.
      setScreen('root')
      return
    }
  }

  function reset() {
    setScreen('root')
    setBuffer('')
    setTrail([])
  }

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="Offline access"
        title="USSD trade gateway"
        description="The same listing, order and payout controls, delivered on a feature phone where data is scarce."
        actions={
          <Button asChild variant="ghost" size="md">
            <Link to="/"><ArrowLeft size={15} /> Back to the exchange</Link>
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge tone="pending" size="md"><Info size={11} /> Interactive walkthrough · demonstration only</Badge>
        <Badge tone="neutral" size="md"><CloudOff size={11} /> No data connection required</Badge>
        <p className="text-[11px] text-muted">No live USSD session is opened from this page.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Phone */}
        <div className="mx-auto w-full max-w-[380px] lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[28px] border border-forest-800 bg-forest-900 p-3 shadow-modal">
            <div className="rounded-[20px] bg-ink p-2.5">
              <div className="flex items-center justify-between px-2 pb-2 text-[10px] font-semibold text-sage-300">
                <span className="flex items-center gap-1"><Signal size={11} /> RALMP</span>
                <span className="font-mono">*347*44#</span>
              </div>

              <div className="overflow-hidden rounded-xl border border-forest-800 bg-[#0B1A11]">
                <div className="flex items-center justify-between border-b border-forest-800 px-3 py-2">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-sprout-300">
                    {current.title}
                  </p>
                  <span className="font-mono text-[9.5px] text-forest-300">USSD</span>
                </div>

                <div className="min-h-[248px] px-3.5 py-3">
                  <p className="text-[10.5px] text-forest-200">{current.subtitle}</p>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={screen}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="mt-2"
                    >
                      {current.success && (
                        <span className="mb-2 inline-grid h-8 w-8 place-items-center rounded-full bg-forest-500 text-white">
                          <Check size={16} strokeWidth={3} />
                        </span>
                      )}

                      {current.lines && (
                        <div className="space-y-0.5 font-mono text-[11.5px] leading-6 text-sage-100">
                          {current.lines.map((line, index) => (
                            <p key={`${line}-${index}`} className="min-h-[1.5rem]">{line || '\u00A0'}</p>
                          ))}
                        </div>
                      )}

                      {current.options && (
                        <ul className="mt-2 space-y-1.5">
                          {current.options.map((option) => (
                            <li key={option.key}>
                              <button
                                type="button"
                                onClick={() => goTo(option.key)}
                                className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[11.5px] text-sage-100 transition hover:bg-forest-800/70"
                              >
                                <span className="font-mono font-bold text-sprout-300">{option.key}.</span>
                                <span className="flex-1">{option.label}</span>
                                <ChevronRight size={11} className="text-forest-400" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {current.input && (
                        <div className="mt-3 rounded-lg border border-forest-700 bg-forest-900/60 px-3 py-2">
                          <p className="text-[9.5px] font-bold uppercase tracking-wide text-forest-300">{current.input.label}</p>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="font-mono text-[15px] tracking-[0.3em] text-sage-100">
                              {buffer || current.input.placeholder}
                            </span>
                            <span className="font-mono text-[9px] text-forest-400">SEND</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Keypad */}
              <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                {keypad.map((row) =>
                  row.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (current.input) {
                          if (key === '#') {
                            goTo('0')
                            return
                          }
                          if (/^\d$/.test(key)) setBuffer((prev) => (prev + key).slice(0, 6))
                          return
                        }
                        goTo(key)
                      }}
                      className={cn(
                        'grid h-11 place-items-center rounded-lg border border-forest-800 bg-forest-800/70 font-mono text-[15px] font-bold text-sage-100 transition active:scale-95 hover:bg-forest-700',
                        ['*', '#'].includes(key) && 'text-sprout-300',
                      )}
                    >
                      {key}
                    </button>
                  )),
                )}
              </div>

              <div className="mt-2 flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-forest-300 transition hover:text-white"
                >
                  <RotateCcw size={10} /> Restart session
                </button>
                <span className="font-mono text-[9px] text-forest-400">
                  {trail.length} {trail.length === 1 ? 'step' : 'steps'}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-3 flex items-start gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-[10.5px] leading-4 text-muted">
            <Info size={12} className="mt-0.5 shrink-0 text-forest-500" />
            Prototype navigation for illustration. A production session is bound to the subscriber&apos;s registered
            phone number and agent PIN.
          </p>
        </div>

        {/* Explainer */}
        <div className="min-w-0 space-y-5">
          <div className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
            <h2 className="flex items-center gap-2 font-display text-[17px] font-bold text-ink">
              <Phone size={17} className="text-forest-500" /> Why USSD is part of the rail
            </h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">
              Rural supply does not always come with a smartphone or a data bundle. The USSD gateway mirrors the
              core trade actions so a grower is never locked out of the market by connectivity.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {PILLARS.map((pillar) => (
                <div key={pillar.title} className="rounded-xl border border-line bg-canvas p-4">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-forest-600 shadow-sm">
                    <pillar.icon size={16} />
                  </span>
                  <p className="mt-2.5 text-[12.5px] font-bold text-ink">{pillar.title}</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted">{pillar.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
                  <Grid2X2 size={15} className="text-forest-500" /> Session walkthrough
                </h2>
                <p className="mt-0.5 text-[11px] text-muted">Use the keypad on the phone or click an option to explore.</p>
              </div>
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw size={13} /> Reset
              </Button>
            </div>
            <ol className="divide-y divide-line">
              {[
                { step: '01', title: 'Dial the short code', body: 'The session opens on the registered phone number. No app install, no password.' },
                { step: '02', title: 'List or inspect a lot', body: 'Choose a commodity, volume and farm-gate price. The lot is published to the exchange immediately.' },
                { step: '03', title: 'Review committed orders', body: 'See which orders are funded, what the buyer committed and whether a waybill exists.' },
                { step: '04', title: 'Authorise a release', body: 'Enter the agent PIN to release the tranche that the evidence event has already unlocked.' },
                { step: '05', title: 'Receive an SMS record', body: 'The session outcome is sent by SMS and written to the same order ledger as the web app.' },
              ].map((row) => (
                <li key={row.step} className="flex gap-3.5 px-5 py-3.5">
                  <span className="font-display text-[11px] font-extrabold text-sage-400">{row.step}</span>
                  <div>
                    <p className="text-[12.5px] font-semibold text-ink">{row.title}</p>
                    <p className="mt-0.5 text-[11px] leading-5 text-muted">{row.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Callout tone="sage" icon={ShieldCheck} title="No evidence shortcut">
              USSD authorisation only releases a tranche that is already unlocked by a verified event. It cannot
              override a weight variance, an off-spec assay or an arbitration hold.
            </Callout>
            <Callout tone="gold" icon={CircleAlert} title="PIN and device binding">
              A production session requires the registered phone number plus an agent PIN. Lost-device recovery is
              handled by the trade desk with identity re-verification.
            </Callout>
          </div>

          <div className="rounded-card border border-line bg-forest-900 p-5 text-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-forest-200">
                  <Phone size={12} className="text-harvest-300" /> Trade desk short code
                </p>
                <p className="mt-1 font-mono text-[26px] font-bold tracking-tight text-harvest-300">*347*44#</p>
                <p className="mt-1 text-[11px] text-forest-100/65">Available 07:00–19:00 WAT, including public holidays.</p>
              </div>
              <Button asChild variant="accent" size="md">
                <Link to="/register">
                  Open an account <ArrowRight size={15} />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
