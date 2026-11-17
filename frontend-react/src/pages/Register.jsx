import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, ArrowRight, Building2, Check, Eye, EyeOff, MapPin, ShieldCheck, Sprout, Truck,
} from 'lucide-react'
import AuthShell from '../components/layout/AuthShell'
import { Button } from '../components/ui/Button'
import { Field, Input, RoleCard, Textarea } from '../components/ui/Form'
import { authService } from '../lib/services'
import { NIGERIA_STATES, hubsForState } from '../data/nigeria'
import { parseError } from '../lib/utils'
import { cn } from '../lib/utils'
import { useAuth } from '../store/auth'
import { roleHome } from '../lib/format'

const ROLES = [
  {
    value: 'farmer',
    icon: Sprout,
    title: 'Farmer',
    description: 'Sell your harvest and get paid.',
  },
  {
    value: 'buyer',
    icon: Building2,
    title: 'Buyer',
    description: 'Buy farm produce in bulk.',
  },
  {
    value: 'logistics_provider',
    icon: Truck,
    title: 'Transporter',
    description: 'Move goods and earn delivery pay.',
  },
]

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  password_confirmation: '',
  role: 'farmer',
  state: '',
  lga: '',
  address: '',
}

export default function Register() {
  const navigate = useNavigate()
  const adopt = useAuth((state) => state.adopt)
  const [form, setForm] = useState(emptyForm)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const hubs = useMemo(() => hubsForState(form.state), [form.state])
  const roleMeta = ROLES.find((role) => role.value === form.role)

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.state || !form.lga.trim() || !form.address.trim()) {
      setError('Please fill in all the boxes.')
      return
    }
    if (form.password.length < 8) {
      setError('Your password needs at least 8 characters.')
      return
    }
    if (form.password !== form.password_confirmation) {
      setError('The two passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await authService.register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        password_confirmation: form.password_confirmation,
        role: form.role,
        state: form.state,
        lga: form.lga.trim(),
        address: form.address.trim(),
      })

      const { token, user, needs_verification: needsVerification } = res.data || {}

      if (token && user && !needsVerification) {
        adopt(token, user)
        toast.success('Your account is ready. Welcome!')
        navigate(roleHome(user.role), { replace: true })
        return
      }

      setDone(true)
      toast.success('Account created. Check your email to finish.')
    } catch (err) {
      const data = err?.response?.data
      if (!err?.response) {
        setError('We could not reach the server. Check your internet and try again.')
      } else if (data?.errors) {
        const first = Object.values(data.errors)[0]
        setError(Array.isArray(first) ? first[0] : parseError(err))
      } else {
        setError(parseError(err))
      }
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthShell
        aside={{
          title: 'One small step left.',
          description: 'Open the link we sent to your email. Then sign in and start using your workspace.',
          points: ['Check your inbox and spam folder', 'Open the link in the email', 'Sign in with your password'],
        }}
      >
        <div className="rounded-card border border-line bg-white p-7 text-center shadow-card sm:p-9">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-forest-50 text-forest-600">
            <Check size={26} strokeWidth={2.5} />
          </span>
          <h1 className="mt-5 font-display text-[24px] font-extrabold tracking-[-0.02em] text-ink">
            Account created
          </h1>
          <p className="mt-2 text-[13.5px] leading-6 text-muted">
            We sent a link to <span className="font-semibold text-ink">{form.email}</span>. Open the link,
            then sign in to start.
          </p>
          <div className="mt-6 grid gap-2">
            <Button asChild size="lg">
              <Link to="/login">
                Go to sign in <ArrowRight size={16} />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="md">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      aside={{
        title: 'Choose the work you do.',
        description: 'Pick one role. We will set up the right workspace for you.',
        points: ['Your own dashboard', 'You only see your own trades', 'One account for all your business'],
      }}
    >
      <div className="rounded-card border border-line bg-white p-6 shadow-card sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label-caps text-forest-500">Create account</p>
            <h1 className="mt-2 font-display text-[26px] font-extrabold leading-8 tracking-[-0.02em] text-ink">
              Join RALMP
            </h1>
            <p className="mt-1.5 text-[13px] leading-5 text-muted">
              Fill in your details. It takes about two minutes.
            </p>
          </div>
          <ShieldCheck size={22} className="mt-1 shrink-0 text-forest-400" />
        </div>

        <form onSubmit={submit} className="mt-6 space-y-5">
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-soft">
              What kind of account do you need? <span className="text-harvest-500">*</span>
            </p>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {ROLES.map((role) => (
                <RoleCard
                  key={role.value}
                  active={form.role === role.value}
                  icon={role.icon}
                  title={role.title}
                  description={role.description}
                  onClick={() => update('role', role.value)}
                  className="p-3.5"
                />
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="reg-name" required className="sm:col-span-2">
              <Input
                id="reg-name"
                required
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g. Amina Ibrahim"
                autoComplete="name"
              />
            </Field>

            <Field label="Email" htmlFor="reg-email" required>
              <Input
                id="reg-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>

            <Field label="Phone number" htmlFor="reg-phone" hint="WhatsApp is best" required>
              <Input
                id="reg-phone"
                type="tel"
                required
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+234 800 000 0000"
                autoComplete="tel"
              />
            </Field>

            <Field label="State" htmlFor="reg-state" required>
              <select
                id="reg-state"
                required
                value={form.state}
                onChange={(e) => {
                  update('state', e.target.value)
                  update('lga', '')
                }}
                className="select"
              >
                <option value="">Choose your state</option>
                {NIGERIA_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </Field>

            <Field label="Local government area" htmlFor="reg-lga" required>
              <Input
                id="reg-lga"
                required
                list="lga-hubs"
                value={form.lga}
                onChange={(e) => update('lga', e.target.value)}
                placeholder={form.state ? 'Type your LGA' : 'Choose a state first'}
                autoComplete="address-level2"
              />
              <datalist id="lga-hubs">
                {hubs.map((hub) => (
                  <option key={hub} value={hub} />
                ))}
              </datalist>
            </Field>

            <Field label="Address" htmlFor="reg-address" required className="sm:col-span-2">
              <Textarea
                id="reg-address"
                required
                rows={2}
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="Farm, shop or office address"
                autoComplete="street-address"
              />
            </Field>

            <Field label="Password" htmlFor="reg-password" hint="At least 8 characters" required>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted transition hover:bg-sage-100 hover:text-ink"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>

            <Field label="Type password again" htmlFor="reg-password-confirm" required>
              <Input
                id="reg-password-confirm"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={form.password_confirmation}
                onChange={(e) => update('password_confirmation', e.target.value)}
                placeholder="Type it again"
                autoComplete="new-password"
              />
            </Field>
          </div>

          <div
            className={cn(
              'flex items-start gap-2.5 rounded-xl border p-3.5 text-[11.5px] leading-5',
              roleMeta?.value === 'farmer'
                ? 'border-forest-100 bg-forest-50 text-forest-700'
                : 'border-line bg-canvas text-muted',
            )}
          >
            <MapPin size={14} className="mt-0.5 shrink-0" />
            <p>
              {roleMeta?.value === 'farmer'
                ? 'We save where your farm is. That address shows on every lot you list.'
                : roleMeta?.value === 'buyer'
                  ? 'You can start buying once you sign in. Your buying limit is set when we confirm your business.'
                  : 'You can accept delivery jobs after we check your vehicle and insurance papers.'}
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-critical-200 bg-critical-50 px-3.5 py-2.5 text-[12px] font-medium text-critical-600">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Creating your account…' : `Create ${roleMeta?.title.toLowerCase()} account`}
            {!loading && <ArrowRight size={16} />}
          </Button>

          <p className="text-center text-[11.5px] leading-5 text-muted">
            By creating an account you agree to our trade rules, escrow terms and the dispute process.
          </p>
        </form>

        <div className="mt-5 border-t border-line pt-4 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-forest-600 hover:underline">
            <ArrowLeft size={13} /> Already have an account? Sign in
          </Link>
        </div>
      </div>
    </AuthShell>
  )
}
