import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  BadgeCheck, CircleAlert, Download, FlaskConical, Layers, Lock,
  MapPin, Package, RefreshCw, Scale, ShieldCheck, Sparkles, Wallet,
} from 'lucide-react'
import { PageHeader, Stat, EmptyState, Skeleton, Table, Th, Td, Tr } from '../components/ui/Data'
import { Card, CardHeader, CardBody, CardFooter, Callout } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { produceService } from '../lib/services'
import { money, qtyUnit, unitOne } from '../lib/format'
import { cn, downloadCsv, parseError } from '../lib/utils'

const LAB_MATRIX = [
  { label: 'Moisture limit', value: '≤ 12.5% max', note: 'Checked when the goods arrive' },
  { label: 'Aflatoxin limit', value: '< 10 ppb', note: 'Limit agreed for animal feed' },
  { label: 'Foreign matter', value: '≤ 2.0% max', note: 'A cleaning fee applies above the limit' },
  { label: 'Broken grains', value: '≤ 5.0% max', note: 'The grade drops above the limit' },
]

export default function BatchProcurement() {
  const [lots, setLots] = useState([])
  const [selected, setSelected] = useState([])
  const [offers, setOffers] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await produceService.list({ per_page: 60 })
      const rows = res.data?.data || res.data || []
      setLots(rows)
      setSelected(rows.map((lot) => lot.id))
      setError('')
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

  const chosen = useMemo(() => lots.filter((lot) => selected.includes(lot.id)), [lots, selected])

  const totals = useMemo(() => {
    const volume = chosen.reduce((sum, lot) => sum + Number(lot.quantity || 0), 0)
    const value = chosen.reduce((sum, lot) => sum + Number(lot.quantity || 0) * Number(lot.price || 0), 0)
    const units = [...new Set(chosen.map((lot) => String(lot.unit || '').trim()).filter(Boolean))]
    return { volume, value, unit: units.length === 1 ? units[0] : null, weighted: volume ? value / volume : 0 }
  }, [chosen])

  const targeted = chosen.filter((lot) => offers[lot.id] !== undefined && offers[lot.id] !== '')
  const targetValue = chosen.reduce((sum, lot) => {
    const offer = Number(offers[lot.id])
    const unitPrice = Number.isFinite(offer) && offer > 0 ? offer : Number(lot.price || 0)
    return sum + Number(lot.quantity || 0) * unitPrice
  }, 0)

  function toggle(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function exportProforma() {
    const rows = chosen.map((lot) => ({
      lot_id: lot.id,
      commodity: lot.commodity_name,
      supplier: lot.user?.name || '',
      origin: lot.location || '',
      quantity: lot.quantity,
      unit: lot.unit,
      asking_price: lot.price,
      counter_offer: offers[lot.id] || '',
    }))
    downloadCsv(`ramlp-batch-proforma-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  if (loading) {
    return (
      <div className="page-wrap page-pad">
        <Skeleton className="h-9 w-80" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="mt-5 h-72" />
      </div>
    )
  }

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="Buy in bulk"
        title="Buy from many farms at once"
        description="Put produce from different farms into one order, make an offer and pay once."
        actions={
          <Button variant="outline" size="md" onClick={load}>
            <RefreshCw size={15} /> Refresh lots
          </Button>
        }
      />

      {error && (
        <div className="mb-5">
          <Callout tone="critical" icon={CircleAlert} title="We cannot load the marketplace">
            {error}
          </Callout>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Layers} label="Lots in batch" value={`${chosen.length} / ${lots.length}`} hint="Across the exchange" />
        <Stat
          icon={Package}
          label="Combined volume"
          value={totals.volume ? qtyUnit(totals.volume, totals.unit || 'units') : '—'}
          hint={totals.unit ? 'Single unit basis' : 'Mixed units'}
        />
        <Stat icon={Wallet} label="Combined asking value" value={money(totals.value)} hint="Before negotiation" />
        <Stat
          icon={Scale}
          label="Weighted avg price"
          value={totals.weighted ? money(totals.weighted) : '—'}
          hint={totals.unit ? `per ${unitOne(totals.unit)}` : '—'}
          tone="sprout"
        />
      </div>

      {lots.length === 0 && !error ? (
        <div className="mt-5">
          <EmptyState
            icon={Package}
            title="No produce listed yet"
            description="You can group produce once farmers add listings. Then choose what you need and pay once."
          />
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-5">
            <Card>
              <CardHeader
                icon={Layers}
                title="Your bulk basket"
                description={`${chosen.length} supplier ${chosen.length === 1 ? 'listing' : 'listings'} grouped into one payment`}
                action={<Badge tone="outline" size="md">{money(targetValue)} batch value</Badge>}
              />
              <div className="hidden sm:block">
                <Table minWidth={780}>
                  <thead>
                    <tr>
                      <Th>Lot & supplier</Th>
                      <Th className="text-center">Volume</Th>
                      <Th>Asking / unit</Th>
                      <Th>Counter-offer</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {lots.map((lot) => {
                      const isSelected = selected.includes(lot.id)
                      const offer = offers[lot.id]
                      const hasOffer = offer !== undefined && offer !== ''
                      return (
                        <Tr key={lot.id} className={cn(!isSelected && 'opacity-60')}>
                          <Td>
                            <label className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggle(lot.id)}
                                className="mt-1 h-4 w-4 accent-forest-500"
                                aria-label={`Include lot ${lot.id}`}
                              />
                              <span className="min-w-0">
                                <span className="block font-semibold text-ink">Lot #{lot.id}</span>
                                <span className="mt-0.5 flex items-center gap-1 text-[11.5px] text-muted">
                                  <MapPin size={11} /> {lot.user?.name || 'Farmer'}
                                  {lot.location ? ` · ${lot.location}` : ''}
                                </span>
                              </span>
                            </label>
                          </Td>
                          <Td className="text-center font-semibold text-ink">
                            {qtyUnit(lot.quantity, lot.unit)}
                          </Td>
                          <Td className="text-muted">{money(lot.price)}</Td>
                          <Td>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={offer ?? ''}
                              disabled={!isSelected}
                              onChange={(e) => setOffers((prev) => ({ ...prev, [lot.id]: e.target.value }))}
                              placeholder="—"
                              className="input h-9 w-28 text-right tnum"
                              aria-label={`Counter-offer for lot ${lot.id}`}
                            />
                          </Td>
                          <Td>
                            {!isSelected ? (
                              <Badge tone="neutral" size="sm">Excluded</Badge>
                            ) : hasOffer ? (
                              <Badge tone="gold" size="sm">Counter-offer set</Badge>
                            ) : (
                              <Badge tone="outline" size="sm">Open to negotiate</Badge>
                            )}
                          </Td>
                        </Tr>
                      )
                    })}
                  </tbody>
                </Table>
              </div>

              <ul className="divide-y divide-line sm:hidden">
                {lots.map((lot) => {
                  const isSelected = selected.includes(lot.id)
                  return (
                    <li key={lot.id} className="p-4">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(lot.id)}
                          className="mt-0.5 h-4 w-4 accent-forest-500"
                          aria-label={`Include lot ${lot.id}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-ink">Lot #{lot.id}</span>
                            <span className="text-[11.5px] font-semibold text-muted">
                              {qtyUnit(lot.quantity, lot.unit)}
                            </span>
                          </span>
                          <span className="mt-0.5 block break-words text-[11.5px] text-muted">
                            {lot.user?.name || 'Farmer'}
                          </span>
                          <span className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-[12px] text-muted">Asking {money(lot.price)}</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={offers[lot.id] ?? ''}
                              disabled={!isSelected}
                              onChange={(e) => setOffers((prev) => ({ ...prev, [lot.id]: e.target.value }))}
                              placeholder="Counter"
                              className="input h-9 w-28 text-right tnum"
                              aria-label={`Counter-offer for lot ${lot.id}`}
                            />
                          </span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>

              <CardFooter className="justify-between text-[12px] text-muted">
                <span>
                  Total volume <span className="font-semibold text-ink">{qtyUnit(totals.volume, totals.unit || 'units')}</span>
                </span>
                <span>
                  Target value <span className="font-semibold text-forest-600">{money(targetValue)}</span>
                </span>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader
                icon={FlaskConical}
                title="Quality checks for this order"
                description="Applied to every item before the second payment is released"
                action={<Badge tone="outline" size="sm">SON / AFEX calibrated</Badge>}
              />
              <CardBody className="grid gap-3 sm:grid-cols-2">
                {LAB_MATRIX.map((item) => (
                  <div key={item.label} className="rounded-xl border border-line bg-canvas p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">{item.label}</p>
                    <p className="mt-1 font-display text-[16px] font-bold text-forest-600">{item.value}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{item.note}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader icon={Wallet} title="Payment breakdown" description="Live total for the items you picked" />
              <CardBody className="space-y-3">
                <div className="space-y-1.5 border-b border-line pb-3">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="text-muted">Consolidated produce ({chosen.length} {chosen.length === 1 ? 'lot' : 'lots'})</span>
                    <span className="font-semibold text-ink tnum">{money(targetValue)}</span>
                  </div>
                  {chosen.slice(0, 6).map((lot) => {
                    const offer = Number(offers[lot.id])
                    const unitPrice = Number.isFinite(offer) && offer > 0 ? offer : Number(lot.price || 0)
                    return (
                      <div key={lot.id} className="flex items-center justify-between pl-2 text-[11px] text-muted">
                        <span className="break-words pr-2">
                          Lot #{lot.id} · {qtyUnit(lot.quantity, lot.unit)}
                        </span>
                        <span className="tnum">{money(Number(lot.quantity || 0) * unitPrice)}</span>
                      </div>
                    )
                  })}
                  {chosen.length > 6 && (
                    <p className="pl-2 text-[11px] text-muted">+ {chosen.length - 6} further lots</p>
                  )}
                </div>

                <div className="space-y-2 border-b border-line pb-3 text-[12.5px]">
                  <div className="flex items-center justify-between text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-forest-500" /> Delivery across states
                    </span>
                    <span className="font-semibold text-ink">Quoted at checkout</span>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <FlaskConical size={14} className="text-forest-500" /> Moisture test
                    </span>
                    <Badge tone="verified" size="sm">Free · pilot</Badge>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Scale size={14} className="text-forest-500" /> Weight check
                    </span>
                    <Badge tone="verified" size="sm">Free · pilot</Badge>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Lock size={14} className="text-forest-500" /> Escrow holding fee
                    </span>
                    <span className="font-semibold text-ink">Subsidised</span>
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-canvas p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">Total to pay</p>
                  <p className="mt-1 font-display text-[22px] font-extrabold tracking-tight text-forest-600 tnum">
                    {money(targetValue)}
                  </p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
                    <BadgeCheck size={13} className="text-forest-500" />
                    {targeted.length} of {chosen.length} lots carry a counter-offer
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <Button
                    className="w-full"
                    disabled={!chosen.length}
                    onClick={() =>
                      toast.success(
                        `Bulk order sent for ${chosen.length} ${chosen.length === 1 ? 'listing' : 'listings'} · ${money(targetValue)}`,
                      )
                    }
                  >
                    <Lock size={15} /> Place bulk order
                  </Button>
                  <Button variant="outline" className="w-full" onClick={exportProforma} disabled={!chosen.length}>
                    <Download size={15} /> Export proforma invoice
                  </Button>
                </div>
              </CardBody>
            </Card>

            <Callout tone="sage" icon={Sparkles} title="Why buy together">
              One payment for everything. Offers go to every farmer at the same time, and the order is placed as soon as each one accepts.
            </Callout>
          </aside>
        </div>
      )}
    </div>
  )
}
