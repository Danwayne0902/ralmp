import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, Camera, Check, Sprout, Store, Truck, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { authService } from '../lib/services'
import { nigeriaStates, getLGAsForState } from '../data/nigeria'
import { Button, Field, Input, Select } from '../components/ui'

const roles = [
  { value: 'farmer', label: 'Farmer', desc: 'Sell your harvest', icon: Sprout },
  { value: 'buyer', label: 'Buyer', desc: 'Source fresh produce', icon: Store },
  { value: 'logistics_provider', label: 'Logistics', desc: 'Move goods to market', icon: Truck }
]

const perks = [
  'Free account setup',
  'Direct messaging with partners',
  'Secure, escrow-backed checkout',
  'Real-time order dashboards'
]

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', role: '', address: '',
    state: '', lga: '', password: '', password_confirmation: ''
  })
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const lgas = useMemo(() => getLGAsForState(form.state), [form.state])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function pickImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Profile image must be smaller than 2MB')
      return
    }
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.password_confirmation) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await authService.register({ ...form, profile_image: image })
      toast.success('Account created. You can sign in now.')
      navigate('/login')
    } catch (err) {
      const errors = err.response?.data?.errors
      setError(errors ? Object.values(errors).flat().join(', ') : err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-[100svh] bg-sand-50 lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-950 p-12 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-60" aria-hidden />
        <div className="pointer-events-none absolute -left-24 top-8 h-96 w-96 rounded-full bg-brand-600/35 blur-[120px]" aria-hidden />
        <div className="pointer-events-none absolute -right-12 bottom-8 h-80 w-80 rounded-full bg-lime-400/15 blur-[120px]" aria-hidden />

        <Link to="/" className="relative z-10 flex items-center gap-3">
          <img src="/brand/ralmp-logo-256.png" alt="RALMP" className="h-11 w-11 rounded-xl object-cover ring-1 ring-white/10" />
          <span className="leading-tight">
            <span className="block font-display text-lg font-extrabold tracking-tight text-white">RALMP</span>
            <span className="block text-2xs font-semibold uppercase tracking-[.2em] text-lime-300">Rural Agricultural Linkage</span>
          </span>
        </Link>

        <div className="relative z-10 max-w-md">
          <p className="text-2xs font-bold uppercase tracking-[.24em] text-lime-300">Get started</p>
          <h2 className="mt-4 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white">
            Join the network
            <br />
            <span className="text-gradient-brand">trading across Nigeria.</span>
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-white/55">
            Create one account to sell, source or haul — with verified partners and protected payments built in.
          </p>

          <ul className="mt-9 space-y-3">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lime-300/15 text-lime-300">
                  <Check size={13} strokeWidth={3} />
                </span>
                <span className="text-xs text-white/65">{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-2xs text-white/30">
          © {new Date().getFullYear()} RALMP · Rural Agricultural Linkage Management Program
        </p>
      </div>

      {/* Form column */}
      <div className="px-5 py-12 sm:px-8 lg:py-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-2xl"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/brand/ralmp-logo-256.png" alt="RALMP" className="h-11 w-11 rounded-xl object-cover ring-1 ring-black/5" />
            <span className="leading-tight">
              <span className="block font-display text-lg font-extrabold tracking-tight text-ink">RALMP</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[.18em] text-sand-400">Rural Agricultural Linkage</span>
            </span>
          </div>

          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Create your account</h1>
          <p className="mt-1.5 text-sm text-sand-500">
            Join thousands trading across Nigeria&apos;s agricultural supply chain.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div className="panel p-6 sm:p-7">
              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div>
              )}

              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="name" label="Full name" required>
                    <Input id="name" required placeholder="John Okafor" value={form.name} onChange={(e) => set('name', e.target.value)} />
                  </Field>
                  <Field id="phone" label="Phone" required>
                    <Input id="phone" required placeholder="+234 800 000 0000" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                  </Field>
                </div>

                <Field id="email" label="Email address" required>
                  <Input id="email" type="email" required placeholder="you@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
                </Field>

                <div>
                  <span className="label">I am joining as</span>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {roles.map((r) => {
                      const active = form.role === r.value
                      return (
                        <button
                          key={r.value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => set('role', r.value)}
                          className={`rounded-xl border p-3 text-left transition ${
                            active
                              ? 'border-brand-600 bg-brand-50 shadow-xs'
                              : 'border-[color:var(--hairline-strong)] bg-white hover:border-brand-300'
                          }`}
                        >
                          <span className={`grid h-8 w-8 place-items-center rounded-lg ${active ? 'bg-brand-600 text-white' : 'bg-sand-100 text-sand-500'}`}>
                            <r.icon size={16} />
                          </span>
                          <span className="mt-2 block text-sm font-bold text-ink">{r.label}</span>
                          <span className="block text-[10px] text-sand-400">{r.desc}</span>
                        </button>
                      )
                    })}
                  </div>
                  {!form.role && <p className="mt-1.5 text-[11px] text-sand-400">Select the role that matches how you&apos;ll use RALMP.</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="state" label="State" required>
                    <Select
                      id="state"
                      required
                      value={form.state}
                      onChange={(e) => { set('state', e.target.value); set('lga', '') }}
                    >
                      <option value="">Select state…</option>
                      {nigeriaStates.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </Field>
                  <Field id="lga" label="LGA" required>
                    <Select id="lga" required disabled={!form.state} value={form.lga} onChange={(e) => set('lga', e.target.value)}>
                      <option value="">Select LGA…</option>
                      {lgas.map((l) => <option key={l} value={l}>{l}</option>)}
                    </Select>
                  </Field>
                </div>

                <Field id="address" label="Address" required>
                  <Input id="address" required placeholder="123 Farm Road, Ikorodu" value={form.address} onChange={(e) => set('address', e.target.value)} />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="password" label="Password" required>
                    <Input id="password" type="password" required minLength={8} placeholder="At least 8 characters" value={form.password} onChange={(e) => set('password', e.target.value)} />
                  </Field>
                  <Field id="password_confirmation" label="Confirm password" required>
                    <Input id="password_confirmation" type="password" required minLength={8} placeholder="Repeat password" value={form.password_confirmation} onChange={(e) => set('password_confirmation', e.target.value)} />
                  </Field>
                </div>
              </div>
            </div>

            <div className="panel p-5">
              <p className="label">Profile photo <span className="font-normal normal-case text-sand-400">(optional)</span></p>
              <div className="flex items-center gap-4">
                <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-sand-300 bg-sand-50 text-sand-400">
                  {preview ? <img src={preview} alt="Profile preview" className="h-full w-full object-cover" /> : <Camera size={22} />}
                  {preview && (
                    <button
                      type="button"
                      onClick={() => { setImage(null); setPreview('') }}
                      className="absolute right-0 top-0 grid h-5 w-5 place-items-center rounded-bl-lg bg-ink-950/60 text-white"
                      aria-label="Remove photo"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
                <div>
                  <label className="btn-ghost btn-sm cursor-pointer">
                    <Upload size={14} /> Upload
                    <input type="file" accept="image/*" onChange={pickImage} className="hidden" />
                  </label>
                  <p className="mt-2 text-[11px] text-sand-400">JPG or PNG, up to 2MB.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button type="submit" size="lg" loading={loading} rightIcon={ArrowRight} className="w-full">
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-sand-500">
                <BadgeCheck size={13} className="text-brand-600" />
                Already registered?{' '}
                <Link to="/login" className="font-bold text-brand-700 hover:underline">Sign in</Link>
              </p>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
