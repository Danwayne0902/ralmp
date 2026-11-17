import { Link } from 'react-router-dom'
import { ArrowUpRight, Mail, MapPin, ShieldCheck } from 'lucide-react'

const COLUMNS = [
  {
    title: 'Marketplace',
    links: [
      { label: 'Marketplace', to: '/commodities' },
      { label: 'How escrow works', to: '/escrow' },
      { label: 'Create an account', to: '/register' },
    ],
  },
  {
    title: 'Join us',
    links: [
      { label: 'Join as a farmer', to: '/register' },
      { label: 'Join as a buyer', to: '/register' },
      { label: 'Join as a transporter', to: '/register' },
    ],
  },
  {
    title: 'Learn more',
    links: [
      { label: 'How payments work', to: '/escrow' },
      { label: 'Marketplace', to: '/commodities' },
      { label: 'Sign in', to: '/login' },
    ],
  },
]

const REGULATORS = ['Real farmers', 'Safe payments', 'Honest weights', 'Fair review']

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-forest-700/20 bg-forest-900 text-white">
      <div className="page-wrap py-12 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.35fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <img src="/brand/ralmp-logo-256.png" alt="" className="h-10 w-10 rounded-lg object-cover" />
              <span className="leading-none">
                <span className="block font-display text-[19px] font-extrabold tracking-[-0.02em]">RALMP</span>
                <span className="mt-1 block text-[9.5px] font-semibold uppercase tracking-[0.2em] text-forest-200">
                  AgroLink Continental
                </span>
              </span>
            </div>
            <p className="mt-4 text-[13px] leading-6 text-forest-100/75">
              We link farmers to buyers across Nigeria. Every trade is checked and paid
              through a safe escrow account, so both sides are protected.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-forest-700 px-3 py-1.5 text-[11px] font-semibold text-forest-100">
              <ShieldCheck size={13} className="text-harvest-300" />
              Built for safe farm trade
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-forest-300">{column.title}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="group inline-flex items-center gap-1 text-[13px] text-forest-100/80 transition hover:text-white"
                    >
                      {link.label}
                      <ArrowUpRight
                        size={12}
                        className="opacity-0 transition group-hover:opacity-100"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 border-t border-forest-700/60 pt-7 sm:grid-cols-3">
          <p className="flex items-start gap-2.5 text-[12px] leading-5 text-forest-100/70">
            <MapPin size={14} className="mt-0.5 shrink-0 text-harvest-300" />
            Built in Nigeria for farms and buyers across the country.
          </p>
          <p className="flex items-start gap-2.5 text-[12px] leading-5 text-forest-100/70">
            <Mail size={14} className="mt-0.5 shrink-0 text-harvest-300" />
            Need help? Send us a message from your dashboard.
          </p>
          <p className="flex items-start gap-2.5 text-[12px] leading-5 text-forest-100/70">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-harvest-300" />
            Your money stays in a separate escrow account until the job is done.
          </p>
        </div>
      </div>

      <div className="border-t border-forest-700/60">
        <div className="page-wrap flex flex-wrap items-center justify-between gap-3 py-5">
          <p className="text-[11.5px] text-forest-100/55">
            © {new Date().getFullYear()} Rural Agricultural Market Linkage Platform. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {REGULATORS.map((regulator) => (
              <span key={regulator} className="text-[10px] font-bold uppercase tracking-[0.14em] text-forest-300/80">
                {regulator}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
