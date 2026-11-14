import { Link } from 'react-router-dom'
import { ArrowUpRight, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react'

const COLUMNS = [
  {
    title: 'Marketplace',
    links: [
      { label: 'Spot exchange', to: '/commodities' },
      { label: 'Escrow & trust', to: '/escrow' },
      { label: 'Open an account', to: '/register' },
    ],
  },
  {
    title: 'Participants',
    links: [
      { label: 'Farmer hub', to: '/farmer' },
      { label: 'Buyer procurement', to: '/buyer' },
      { label: 'Carrier dispatch', to: '/dispatch' },
      { label: 'Platform administration', to: '/admin' },
    ],
  },
  {
    title: 'Assurance',
    links: [
      { label: 'Settlement ledger', to: '/settlements' },
      { label: 'Quality inspection', to: '/admin/quality' },
      { label: 'Dispute arbitration', to: '/admin/disputes' },
      { label: 'Sign in', to: '/login' },
    ],
  },
]

const REGULATORS = ['CBN', 'NIBSS', 'FMAFS', 'NAFDAC', 'SON', 'NSPRI']

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
              Nigeria&apos;s rural agricultural market linkage infrastructure — verified farm-gate supply,
              collateralised haulage and tripartite escrow settlement under CBN oversight.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-forest-700 px-3 py-1.5 text-[11px] font-semibold text-forest-100">
              <ShieldCheck size={13} className="text-harvest-300" />
              CBN Circular FSR/DIR/GEN/07/041
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
            Plot 14, Ibrahim Dasuki Street, Asokoro, Abuja FCT, Nigeria
          </p>
          <a href="tel:+2348000725670" className="flex items-start gap-2.5 text-[12px] leading-5 text-forest-100/70 hover:text-white">
            <Phone size={14} className="mt-0.5 shrink-0 text-harvest-300" />
            +234 800 072 5670 · USSD *347*44#
          </a>
          <a href="mailto:trade@ralmp.ng" className="flex items-start gap-2.5 text-[12px] leading-5 text-forest-100/70 hover:text-white">
            <Mail size={14} className="mt-0.5 shrink-0 text-harvest-300" />
            trade@ralmp.ng · desk open 07:00–19:00 WAT
          </a>
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
