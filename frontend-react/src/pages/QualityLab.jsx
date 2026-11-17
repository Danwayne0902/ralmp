import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Beaker, CalendarDays, Check, CheckCircle2, CircleAlert, ClipboardCheck,
  FileWarning, FlaskConical, Lock, MapPin, Microscope, RefreshCw, Scale, ShieldCheck,
  Sprout, ThermometerSun, Truck, Weight,
} from 'lucide-react'
import { PageHeader, Stat, Table, Th, Td, Tr, EmptyState, Skeleton } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Tabs } from '../components/ui/Tabs'
import { adminService } from '../lib/services'
import { fmtDate, num, qtyUnit } from '../lib/format'
import { parseError } from '../lib/utils'

const PROTOCOL = [
  {
    group: 'Cereals & grains',
    icon: Sprout,
    items: [
      { commodity: 'Yellow / white maize', moisture: '13.5%', tolerance: '≤ 1.0% difference', aflatoxin: '≤ 10 ppb' },
      { commodity: 'Rice paddy', moisture: '14.0%', tolerance: '≤ 1.0% difference', aflatoxin: '≤ 10 ppb' },
      { commodity: 'Sorghum', moisture: '13.0%', tolerance: '≤ 1.0% difference', aflatoxin: '≤ 10 ppb' },
      { commodity: 'Millet', moisture: '13.0%', tolerance: '≤ 1.0% difference', aflatoxin: '≤ 10 ppb' },
    ],
  },
  {
    group: 'Legumes & oilseeds',
    icon: Beaker,
    items: [
      { commodity: 'Soybean', moisture: '12.0%', tolerance: '≤ 1.0% difference', aflatoxin: '≤ 10 ppb' },
      { commodity: 'Cowpea', moisture: '12.0%', tolerance: '≤ 1.0% difference', aflatoxin: '≤ 10 ppb' },
      { commodity: 'Groundnut', moisture: '9.0%', tolerance: '≤ 1.0% difference', aflatoxin: '≤ 15 ppb' },
      { commodity: 'Sesame seed', moisture: '8.0%', tolerance: '≤ 1.0% difference', aflatoxin: '≤ 10 ppb' },
    ],
  },
  {
    group: 'Tubers & fresh produce',
    icon: ThermometerSun,
    items: [
      { commodity: 'Cassava tubers', moisture: 'Fresh weight basis', tolerance: '≤ 2.0% difference', aflatoxin: 'Not applicable' },
      { commodity: 'Yam tubers', moisture: 'Fresh weight basis', tolerance: '≤ 2.0% difference', aflatoxin: 'Not applicable' },
      { commodity: 'Tomatoes & peppers', moisture: 'Fresh weight basis', tolerance: '≤ 3.0% difference', aflatoxin: 'Not applicable' },
      { commodity: 'Onions', moisture: 'Cured, dry skin', tolerance: '≤ 3.0% difference', aflatoxin: 'Not applicable' },
    ],
  },
]

const STAGES = [
  { key: 'origin', label: 'What the farmer says', icon: Sprout, body: 'The farmer gives the type, harvest date and visible grade when listing. This is not a test result.' },
  { key: 'sample', label: 'Take a sealed sample', icon: Microscope, body: 'Someone at the drop-off point takes a sample, seals it and links it to the order. The transporter watches.' },
  { key: 'assay', label: 'Test the sample', icon: FlaskConical, body: 'A lab checks moisture, dirt and aflatoxin.' },
  { key: 'weigh', label: 'Compare the weights', icon: Weight, body: 'The drop-off weight is compared with the pickup weight within the agreed allowance.' },
  { key: 'release', label: 'Decide on payment', icon: Lock, body: 'A pass releases the 60% payment. A fail puts the rest on hold and opens a review.' },
]

const PERFORMED = [
  'Moisture content (oven or meter method)',
  'Foreign matter and broken grain percentage',
  'Aflatoxin screening against the contract band',
  'Live infestation and odour check',
  'Pickup weight check against the truck weight',
  'Seal integrity and carrier identity match',
]

function categoryGroup(category) {
  if (['grains', 'cereals'].includes(category)) return 'Cereals & grains'
  if (['legumes', 'oilseeds'].includes(category)) return 'Legumes & oilseeds'
  if (['tubers', 'vegetables', 'fruits'].includes(category)) return 'Tubers & fresh produce'
  return null
}

