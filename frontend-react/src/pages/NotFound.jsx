import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Compass, Home, Search, Sprout } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useAuth } from '../store/auth'
import { roleHome } from '../lib/format'

const LINKS = [
  { to: '/commodities', label: 'Spot exchange', note: 'Verified farm-gate lots' },
  { to: '/escrow', label: 'Escrow model', note: 'How milestone release works' },
  { to: '/login', label: 'Sign in', note: 'Open your workspace' },
]

export default function NotFound() {
  const { isLoggedIn, user } = useAuth()

  return (
    <div className="page-wrap page-pad">
      <div className="grid items-center gap-10 py-8 lg:grid-cols-[1fr_0.85fr] lg:py-16">
        <div>
          <p className="font-display text-[64px] font-extrabold leading-none tracking-[-0.04em] text-sage-400 sm:text-[88px]">
            404
          </p>
          <p className="label-caps mt-2 text-forest-500">Page not on the board</p>
          <h1 className="mt-2 max-w-lg font-display text-[28px] font-extrabold leading-9 tracking-[-0.02em] text-ink sm:text-[36px] sm:leading-[44px]">
            This route does not exist in the exchange.
          </h1>
          <p className="mt-3 max-w-md text-[13.5px] leading-6 text-muted">
            The link may be outdated, or the record may have been withdrawn. Nothing in the ledger has changed —
            use one of the routes below to get back to a live view.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <Button asChild size="lg">
              <Link to={isLoggedIn ? roleHome(user?.role) : '/'}>
                <Home size={15} /> {isLoggedIn ? 'Back to my workspace' : 'Back to the homepage'}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/commodities">
                <Search size={15} /> Browse the exchange
              </Link>
            </Button>
          </div>

          <Link
            to="/"
            className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted transition hover:text-forest-600"
          >
            <ArrowLeft size={13} /> Return to the landing page
          </Link>
        </div>

        <div className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-forest-50 text-forest-600">
              <Compass size={19} />
            </span>
            <div>
              <p className="font-display text-[14px] font-bold text-ink">Where to next</p>
              <p className="text-[10.5px] text-muted">Live routes on the platform</p>
            </div>
          </div>

          <ul className="mt-4 divide-y divide-line">
            {LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="group flex items-center gap-3 py-3 transition hover:text-forest-600"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-canvas text-forest-500">
                    <Sprout size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold text-ink group-hover:text-forest-600">
                      {link.label}
                    </span>
                    <span className="block text-[10.5px] text-muted">{link.note}</span>
                  </span>
                  <ArrowRight size={13} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-forest-600" />
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-4 border-t border-line pt-3 text-[10.5px] leading-4 text-muted">
            If you followed a link from an order email, the record may require sign-in with the account that
            placed it.
          </p>
        </div>
      </div>
    </div>
  )
}
