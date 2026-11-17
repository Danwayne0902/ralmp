import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react'
import AuthShell from '../components/layout/AuthShell'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Form'
import { useAuth } from '../store/auth'
import { roleHome } from '../lib/format'
import { parseError } from '../lib/utils'

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

    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    setLoading(true)
    try {
      const user = await login(email.trim(), password)
      toast.success(`Welcome back, ${user?.name?.split(' ')[0] || 'friend'}`)
      navigate(location.state?.from || roleHome(user?.role), { replace: true })
    } catch (err) {
      const data = err?.response?.data
      if (data?.code === 'email_unverified') {
        setError('Please open the link we sent to your email, then sign in again.')
      } else if (err?.response?.status === 422 || err?.response?.status === 401) {
        setError('Email or password is not correct. Please try again.')
      } else if (!err?.response) {
        setError('We could not reach the server. Check your internet and try again.')
      } else {
        setError(parseError(err))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="rounded-card border border-line bg-white p-6 shadow-card sm:p-8">
        <p className="label-caps text-forest-500">Sign in</p>
        <h1 className="mt-2 font-display text-[26px] font-extrabold leading-8 tracking-[-0.02em] text-ink">
          Welcome back
        </h1>
        <p className="mt-1.5 text-[13px] leading-5 text-muted">
          Use the email and password you signed up with.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Email" htmlFor="login-email" required>
            <div className="relative">
              <Mail size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
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
                placeholder="Your password"
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
            {loading ? 'Signing you in…' : 'Sign in'}
            {!loading && <ArrowRight size={16} />}
          </Button>
        </form>

        <p className="mt-5 text-center text-[12.5px] text-muted">
          New here?{' '}
          <Link to="/register" className="font-semibold text-forest-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>

      <p className="mt-5 flex items-start gap-2 px-1 text-[11.5px] leading-5 text-muted">
        <ShieldCheck size={13} className="mt-0.5 shrink-0 text-forest-500" />
        Your account opens the workspace that fits your role. You only see your own trades and money.
      </p>
    </AuthShell>
  )
}