export default function QualityLab() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('queue')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await adminService.commodities({ per_page: 100 })
      setListings(res.data?.data || [])
    } catch (err) {
      setError(parseError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const queue = useMemo(
    () =>
      listings
        .filter((lot) => lot.availability_status === 'available')
        .map((lot) => ({
          ...lot,
          group: categoryGroup(lot.category),
          age: lot.harvest_date ? Math.floor((Date.now() - new Date(lot.harvest_date).getTime()) / 86400000) : null,
        }))
        .sort((a, b) => (b.age ?? 0) - (a.age ?? 0)),
    [listings],
  )

  const grouped = useMemo(() => {
    const counts = {}
    queue.forEach((lot) => {
      const key = lot.group || 'Unclassified'
      counts[key] = (counts[key] || 0) + 1
    })
    return counts
  }, [queue])

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="Quality checks"
        title="Quality and tests"
        description="The checks behind every payment. The list shows real produce. Results appear only when a lab sends them."
        actions={
          <>
            <Button variant="outline" size="md" onClick={load} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh queue
            </Button>
            <Button asChild variant="outline" size="md">
              <Link to="/admin/disputes"><FileWarning size={15} /> Exception queue</Link>
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
        <Stat icon={Microscope} label="Waiting for a test" value={queue.length} tone="gold" hint="Live produce without a result" />
        <Stat icon={FlaskConical} label="Produce groups" value={PROTOCOL.length} tone="sprout" hint="Cereals, legumes, fresh produce" />
        <Stat icon={Scale} label="Weight allowance" value="≤ 1.0%" hint="Standard order limit" />
        <Stat icon={ShieldCheck} label="Check steps" value={STAGES.length} tone="neutral" hint="From sample to decision" />
      </div>

      <div className="mt-5 rounded-card border border-harvest-200 bg-harvest-50 px-4 py-3.5">
        <p className="flex items-start gap-2 text-[11.5px] leading-5 text-harvest-700">
          <CircleAlert size={14} className="mt-0.5 shrink-0" />
          <span>
            <span className="font-bold">No made-up results:</span> we never invent moisture, aflatoxin or weight
            readings. The ranges below are the default template. The order itself sets the real range. The list shows what is waiting for a check, not a result.
          </span>
        </p>
      </div>

      <div className="mt-5">
        <Tabs
          value={tab}
          onValueChange={setTab}
          items={[
            { value: 'queue', label: 'Waiting for a check', count: queue.length },
            { value: 'protocol', label: 'Ranges and limits' },
            { value: 'workflow', label: 'How a check works' },
          ]}
          size="sm"
        />
      </div>

      {tab === 'queue' && (
        <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="min-w-0 space-y-4">
            <div className="rounded-card border border-line bg-white shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
                <div>
                  <h2 className="font-display text-[15px] font-bold text-ink">Waiting for a test</h2>
                  <p className="mt-0.5 text-[11px] text-muted">
                    Oldest harvest first. A sample is taken at the drop-off point, not when the produce is listed.
                  </p>
                </div>
                <Badge tone="live" size="sm"><span className="h-1.5 w-1.5 rounded-full bg-forest-500" /> Live produce</Badge>
              </div>

              {loading ? (
                <div className="space-y-2 p-5">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : queue.length === 0 ? (
                <EmptyState
                  icon={ClipboardCheck}
                  title="No produce waiting for a check"
                  description="When farmers list produce, it appears here for sampling. We never make up results."
                  className="border-0 shadow-none"
                  action={<Button asChild variant="outline"><Link to="/commodities">Open the exchange</Link></Button>}
                />
              ) : (
                <>
                  <div className="hidden md:block">
                    <Table minWidth={860}>
                      <thead>
                        <tr>
                          <Th>Lot</Th>
                          <Th>Farmer & origin</Th>
                          <Th>Harvested</Th>
                          <Th className="text-right">Volume</Th>
                          <Th>Protocol group</Th>
                          <Th>Inspection state</Th>
                          <Th />
                        </tr>
                      </thead>
                      <tbody>
                        {queue.map((lot) => (
                          <Tr key={lot.id}>
                            <Td>
                              <Link to={`/commodities/${lot.id}`} className="whitespace-nowrap font-semibold text-ink hover:text-forest-600">
                                {lot.commodity_name}
                              </Link>
                              <p className="whitespace-nowrap text-[10.5px] capitalize text-muted">Lot #{lot.id} · {lot.category}</p>
                            </Td>
                            <Td>
                              <p className="break-words text-[11.5px]">{lot.farmer?.name || lot.user?.name || 'Farmer'}</p>
                              <p className="flex items-center gap-1 text-[10px] text-muted">
                                <MapPin size={9} /> {lot.location || [lot.farmer?.lga, lot.farmer?.state].filter(Boolean).join(', ') || 'Origin not set'}
                              </p>
                            </Td>
                            <Td className="text-[11px] text-muted">{fmtDate(lot.harvest_date)}</Td>
                            <Td className="text-right tnum">{qtyUnit(lot.quantity, lot.unit)}</Td>
                            <Td>
                              <Badge tone="neutral" size="sm" className="whitespace-nowrap">{lot.group || 'Unclassified'}</Badge>
                            </Td>
                            <Td>
                              <Badge tone="pending" size="sm"><CalendarDays size={10} /> Awaiting sample</Badge>
                            </Td>
                            <Td>
                              <Button asChild variant="ghost" size="sm">
                                <Link to={`/commodities/${lot.id}`}>Open <ArrowRight size={12} /></Link>
                              </Button>
                            </Td>
                          </Tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  <ul className="divide-y divide-line md:hidden">
                    {queue.map((lot) => (
                      <li key={lot.id} className="px-4 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link to={`/commodities/${lot.id}`} className="block break-words text-[13px] font-bold text-ink">
                              {lot.commodity_name}
                            </Link>
                            <p className="break-words text-[10.5px] text-muted">{lot.farmer?.name || 'Farmer'} · {lot.location || 'Origin not set'}</p>
                          </div>
                          <Badge tone="pending" size="sm">Awaiting sample</Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10.5px]">
                          <span className="flex items-center gap-1 text-muted"><CalendarDays size={10} /> {fmtDate(lot.harvest_date)}</span>
                          <span className="font-semibold text-ink tnum">{num(lot.quantity)} {lot.unit}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="rounded-card border border-line bg-white p-5 shadow-card">
              <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
                <ClipboardCheck size={16} className="text-forest-500" /> What the laboratory reports
              </h2>
              <p className="mt-1 text-[11.5px] leading-5 text-muted">
                Every destination sample is tested against the same six control points before a release decision is
                written to the order.
              </p>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {PERFORMED.map((item) => (
                  <li key={item} className="flex items-start gap-2 rounded-xl border border-line bg-canvas px-3.5 py-2.5">
                    <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-forest-500" />
                    <span className="text-[11.5px] leading-5 text-ink-soft">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-card border border-line bg-white p-5 shadow-card">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Queue by protocol group</p>
              {loading ? (
                <div className="mt-3 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
              ) : Object.keys(grouped).length === 0 ? (
                <p className="mt-2 text-[11.5px] text-muted">Nothing queued.</p>
              ) : (
                <ul className="mt-2 divide-y divide-line">
                  {Object.entries(grouped).map(([group, count]) => (
                    <li key={group} className="flex items-center justify-between gap-2 py-2.5">
                      <span className="text-[11.5px] text-muted">{group}</span>
                      <span className="text-[12px] font-bold text-ink tnum">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 border-t border-line pt-3 text-[10px] leading-4 text-muted">
                Lots without a category mapping are grouped as unclassified and reviewed manually.
              </p>
            </div>

            <div className="rounded-card border border-line bg-forest-900 p-5 text-white shadow-card">
              <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-forest-200">
                <Lock size={12} className="text-harvest-300" /> Who can pause a payment
              </p>
              <p className="mt-2 text-[11.5px] leading-5 text-forest-100/80">
                If a test fails, the 60% payment stops at once. Only a signed re-test or a review decision can release it.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="dark" size="sm"><ShieldCheck size={10} /> Clear rules</Badge>
                <Badge tone="dark" size="sm"><Scale size={10} /> Same test for everyone</Badge>
              </div>
            </div>

            <div className="rounded-card border border-line bg-white p-4">
              <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
                <Truck size={12} /> Sampling logistics
              </p>
              <p className="mt-1.5 text-[11px] leading-5 text-muted">
                The carrier must present the sealed origin slip before a destination sample is drawn. Missing slips
                are routed to the exception queue instead of sampling.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-2.5 w-full">
                <Link to="/dispatch">Delivery jobs</Link>
              </Button>
            </div>
          </aside>
        </div>
      )}

      {tab === 'protocol' && (
        <div className="mt-4 space-y-4">
          {PROTOCOL.map((group) => (
            <div key={group.group} className="rounded-card border border-line bg-white shadow-card">
              <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-forest-50 text-forest-600">
                  <group.icon size={16} />
                </span>
                <div>
                  <h2 className="font-display text-[14.5px] font-bold text-ink">{group.group}</h2>
                  <p className="text-[10.5px] text-muted">Default check levels · the agreed levels are shown on each order</p>
                </div>
              </div>
              <Table minWidth={760}>
                <thead>
                  <tr>
                    <Th>Commodity</Th>
                    <Th className="text-right">Moisture</Th>
                    <Th className="text-right">Allowed weight difference</Th>
                    <Th className="text-right">Aflatoxin limit</Th>
                    <Th>What it unlocks</Th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => (
                    <Tr key={item.commodity}>
                      <Td className="font-semibold text-ink">{item.commodity}</Td>
                      <Td className="text-right tnum">{item.moisture}</Td>
                      <Td className="text-right tnum">{item.tolerance}</Td>
                      <Td className="text-right tnum">{item.aflatoxin}</Td>
                      <Td>
                        <Badge tone="verified" size="sm"><ShieldCheck size={10} /> 60% payment</Badge>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ))}

          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
              <Scale size={16} className="text-forest-500" /> Limit rules
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: 'Inside the range', body: 'The result is inside the agreed range, so the 60% payment can be approved.', tone: 'verified' },
                { title: 'Just outside', body: 'A result slightly outside the range gets a second sealed test before anything is held.', tone: 'pending' },
                { title: 'Failed', body: 'The rest of the money is held, the buyer is told and a complaint file is opened.', tone: 'critical' },
                { title: 'No proof', body: 'Without a sealed sample, no money is released. The rest stays on hold until the proof exists.', tone: 'neutral' },
              ].map((rule) => (
                <div key={rule.title} className="rounded-xl border border-line bg-canvas p-3.5">
                  <Badge tone={rule.tone} size="sm">{rule.title}</Badge>
                  <p className="mt-2 text-[10.5px] leading-4 text-muted">{rule.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'workflow' && (
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
              <Beaker size={16} className="text-forest-500" /> How a check works
            </h2>
            <p className="mt-1 text-[11.5px] leading-5 text-muted">
              Each step leaves a record. If a record is missing, the process stops. We never fill it in later.
            </p>
            <ol className="mt-5 space-y-4">
              {STAGES.map((stage, index) => (
                <li key={stage.key} className="relative flex gap-3.5">
                  {index < STAGES.length - 1 && (
                    <span className="absolute left-[17px] top-9 h-[calc(100%-1rem)] w-px bg-line" aria-hidden />
                  )}
                  <span className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-forest-600">
                    <stage.icon size={16} />
                  </span>
                  <div className="min-w-0 pb-1">
                    <p className="text-[12.5px] font-bold text-ink">
                      {index + 1}. {stage.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-5 text-muted">{stage.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-line bg-white p-4">
              <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
                <FlaskConical size={12} /> Who does the tests
              </p>
              <p className="mt-1.5 text-[11px] leading-5 text-muted">
                A qualified lab does the test. The lab name is saved on the order so anyone can check where the result came from.
              </p>
            </div>

            <div className="rounded-card border border-forest-100 bg-forest-50 p-4">
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-forest-700">
                <Check size={13} /> Why it matters
              </p>
              <p className="mt-1 text-[10.5px] leading-4 text-forest-700/75">
                Buyers often pay for goods they have not seen. The test is what makes buying from far away safe.
              </p>
            </div>
          </aside>
        </div>
      )}

      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-line bg-white p-4">
        <CircleAlert size={15} className="mt-0.5 shrink-0 text-harvest-500" />
        <p className="text-[11px] leading-5 text-muted">
          The queue lists lots whose destination sample has not yet been filed. It does not assert that any lot is
          off-spec. Measured values are written to a lot only when the laboratory result is attached to an order.
        </p>
      </div>
    </div>
  )
}
