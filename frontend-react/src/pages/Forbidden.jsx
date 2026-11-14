import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Building2, Lock, ShieldCheck, Sprout, Truck, UserCog } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useAuth } from '../store/auth'
import { roleHome, roleLabel } from '../lib/format'

const ROLE_ROUTES = [
  {
    role: 'farmer',
    icon: Sprout,
    label: 'Farm hub',
    note: 'Listings, orders and payouts',
    home: '/farmer',
    match: ['farmer'],
  },
  {
    role: 'buyer',
    icon: Building2,
    label: 'Procurement desk',
    note: 'Escrow orders and settlements',
    home: '/buyer',
    match: ['buyer'],
  },
  {
    role: 'logistics_provider',
    icon: Truck,
    label: 'Carrier dispatch',
    note: 'Haulage board and waybills',
    home: '/dispatch',
    match: ['logistics_provider'],
  },
  {
    role: 'admin',
    icon: ShieldCheck,
    label: 'Platform administration',
    note: 'Participants, analytics, exceptions',
    home: '/admin',
    match: ['admin'],
  },
]

export default function Forbidden() {
  const { user, isLoggedIn } = useAuth()
  const home = isLoggedIn ? roleHome(user?.role) : '/'
  const allowed = ROLE_ROUTES.filter((item) => item.match.includes(user?.role))
  const others = ROLE_ROUTES.filter((item) => !item.match.includes(user?.role))

  return (
    <div className="page-wrap page-pad">
      <div className="grid items-center gap-10 py-8 lg:grid-cols-[1fr_0.85fr] lg:py-16">
        <div>
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-critical-50 text-critical-600">
            <Lock size={22} />
          </span>
          <p className="label-caps mt-4 text-critical-600">403 · Access denied</p>
          <h1 className="mt-2 max-w-lg font-display text-[28px] font-extrabold leading-9 tracking-[-0.02em] text-ink sm:text-[36px] sm:leading-[44px]">
            This workspace is outside your role.
          </h1>
          <p className="mt-3 max-w-md text-[13.5px] leading-6 text-muted">
            {isLoggedIn
              ? `You are signed in as ${roleLabel(user?.role)}. Requests, settlement records and participant data are scoped to that operating position.`
              : 'You need to sign in to view this page. Access is scoped to the role registered on your account.'}
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <Button asChild size="lg">
              <Link to={home}>
                <ArrowLeft size={15} /> {isLoggedIn ? 'Back to my workspace' : 'Sign in'}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/commodities">
                Browse the exchange <ArrowRight size={15} />
              </Link>
            </Button>
          </div>

          <p className="mt-5 flex items-start gap-2 rounded-xl border border-line bg-white px-3.5 py-3 text-[11px] leading-5 text-muted">
            <UserCog size={13} className="mt-0.5 shrink-0 text-forest-500" />
            Need a different role? Role changes are made by platform administration. Suspended or unverified
            accounts may also be restricted until the review completes.
          </p>
        </div>

        <div className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
            {isLoggedIn ? 'Your available workspace' : 'Role-based workspaces'}
          </p>

          {allowed.length > 0 ? (
            <div className="mt-3">
              {allowed.map((item) => (
                <Link
                  key={item.role}
                  to={item.home}
                  className="flex items-center gap-3 rounded-xl border border-forest-100 bg-forest-50 px-4 py-3.5 transition hover:border-forest-300"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-forest-600">
                    <item.icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold text-forest-700">{item.label}</span>
                    <span className="block text-[10.5px] text-forest-700/70">{item.note}</span>
                  </span>
                  <ArrowRight size={14} className="text-forest-600" />
                </Link>
              ))}
            </div>
          ) : null}

          <p className="mt-4 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
            Other operating positions
          </p>
          <ul className="mt-2 divide-y divide-line">
            {others.map((item) => (
              <li key={item.role} className="flex items-center gap-3 py-2.5 opacity-60">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-canvas text-muted">
                  <item.icon size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-semibold text-ink-soft">{item.label}</span>
                  <span className="block text-[10px] text-muted">{item.note}</span>
                </span>
                <Lock size={12} className="shrink-0 text-muted" />
              </li>
            ))}
          </ul>

          <div className="mt-4 rounded-xl border border-line bg-canvas px-3.5 py-2.5">
            <p className="text-[10px] leading-4 text-muted">
              Access controls are enforced server-side. This page is a friendly explanation, not the security
              boundary.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
