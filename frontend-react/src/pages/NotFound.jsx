import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Compass, Home, Search, Sprout } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useAuth } from '../store/auth'
import { roleHome } from '../lib/format'

const LINKS = [
  { to: '/commodities', label: 'Marketplace', note: 'Produce for sale now' },
  { to: '/escrow', label: 'How escrow works', note: 'How the money is paid out' },
  { to: '/login', label: 'Sign in', note: 'Open your dashboard' },
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
          <p className="label-caps mt-2 text-forest-500">Page not found</p>
          <h1 className="mt-2 max-w-lg font-display text-[28px] font-extrabold leading-9 tracking-[-0.02em] text-ink sm:text-[36px] sm:leading-[44px]">
            We could not find this page.
          </h1>
          <p className="mt-3 max-w-md text-[13.5px] leading-6 text-muted">
            The link may be old, or the page may have moved. Nothing has changed in your account. Try one of the links below.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <Button asChild size="lg">
              <Link to={isLoggedIn ? roleHome(user?.role) : '/'}>
                <Home size={15} /> {isLoggedIn ? 'Go to my dashboard' : 'Back to home'}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/commodities">
                <Search size={15} /> See what is for sale
              </Link>
            </Button>
          </div>

          <Link
            to="/"
            className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted transition hover:text-forest-600"
          >
            <ArrowLeft size={13} /> Back to the home page
          </Link>
        </div>

        <div className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-forest-50 text-forest-600">
              <Compass size={19} />
            </span>
            <div>
              <p className="font-display text-[14px] font-bold text-ink">Try one of these</p>
              <p className="text-[10.5px] text-muted">Popular pages</p>
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
            If you opened a link from an email about an order, sign in with the account that placed it.
          </p>
        </div>
      </div>
    </div>
  )
}
