import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Camera, Check, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { produceService } from '../lib/services'
import PageHeader from '../components/PageHeader'
import { Button, Field, Input, Select, Skeleton, Textarea } from '../components/ui'

const categories = [
  { value: 'vegetables', label: '🥬 Vegetables' },
  { value: 'fruits', label: '🍎 Fruits' },
  { value: 'grains', label: '🌾 Grains & Cereals' },
  { value: 'tubers', label: '🥔 Tubers' },
  { value: 'legumes', label: '🫘 Legumes' },
  { value: 'spices', label: '🌶️ Spices & Herbs' }
]

const units = ['kg', 'bags', 'tons', 'pieces', 'cartons', 'buckets']

const empty = {
  commodity_name: '', category: '', description: '', price: '',
  quantity: '', unit: 'kg', location: '', harvest_date: '',
  expiry_date: '', availability_status: 'available', emoji: ''
}

export default function ListingForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const [form, setForm] = useState(empty)
  const [images, setImages] = useState([])
  const [previews, setPreviews] = useState([])
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!editing) return
    produceService
      .get(id)
      .then((res) => {
        const d = res.data
        setForm({
          commodity_name: d.commodity_name || '',
          category: d.category || '',
          description: d.description || '',
          price: Number(d.price) || '',
          quantity: Number(d.quantity) || '',
          unit: d.unit || 'kg',
          location: d.location || '',
          harvest_date: (d.harvest_date || '').slice(0, 10),
          expiry_date: (d.expiry_date || '').slice(0, 10),
          availability_status: d.availability_status || 'available',
          emoji: d.emoji || ''
        })
      })
      .catch(() => {
        toast.error('Could not load listing')
        navigate('/farmer/listings')
      })
      .finally(() => setLoading(false))
  }, [editing, id, navigate])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function pickImages(e) {
    const files = Array.from(e.target.files || []).slice(0, 5)
    setImages(files)
    setPreviews(files.map((f) => URL.createObjectURL(f)))
  }

  function removeImage(i) {
    setImages((list) => list.filter((_, n) => n !== i))
    setPreviews((list) => list.filter((_, n) => n !== i))
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = { ...form, images }
      if (editing) {
        await produceService.update(id, payload)
        toast.success('Listing updated')
      } else {
        await produceService.create(payload)
        toast.success('Listing created')
      }
      navigate('/farmer/listings')
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not save listing'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-sand-500 transition hover:text-brand-700"
      >
        <ArrowLeft size={16} /> Back to listings
      </button>

      <PageHeader
        eyebrow={editing ? 'Edit produce' : 'New produce'}
        title={editing ? 'Update listing' : 'Create a listing'}
        subtitle="Clear photos and accurate stock help buyers decide faster."
      />

      {loading ? (
        <div className="card max-w-3xl space-y-5 card-pad">
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-11 rounded-lg" />
            <Skeleton className="h-11 rounded-lg" />
          </div>
          <Skeleton className="h-28 rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-11 rounded-lg" />
            <Skeleton className="h-11 rounded-lg" />
            <Skeleton className="h-11 rounded-lg" />
          </div>
          <Skeleton className="h-11 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      ) : (
        <form onSubmit={submit} className="card max-w-3xl space-y-6 card-pad">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
              {error}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Commodity name" required htmlFor="commodity_name">
              <Input
                id="commodity_name"
                required
                placeholder="e.g. Fresh Tomatoes"
                value={form.commodity_name}
                onChange={(e) => set('commodity_name', e.target.value)}
              />
            </Field>
            <Field label="Category" required htmlFor="category">
              <Select id="category" required value={form.category} onChange={(e) => set('category', e.target.value)}>
                <option value="">Select category…</option>
                {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Description" htmlFor="description" hint="Describe quality, freshness and packaging.">
            <Textarea
              id="description"
              rows={3}
              placeholder="Describe quality, freshness, packaging…"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Price (₦)" required htmlFor="price">
              <Input
                id="price"
                required
                type="number"
                min="0"
                placeholder="20000"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
              />
            </Field>
            <Field label="Quantity" required htmlFor="quantity">
              <Input
                id="quantity"
                required
                type="number"
                min="1"
                placeholder="100"
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
              />
            </Field>
            <Field label="Unit" required htmlFor="unit">
              <Select id="unit" required value={form.unit} onChange={(e) => set('unit', e.target.value)}>
                {units.map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Location" required htmlFor="location">
            <Input
              id="location"
              required
              placeholder="e.g. Ikorodu, Lagos"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Harvest date" required htmlFor="harvest_date">
              <Input
                id="harvest_date"
                required
                type="date"
                value={form.harvest_date}
                onChange={(e) => set('harvest_date', e.target.value)}
              />
            </Field>
            <Field label="Expiry date" required htmlFor="expiry_date">
              <Input
                id="expiry_date"
                required
                type="date"
                value={form.expiry_date}
                onChange={(e) => set('expiry_date', e.target.value)}
              />
            </Field>
          </div>

          {editing && (
            <Field label="Availability" htmlFor="availability_status">
              <Select
                id="availability_status"
                value={form.availability_status}
                onChange={(e) => set('availability_status', e.target.value)}
              >
                <option value="available">Available</option>
                <option value="sold_out">Sold out</option>
                <option value="unavailable">Unavailable</option>
              </Select>
            </Field>
          )}

          <div>
            <span className="label">Product photos</span>
            <div className="flex flex-wrap gap-3">
              {previews.map((p, i) => (
                <div key={i} className="relative h-24 w-24 overflow-hidden rounded-xl border border-[color:var(--hairline-strong)]">
                  <img src={p} alt={`Preview ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label={`Remove photo ${i + 1}`}
                    className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-ink-950/70 text-white transition hover:bg-ink-950"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              <label className="grid h-24 w-24 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-sand-300 bg-sand-50 text-sand-400 transition hover:border-brand-400 hover:text-brand-600">
                <span className="flex flex-col items-center gap-1">
                  <Camera size={19} />
                  <span className="text-2xs font-semibold">Upload</span>
                </span>
                <input type="file" accept="image/*" multiple className="sr-only" onChange={pickImages} />
              </label>
            </div>
            <span className="help">Up to 5 images. JPEG or PNG.</span>
          </div>

          <Field label="Emoji" htmlFor="emoji" className="max-w-[120px]">
            <Input
              id="emoji"
              maxLength={2}
              className="text-center text-xl"
              placeholder="🌾"
              value={form.emoji}
              onChange={(e) => set('emoji', e.target.value)}
            />
          </Field>

          <div className="flex gap-3 border-t border-[color:var(--hairline)] pt-6">
            <Button type="submit" size="lg" loading={saving} leftIcon={Check} className="flex-1">
              {editing ? 'Save changes' : 'Create listing'}
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            {editing && (
              <Button
                type="button"
                variant="danger"
                size="lg"
                aria-label="Delete listing"
                onClick={async () => {
                  if (!window.confirm('Delete this listing permanently?')) return
                  try {
                    await produceService.remove(id)
                    toast.success('Listing deleted')
                    navigate('/farmer/listings')
                  } catch {
                    toast.error('Could not delete listing')
                  }
                }}
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
