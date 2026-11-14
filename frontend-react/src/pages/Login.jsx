import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowRight, Building2, Eye, EyeOff, Lock, Mail, ShieldCheck, Sprout, Truck } from 'lucide-react'
import AuthShell from '../components/layout/AuthShell'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Form'
import { useAuth } from '../store/auth'
import { roleHome } from '../lib/format'
import { parseError } from '../lib/utils'

const DEMO_ACCOUNTS = [
  { role: 'Buyer', email: 'buyer@ramlp.com', icon: Building2 },
  { role: 'Farmer', email: 'farmer@ramlp.com', icon: Sprout },
  { role: 'Admin', email: 'admin@ramlp.com', icon: ShieldCheck },
]

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuth((state) => state.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email.trim(), password)
      toast.success(`Welcome back, ${user?.name?.split(' ')[0] || 'member'}`)
      navigate(location.state?.from || roleHome(user?.role), { replace: true })
    } catch (err) {
      setError(parseError(err))
    } finally {
      setLoading(false)
    }
  }

  function useDemo(account) {
    setEmail(account.email)
    setPassword('password')
    setError('')
  }

  return (
    <AuthShell>
      <div className="rounded-card border border-line bg-white p-6 shadow-card sm:p-8">
        <p className="label-caps text-forest-500">Secure sign-in</p>
        <h1 className="mt-2 font-display text-[26px] font-extrabold leading-8 tracking-[-0.02em] text-ink">
          Access your workspace
        </h1>
        <p className="mt-1.5 text-[13px] leading-5 text-muted">
          Use the email registered with your account. Your role determines the workspace you land in.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Email address" htmlFor="login-email" required>
            <div className="relative">
              <Mail size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="pl-10"
              />
            </div>
          </Field>

          <Field label="Password" htmlFor="login-password" required>
            <div className="relative">
              <Lock size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="pl-10 pr-11"
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

          {error && (
            <p className="rounded-lg border border-critical-200 bg-critical-50 px-3.5 py-2.5 text-[12px] font-medium text-critical-600">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Verifying credentials…' : 'Sign in'}
            {!loading && <ArrowRight size={16} />}
          </Button>
        </form>

        <p className="mt-5 text-center text-[12.5px] text-muted">
          New to the platform?{' '}
          <Link to="/register" className="font-semibold text-forest-600 hover:underline">
            Open an account
          </Link>
        </p>

        <div className="mt-6 rounded-xl border border-line bg-canvas p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Demonstration accounts</p>
          <p className="mt-1 text-[11.5px] text-muted">Password for all demo accounts: <span className="font-mono font-semibold text-ink">password</span></p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => useDemo(account)}
                className="flex items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-2 text-left text-[11.5px] font-semibold text-ink-soft transition hover:border-forest-300 hover:bg-forest-50"
              >
                <account.icon size={14} className="text-forest-600" />
                {account.role}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-5 flex items-start gap-2 px-1 text-[11px] leading-5 text-muted">
        <Truck size={13} className="mt-0.5 shrink-0 text-forest-500" />
        Logistics carriers sign in with the provider account issued at onboarding. Contact the trade desk if
        your dispatch access is not visible.
      </p>
    </AuthShell>
  )
}
