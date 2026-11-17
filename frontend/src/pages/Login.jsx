import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, Eye, EyeOff, Leaf, Lock, Mail, ShieldCheck, Truck } from 'lucide-react'
import { useAuth } from '../store/auth'
import { roleHome } from '../lib/format'
import { Button, Field, Input } from '../components/ui'

const features = [
  { icon: ShieldCheck, text: 'Escrow-backed payments on every order' },
  { icon: Truck, text: 'Live logistics tracking from farm gate' },
  { icon: BadgeCheck, text: 'Verified farmers, buyers and haulers' }
]

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      const redirect = params.get('redirect')
      navigate(redirect || roleHome(user?.role), { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-[100svh] lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-950 p-12 lg:flex lg:flex-col lg:justify-between">
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
          <p className="text-2xs font-bold uppercase tracking-[.24em] text-lime-300">Welcome back</p>
          <h2 className="mt-4 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white">
            Your harvest,
            <br />
            <span className="text-gradient-brand">your market.</span>
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-white/55">
            Sign in to manage listings, track orders and keep every delivery moving across Nigeria.
          </p>

          <div className="mt-9 space-y-3">
            {features.map((f) => (
              <div key={f.text} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-lime-300/10 text-lime-300">
                  <f.icon size={15} />
                </span>
                <span className="text-xs text-white/65">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-2xs text-white/30">
          © {new Date().getFullYear()} RALMP · Rural Agricultural Linkage Management Program
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-sand-50 px-5 py-14 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/brand/ralmp-logo-256.png" alt="RALMP" className="h-11 w-11 rounded-xl object-cover ring-1 ring-black/5" />
            <span className="font-display text-lg font-extrabold tracking-tight text-ink">RALMP</span>
          </div>

          <div className="panel p-6 sm:p-7">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Sign in</h1>
            <p className="mt-1.5 text-sm text-sand-500">
              New to RALMP?{' '}
              <Link to="/register" className="font-bold text-brand-700 hover:underline">Create an account</Link>
            </p>

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4">
              <Field id="email" label="Email address" required>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sand-400" />
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    className="pl-10"
                  />
                </div>
              </Field>

              <Field id="password" label="Password" required>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sand-400" />
                  <Input
                    id="password"
                    type={show ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="pl-10 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-sand-400 transition hover:bg-sand-100 hover:text-ink"
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-sand-400">
                  <Leaf size={12} className="text-brand-600" /> Secure session
                </span>
                <button type="button" className="font-semibold text-brand-700 hover:underline">Forgot password?</button>
              </div>

              <Button type="submit" size="lg" loading={loading} rightIcon={ArrowRight} className="w-full">
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
