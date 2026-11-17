import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, ArrowRight, CalendarDays, Camera, Check, CircleAlert,
  ImagePlus, Info, Loader2, MapPin, Package, Save, Sprout, Upload, X,
} from 'lucide-react'
import { PageHeader, Loading } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Field, Input, NativeSelect, Textarea } from '../components/ui/Form'
import { Callout } from '../components/ui/Card'
import { produceService } from '../lib/services'
import { money, unitOne } from '../lib/format'
import { CATEGORY_META, CATEGORY_OPTIONS, TRADE_UNITS } from '../data/nigeria'
import { imgUrl } from '../lib/format'
import { parseError, cn } from '../lib/utils'
import { useAuth } from '../store/auth'

const COMMODITY_SUGGESTIONS = [
  'Yellow Maize', 'White Maize', 'Rice Paddy', 'Soybean', 'Cowpea', 'Groundnut',
  'Sorghum', 'Millet', 'Cassava Tubers', 'Yam Tubers', 'Irish Potato', 'Sweet Potato',
  'Tomatoes', 'Onions', 'Pepper', 'Plantain', 'Ginger', 'Sesame Seed',
]

const STEPS = [
  { id: 1, label: 'Lot detail' },
  { id: 2, label: 'Pricing & timing' },
  { id: 3, label: 'Photos & publish' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function plusDays(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export default function ListingForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    commodity_name: '',
    category: 'grains',
    quantity: '',
    unit: 'bags',
    price: '',
    location: [user?.lga, user?.state].filter(Boolean).join(', '),
    harvest_date: today(),
    expiry_date: plusDays(30),
    description: '',
    availability_status: 'available',
  })
  const [existingImages, setExistingImages] = useState([])
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) return
    let active = true
    produceService
      .get(id)
      .then((lot) => {
        if (!active || !lot?.id) {
          setError('This lot could not be found.')
          return
        }
        if (lot.user_id !== user?.id) {
          setError('You can only edit lots that belong to your account.')
          return
        }
        setForm({
          commodity_name: lot.commodity_name || '',
          category: lot.category || 'grains',
          quantity: lot.quantity ?? '',
          unit: lot.unit || 'bags',
          price: lot.price ?? '',
          location: lot.location || '',
          harvest_date: lot.harvest_date?.slice(0, 10) || today(),
          expiry_date: lot.expiry_date?.slice(0, 10) || plusDays(30),
          description: lot.description || '',
          availability_status: lot.availability_status || 'available',
        })
        setExistingImages(lot.images || [])
      })
      .catch((err) => {
        if (active) setError(parseError(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id, isEdit, user?.id])

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [files])

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function pickFiles(event) {
    const picked = Array.from(event.target.files || [])
    const accepted = picked.filter((file) => file.type.startsWith('image/') && file.size <= 2 * 1024 * 1024)
    if (accepted.length !== picked.length) {
      toast.error('Images must be JPG, PNG or GIF under 2 MB each')
    }
    setFiles((prev) => [...prev, ...accepted].slice(0, 5))
    if (fileRef.current) fileRef.current.value = ''
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const quantity = Number(form.quantity) || 0
  const price = Number(form.price) || 0
  const boardValue = quantity * price
  const categoryMeta = CATEGORY_META[form.category]

  const stepValid = useMemo(() => {
    if (step === 1) return Boolean(form.commodity_name.trim() && form.category && form.description.trim().length >= 10)
    if (step === 2) return quantity > 0 && price > 0 && form.unit && form.location.trim() && form.expiry_date > form.harvest_date
    return true
  }, [step, form, quantity, price])

  function goNext() {
    if (!stepValid) {
      toast.error(
        step === 1
          ? 'Add a commodity, category and a short description (10+ characters).'
          : 'Enter volume, price, unit, farm-gate location and an expiry that falls after the harvest date.',
      )
      return
    }
    setStep((value) => Math.min(3, value + 1))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (!form.commodity_name.trim() || !form.location.trim()) {
      setError('Commodity name and farm-gate location are required.')
      return
    }
    if (quantity <= 0 || price <= 0) {
      setError('Volume and price must be greater than zero.')
      return
    }
    if (form.expiry_date <= form.harvest_date) {
      setError('Expiry date must fall after the harvest date.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        commodity_name: form.commodity_name.trim(),
        category: form.category,
        quantity,
        unit: form.unit,
        price,
        location: form.location.trim(),
        harvest_date: form.harvest_date,
        expiry_date: form.expiry_date,
        description: form.description.trim(),
        ...(isEdit ? { availability_status: form.availability_status } : {}),
        ...(files.length ? { images: files } : {}),
      }

      if (isEdit) {
        await produceService.update(id, payload)
        toast.success('Lot updated on the exchange')
      } else {
        await produceService.create(payload)
        toast.success('Harvest published to the spot exchange')
      }
      navigate('/farmer/listings')
    } catch (err) {
      setError(parseError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-wrap page-pad">
        <Loading label="Loading lot record" />
      </div>
    )
  }

  if (error && isEdit && !form.commodity_name) {
    return (
      <div className="page-wrap page-pad">
        <PageHeader
          eyebrow="Farm hub · listing"
          title="Edit harvest lot"
          description="Update the farm-gate terms on this lot. Changes are written to the listing the moment they are saved."
        />
        <Callout tone="critical" icon={CircleAlert} title="Lot not editable">
          {error}
        </Callout>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/farmer/listings"><ArrowLeft size={14} /> Back to my lots</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow={isEdit ? 'Farm hub · edit lot' : 'Farm hub · new listing'}
        title={isEdit ? 'Edit harvest lot' : 'Publish a harvest lot'}
        description={
          isEdit
            ? 'Changes go live on the exchange immediately. Buyers see the updated price and volume.'
            : 'Three short steps. Listing is free; buyers fund escrow before anything leaves your gate.'
        }
        actions={
          <Button asChild variant="ghost" size="md">
            <Link to="/farmer/listings"><ArrowLeft size={15} /> My lots</Link>
          </Button>
        }
      />

      <ol className="mb-6 grid gap-2 sm:grid-cols-3">
        {STEPS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setStep(item.id)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition',
                step === item.id
                  ? 'border-forest-500 bg-forest-50'
                  : step > item.id
                    ? 'border-forest-100 bg-white'
                    : 'border-line bg-white hover:border-sage-400',
              )}
            >
              <span
                className={cn(
                  'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10.5px] font-bold',
                  step > item.id
                    ? 'bg-forest-500 text-white'
                    : step === item.id
                      ? 'bg-forest-900 text-white'
                      : 'bg-sage-100 text-muted',
                )}
              >
                {step > item.id ? <Check size={12} strokeWidth={3} /> : item.id}
              </span>
              <span className="text-[12px] font-semibold text-ink">{item.label}</span>
            </button>
          </li>
        ))}
      </ol>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <div className={cn('rounded-card border border-line bg-white p-5 shadow-card sm:p-6', step !== 1 && 'hidden lg:block')}>
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
              <Sprout size={16} className="text-forest-500" /> What are you selling?
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Commodity name" className="sm:col-span-2" hint="Use the common market name" required>
                <Input
                  list="commodity-suggestions"
                  value={form.commodity_name}
                  onChange={(e) => update('commodity_name', e.target.value)}
                  placeholder="e.g. Yellow Maize"
                  required
                />
                <datalist id="commodity-suggestions">
                  {COMMODITY_SUGGESTIONS.map((name) => <option key={name} value={name} />)}
                </datalist>
              </Field>

              <Field label="Category" required>
                <NativeSelect value={form.category} onChange={(e) => update('category', e.target.value)}>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </NativeSelect>
              </Field>

              <div className="rounded-xl border border-line bg-canvas px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Category guidance</p>
                <p className="mt-1 text-[11.5px] leading-5 text-muted">{categoryMeta?.blurb}</p>
              </div>

              <Field label="Lot description" className="sm:col-span-2" hint={`${form.description.length}/1000`} required>
                <Textarea
                  rows={5}
                  maxLength={1000}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Variety, grade, farm practice, bagging, moisture at harvest, aggregation point, collection constraints…"
                  required
                />
              </Field>
            </div>

            <div className="mt-5 flex justify-end">
              <Button type="button" onClick={goNext}>
                Continue to pricing <ArrowRight size={15} />
              </Button>
            </div>
          </div>

          <div className={cn('rounded-card border border-line bg-white p-5 shadow-card sm:p-6', step !== 2 && 'hidden lg:block')}>
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
              <Package size={16} className="text-forest-500" /> Volume, price & timing
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Available volume" required>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={form.quantity}
                  onChange={(e) => update('quantity', e.target.value)}
                  placeholder="e.g. 250"
                  required
                />
              </Field>

              <Field label="Unit of trade" required>
                <NativeSelect value={form.unit} onChange={(e) => update('unit', e.target.value)}>
                  {TRADE_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                </NativeSelect>
              </Field>

              <Field label="Farm-gate price per unit (₦)" hint="Buyers pay this plus freight" required>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  prefix="₦"
                  value={form.price}
                  onChange={(e) => update('price', e.target.value)}
                  placeholder="e.g. 42000"
                  required
                />
              </Field>

              <Field label="Farm-gate location" hint="LGA, state" required>
                <div className="relative">
                  <MapPin size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                  <Input
                    value={form.location}
                    onChange={(e) => update('location', e.target.value)}
                    placeholder="e.g. Ijebu-Ife, Ogun state"
                    className="pl-10"
                    required
                  />
                </div>
              </Field>

              <Field label="Harvest date" required>
                <Input
                  type="date"
                  max={today()}
                  value={form.harvest_date}
                  onChange={(e) => update('harvest_date', e.target.value)}
                  required
                />
              </Field>

              <Field label="Expected shelf expiry" hint="Must be after harvest" required>
                <Input
                  type="date"
                  min={form.harvest_date}
                  value={form.expiry_date}
                  onChange={(e) => update('expiry_date', e.target.value)}
                  required
                />
              </Field>

              {isEdit && (
                <Field label="Availability state" className="sm:col-span-2" hint="Paused lots remain editable but are hidden">
                  <NativeSelect
                    value={form.availability_status}
                    onChange={(e) => update('availability_status', e.target.value)}
                  >
                    <option value="available">Available / live</option>
                    <option value="out_of_stock">Out of stock</option>
                    <option value="unavailable">Paused / unavailable</option>
                  </NativeSelect>
                </Field>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-line bg-canvas p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-muted">Total value at this price</p>
                <p className="font-display text-[18px] font-extrabold text-forest-600 tnum">{money(boardValue)}</p>
              </div>
              <p className="mt-1 text-[10.5px] text-muted tnum">
                {quantity.toLocaleString('en-NG')} {form.unit} × {money(price)}
              </p>
            </div>

            <div className="mt-5 flex justify-between gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft size={14} /> Back
              </Button>
              <Button type="button" onClick={goNext}>
                Continue to photos <ArrowRight size={15} />
              </Button>
            </div>
          </div>

          <div className={cn('rounded-card border border-line bg-white p-5 shadow-card sm:p-6', step !== 3 && 'hidden lg:block')}>
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
              <Camera size={16} className="text-forest-500" /> Photography & publish
            </h2>
            <p className="mt-1 text-[11.5px] leading-5 text-muted">
              Up to five images, JPG/PNG/GIF under 2 MB each. Clear daylight shots of the actual lot materially
              improve buyer conversion.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {existingImages.map((image) => (
                <div key={image} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-sage-100">
                  <img src={imgUrl(image)} alt="" className="h-full w-full object-cover" />
                  <span className="absolute left-1.5 top-1.5 rounded bg-forest-900/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    Saved
                  </span>
                </div>
              ))}
              {previews.map((src, index) => (
                <div key={src} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-sage-100">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    aria-label="Remove image"
                    className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-md bg-white/95 text-critical-600 shadow-sm"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-sage-400 bg-canvas text-muted transition hover:border-forest-400 hover:bg-forest-50 hover:text-forest-600"
              >
                <ImagePlus size={20} />
                <span className="text-[10.5px] font-semibold">Add image</span>
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              multiple
              onChange={pickFiles}
              className="hidden"
            />

            {files.length > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-harvest-600">
                <Info size={11} />
                {isEdit
                  ? 'New uploads replace the existing gallery when saved.'
                  : `${files.length} image${files.length === 1 ? '' : 's'} ready to upload.`}
              </p>
            )}

            {error && (
              <p className="mt-4 rounded-lg border border-critical-200 bg-critical-50 px-3.5 py-2.5 text-[12px] font-medium text-critical-600">
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-wrap justify-between gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                <ArrowLeft size={14} /> Back
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link to="/farmer/listings">Cancel</Link>
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 size={15} className="animate-spin" /> : isEdit ? <Save size={15} /> : <Upload size={15} />}
                  {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Publish to exchange'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4 self-start lg:sticky lg:top-24">
          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="border-b border-line px-5 py-3.5">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Buyer-facing preview</p>
            </div>
            <div className="p-4">
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-sage-100">
                {previews[0] || existingImages[0] ? (
                  <img
                    src={previews[0] || imgUrl(existingImages[0])}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-forest-300">
                    <Sprout size={34} strokeWidth={1.4} />
                  </div>
                )}
                <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[9.5px] font-bold uppercase tracking-wide text-muted">
                  {categoryMeta?.label || 'Produce'}
                </span>
              </div>
              <h3 className="mt-3 font-display text-[14.5px] font-bold text-ink">
                {form.commodity_name || 'Your commodity name'}
              </h3>
              <p className="mt-1 flex items-center gap-1 text-[10.5px] text-muted">
                <MapPin size={10} /> {form.location || 'Farm-gate location'}
              </p>
              <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
                <div>
                  <p className="font-display text-[20px] font-extrabold tracking-tight text-forest-600 tnum">
                    {price ? money(price) : '₦0'}
                  </p>
                  <p className="text-[10px] text-muted">per {unitOne(form.unit)}</p>
                </div>
                <p className="text-[10.5px] text-muted tnum">
                  {quantity ? `${quantity.toLocaleString('en-NG')} ${form.unit}` : '0 available'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-card border border-line bg-white p-4">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Listing checklist</p>
            <ul className="mt-2.5 space-y-2">
              {[
                { done: Boolean(form.commodity_name), label: 'Commodity identified' },
                { done: form.description.trim().length >= 10, label: 'Description added' },
                { done: quantity > 0 && price > 0, label: 'Volume and price set' },
                { done: Boolean(form.location), label: 'Farm-gate origin set' },
                { done: form.expiry_date > form.harvest_date, label: 'Harvest window valid' },
                { done: files.length > 0 || existingImages.length > 0, label: 'At least one photo' },
              ].map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-[11px]">
                  <span
                    className={cn(
                      'grid h-4 w-4 shrink-0 place-items-center rounded-full',
                      item.done ? 'bg-forest-500 text-white' : 'border border-sage-400 bg-white',
                    )}
                  >
                    {item.done && <Check size={9} strokeWidth={4} />}
                  </span>
                  <span className={item.done ? 'text-ink-soft' : 'text-muted'}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <Callout tone="gold" icon={CalendarDays} title="Harvest window matters">
            Buyers filter on harvest freshness. Keep the harvest date accurate — declaring an old harvest as fresh
            can trigger a quality dispute at the destination lab.
          </Callout>

          <div className="rounded-card border border-forest-100 bg-forest-50 p-4">
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-forest-700">
              <Check size={13} /> Free to list
            </p>
            <p className="mt-1 text-[10.5px] leading-4 text-forest-700/75">
              RALMP does not charge you to list. There is no platform fee at checkout during the pilot.
            </p>
          </div>
        </aside>
      </form>
    </div>
  )
}
