import { Link } from 'react-router-dom'
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react'

export default function AuthShell({ children, aside }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-canvas lg:grid lg:grid-cols-[0.92fr_1.08fr]">
      <aside className="relative hidden overflow-hidden bg-forest-900 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-[0.12]" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-[420px] w-[420px] rounded-full bg-sprout-400/20 blur-3xl" aria-hidden />

        <Link to="/" className="relative inline-flex items-center gap-1.5 text-[12px] font-semibold text-forest-100/70 transition hover:text-white">
          <ArrowLeft size={14} /> Back to the exchange
        </Link>

        <div className="relative mt-10 max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full border border-forest-700 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-harvest-300">
            <ShieldCheck size={13} /> Institutional access
          </span>
          <h2 className="mt-5 font-display text-[32px] font-extrabold leading-[1.12] tracking-[-0.025em] text-white xl:text-[38px]">
            {aside?.title || 'One account. Three operating positions.'}
          </h2>
          <p className="mt-4 text-[13.5px] leading-6 text-forest-100/70">
            {aside?.description ||
              'Farmers, buyers and carriers operate on the same verified supply chain with a single settlement ledger.'}
          </p>

          <ul className="mt-8 space-y-3.5">
            {(aside?.points || [
              'Pre-funded escrow before dispatch',
              'Dual weighbridge and lab evidence',
              'Milestone settlement with audit trail',
            ]).map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-[13px] text-forest-100/85">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white/12">
                  <Check size={10} strokeWidth={3.5} className="text-harvest-300" />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-10 border-t border-forest-700/70 pt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-forest-300">
            Regulatory framework
          </p>
          <p className="mt-1.5 text-[11.5px] leading-5 text-forest-100/55">
            CBN Circular FSR/DIR/GEN/07/041 · NIBSS settlement mandates · Arbitration and Mediation Act 2023
          </p>
        </div>
      </aside>

      <div className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-[520px]">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 lg:hidden">
            <img src="/brand/ralmp-logo-256.png" alt="" className="h-9 w-9 rounded-lg object-cover" />
            <span className="font-display text-[16px] font-extrabold text-forest-600">RALMP AgroLink</span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  )
}
