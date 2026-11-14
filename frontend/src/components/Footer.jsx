import { Link } from 'react-router-dom'
import { ArrowRight, AtSign, Globe, Mail, MapPin, Phone, Send, Share2 } from 'lucide-react'

const columns = [
  {
    title: 'Marketplace',
    links: [
      { to: '/commodities', label: 'Browse produce' },
      { to: '/register', label: 'Sell your harvest' },
      { to: '/register', label: 'Become a buyer' },
      { to: '/register', label: 'Logistics partners' }
    ]
  },
  {
    title: 'Platform',
    links: [
      { to: '/', label: 'How it works' },
      { to: '/', label: 'Pricing & fees' },
      { to: '/', label: 'Impact report' },
      { to: '/commodities', label: 'Market insights' }
    ]
  },
  {
    title: 'Support',
    links: [
      { to: '/', label: 'Help centre' },
      { to: '/', label: 'Delivery & logistics' },
      { to: '/', label: 'Payments & escrow' },
      { to: '/', label: 'Contact us' }
    ]
  }
]

export default function Footer() {
  return (
    <footer className="surface-dark">
      <div className="container-page pb-10 pt-16">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <Link to="/" className="flex items-center gap-3">
              <img src="/brand/ralmp-logo-256.png" alt="RALMP" className="h-11 w-11 rounded-xl object-cover ring-1 ring-white/10" />
              <span className="leading-tight">
                <span className="block font-display text-lg font-extrabold tracking-tight text-white">RALMP</span>
                <span className="block text-[10px] font-semibold uppercase tracking-[.2em] text-lime-300">Rural Agricultural Linkage</span>
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/55">
              Connecting Nigerian farmers, buyers and logistics providers on one trusted
              marketplace — from harvest to doorstep.
            </p>

            <div className="mt-6 space-y-2.5 text-sm text-white/55">
              <p className="flex items-center gap-2.5"><MapPin size={15} className="text-lime-300" /> Lagos, Nigeria</p>
              <p className="flex items-center gap-2.5"><Mail size={15} className="text-lime-300" /> hello@ralmp.ng</p>
              <p className="flex items-center gap-2.5"><Phone size={15} className="text-lime-300" /> +234 800 000 0000</p>
            </div>

            <div className="mt-6 flex gap-2">
              {[Globe, AtSign, Send, Share2].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  aria-label="Social link"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition hover:border-lime-300/40 hover:text-lime-300"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-4 text-2xs font-bold uppercase tracking-[.18em] text-white/40">{column.title}</h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm text-white/60 transition hover:text-lime-300">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} RALMP — Rural Agricultural Linkage Management Program. All rights reserved.</p>
          <div className="flex flex-wrap gap-5">
            <Link to="/" className="transition hover:text-lime-300">Privacy</Link>
            <Link to="/" className="transition hover:text-lime-300">Terms</Link>
            <Link to="/" className="transition hover:text-lime-300">Security</Link>
            <Link to="/register" className="inline-flex items-center gap-1 font-semibold text-lime-300">
              Get started <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
