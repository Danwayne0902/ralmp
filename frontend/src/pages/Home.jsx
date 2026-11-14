import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, MapPin, Sprout, Store, Truck } from 'lucide-react'
import { produceService } from '../lib/services'
import { imgUrl, money } from '../lib/format'

/* The platform's real category taxonomy — the same values the API filters on. */
const categories = [
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'grains', label: 'Grains & cereals' },
  { value: 'tubers', label: 'Tubers' },
  { value: 'legumes', label: 'Legumes' },
  { value: 'spices', label: 'Spices & herbs' }
]

/* The order lifecycle exactly as the backend records it. */
const lifecycle = [
  { key: 'pending', title: 'Order placed', note: 'The buyer commits to a quantity at the listed price.' },
  { key: 'confirmed', title: 'Payment confirmed', note: 'Card payment is verified with Paystack and the order is marked paid.' },
  { key: 'processing', title: 'Packed', note: 'The harvest is graded, weighed and made ready for pickup.' },
  { key: 'in_transit', title: 'In transit', note: 'A logistics partner carries the consignment and posts tracking updates.' },
  { key: 'delivered', title: 'Delivered', note: 'The buyer receives the goods and confirms what arrived.' },
  { key: 'completed', title: 'Completed', note: 'The trade closes and is recorded on both dashboards.' }
]

const roles = [
  {
    name: 'Farmers',
    icon: Sprout,
    line: 'Set the asking price and sell the harvest you already grow.',
    points: [
      'Publish a harvest with photos, unit, quantity and price',
      'Track sales and earnings listing by listing',
      'Message buyers directly to agree quantities'
    ]
  },
  {
    name: 'Buyers',
    icon: Store,
    line: 'Source at the farm gate instead of through a chain of resellers.',
    points: [
      'Filter by category, state, price range and freshness',
      'Buy from the farm that actually grew the produce',
      'Keep orders, messages and payment records together'
    ]
  },
  {
    name: 'Logistics partners',
    icon: Truck,
    line: 'Carry confirmed orders and keep the record of every movement.',
    points: [
      'Take on deliveries matched to your routes',
      'Post tracking updates as the consignment moves',
      'Run pickups and drop-offs from one board'
    ]
  }
]

const label = (value) =>
  value ? value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : ''

const ease = [0.22, 1, 0.36, 1]

export default function Home() {
  const [listings, setListings] = useState([])
  const [total, setTotal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    produceService
      .list({ per_page: 8, sort_by: 'created_at', sort_order: 'desc' })
      .then((res) => {
        const payload = res.data || {}
        setListings(payload.data || [])
        setTotal(typeof payload.total === 'number' ? payload.total : null)
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])

  const listed = total ?? listings.length
  const [lead, ...rest] = listings

  return (
    <div className="overflow-x-hidden">
      {/* ── HERO / THE BOARD ───────────────────────────────── */}
      <section className="relative overflow-hidden bg-ink-950">
        <div className="container-page grid gap-14 pb-16 pt-28 sm:pt-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,430px)] lg:gap-16 lg:pb-24">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.09 } } }}
          >
            <motion.h1
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }}
              className="max-w-[15ch] font-display text-[2.15rem] font-extrabold leading-[1.03] tracking-[-0.035em] text-white sm:text-5xl lg:text-[3.6rem]"
            >
              From farm gate to market floor.
            </motion.h1>

            <motion.p
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }}
              className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg"
            >
              RALMP is the trading board for Nigerian produce. Farmers publish what they
              harvest, buyers purchase it at the listed price, and the whole trade — payment
              to delivery — is recorded in one place.
            </motion.p>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }}
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                to="/commodities"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-lime-300 px-6 py-3.5 text-sm font-bold text-ink transition hover:bg-lime-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-400/30"
              >
                Browse the market
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/15"
              >
                List your harvest
              </Link>
            </motion.div>

            <motion.ul
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.7, delay: 0.1 } } }}
              className="mt-12 grid gap-3 border-t border-white/10 pt-6 text-[13px] leading-relaxed text-white/60 sm:grid-cols-3 sm:gap-8"
            >
              <li>Verification status shown on every trader profile</li>
              <li>Card payment processed through Paystack</li>
              <li>Delivery tracked from farm gate to doorstep</li>
            </motion.ul>
          </motion.div>

          {/* The live board */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease }}
            className="w-full"
          >
            <div className="border border-white/15 bg-white/[0.04]">
              <div className="flex items-center justify-between border-b border-white/12 px-4 py-3">
                <span className="font-mono text-[11px] uppercase tracking-[.16em] text-white/55">
                  Today&apos;s board
                </span>
                <span className="inline-flex items-center gap-2 font-mono text-[11px] text-lime-300 tnum">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-300" />
                  {loading ? 'syncing' : `${listed} listed`}
                </span>
              </div>

              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/10 font-mono text-[10px] uppercase tracking-[.14em] text-white/50">
                    <th scope="col" className="px-4 py-2.5 font-medium">Commodity</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Ask</th>
                  </tr>
                </thead>
                <tbody>
                  {loading &&
                    [0, 1, 2].map((i) => (
                      <tr key={i} className="border-b border-white/[0.07] last:border-0">
                        <td className="px-4 py-3.5"><span className="block h-3 w-28 animate-pulse rounded bg-white/10" /></td>
                        <td className="px-4 py-3.5"><span className="ml-auto block h-3 w-16 animate-pulse rounded bg-white/10" /></td>
                      </tr>
                    ))}

                  {!loading && listings.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-6 text-[13px] leading-relaxed text-white/60">
                        {failed
                          ? 'The board is unreachable right now.'
                          : 'Nothing is listed yet. The first harvest posted becomes the first line here.'}
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    listings.slice(0, 5).map((item) => (
                      <tr key={item.id} className="border-b border-white/[0.07] last:border-0">
                        <td className="px-4 py-3.5">
                          <Link
                            to={`/commodities/${item.id}`}
                            className="block text-[13px] font-semibold text-white transition hover:text-lime-300"
                          >
                            {item.commodity_name}
                          </Link>
                          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-white/50">
                            <MapPin size={10} /> {item.location}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="block font-mono text-[13px] font-semibold text-lime-300 tnum">
                            ₦{money(item.price)}
                          </span>
                          <span className="block font-mono text-[10px] text-white/50">/ {item.unit}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              <Link
                to="/commodities"
                className="flex items-center justify-between border-t border-white/12 px-4 py-3 text-[12px] font-semibold text-white/70 transition hover:bg-white/[0.05] hover:text-lime-300"
              >
                Open the market
                <ArrowUpRight size={13} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CATEGORY INDEX ─────────────────────────────────── */}
      <section className="border-b border-[color:var(--hairline)] bg-white">
        <div className="container-page flex flex-wrap items-baseline gap-x-7 gap-y-2 py-4">
          <span className="text-[13px] text-sand-600">Browse by</span>
          {categories.map((category) => (
            <Link
              key={category.value}
              to={`/commodities?category=${category.value}`}
              className="text-[13px] font-semibold text-sand-800 underline-offset-4 transition hover:text-brand-700 hover:underline"
            >
              {category.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ── RECENTLY LISTED ────────────────────────────────── */}
      <section className="section bg-white">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4 border-t border-[color:var(--hairline-strong)] pt-6">
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              Recently listed
            </h2>
            <Link
              to="/commodities"
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
            >
              View all produce
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {loading && (
            <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-12">
              <div className="skeleton aspect-[4/3] w-full rounded-none" />
              <div className="space-y-4">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-8 w-3/4" />
                <div className="skeleton h-4 w-40" />
                <div className="skeleton h-20 w-full" />
              </div>
            </div>
          )}

          {!loading && listings.length === 0 && (
            <div className="mt-8 border border-[color:var(--hairline)] bg-sand-50 px-6 py-12 text-center">
              <p className="font-display text-lg font-bold text-ink">The board is empty right now</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-sand-600">
                No produce has been listed yet. If you farm, the first listing you publish
                appears here — with your photo, your price and your location.
              </p>
              <Link
                to="/register"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
              >
                List the first harvest
                <ArrowRight size={15} />
              </Link>
            </div>
          )}

          {!loading && lead && (
            <div className="mt-8 grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
              <Link
                to={`/commodities/${lead.id}`}
                className="group block overflow-hidden border border-[color:var(--hairline)] bg-sand-100"
              >
                <div className="aspect-[4/3] w-full overflow-hidden">
                  {lead.images?.[0] ? (
                    <img
                      src={imgUrl(lead.images[0])}
                      alt={lead.commodity_name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-sand-500">
                      No photo supplied
                    </div>
                  )}
                </div>
              </Link>

              <div>
                <h3 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                  {lead.commodity_name}
                </h3>

                <p className="mt-4 flex items-baseline gap-2 font-mono text-ink tnum">
                  <span className="text-2xl font-bold">₦{money(lead.price)}</span>
                  <span className="text-xs text-sand-600">per {lead.unit}</span>
                </p>

                <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-[color:var(--hairline)] pt-5 text-[13px]">
                  <div>
                    <dt className="text-sand-600">Location</dt>
                    <dd className="mt-0.5 font-semibold text-ink">{lead.location}</dd>
                  </div>
                  <div>
                    <dt className="text-sand-600">Available</dt>
                    <dd className="mt-0.5 font-semibold text-ink tnum">
                      {money(lead.quantity)} {lead.unit}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sand-600">Category</dt>
                    <dd className="mt-0.5 font-semibold text-ink">{label(lead.category)}</dd>
                  </div>
                  <div>
                    <dt className="text-sand-600">Listed by</dt>
                    <dd className="mt-0.5 font-semibold text-ink">{lead.user?.name || 'Verified farmer'}</dd>
                  </div>
                </dl>

                {lead.description && (
                  <p className="mt-5 max-w-prose2 text-sm leading-relaxed text-sand-600">
                    {lead.description}
                  </p>
                )}

                <Link
                  to={`/commodities/${lead.id}`}
                  className="mt-7 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
                >
                  View this listing
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          )}

          {!loading && rest.length > 0 && (
            <ul className="mt-10 border-t border-[color:var(--hairline)]">
              {rest.slice(0, 5).map((item) => (
                <li key={item.id} className="border-b border-[color:var(--hairline)]">
                  <Link to={`/commodities/${item.id}`} className="group flex items-center gap-4 py-4">
                    <span className="h-14 w-14 shrink-0 overflow-hidden bg-sand-100">
                      {item.images?.[0] && (
                        <img
                          src={imgUrl(item.images[0])}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink transition group-hover:text-brand-700">
                        {item.commodity_name}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-sand-600">
                        <MapPin size={11} /> {item.location}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-sm font-bold text-ink tnum">
                        ₦{money(item.price)}
                      </span>
                      <span className="block font-mono text-[10px] text-sand-600">/ {item.unit}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── HOW AN ORDER MOVES ─────────────────────────────── */}
      <section className="section border-t border-[color:var(--hairline)] bg-sand-50">
        <div className="container-page">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              How an order moves
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-sand-600">
              Every trade runs through the same recorded sequence — from the moment a buyer
              commits, to the moment the buyer confirms what arrived.
            </p>
          </div>

          <ol className="mt-10 grid border-t border-[color:var(--hairline)] sm:grid-cols-2 lg:grid-cols-3">
            {lifecycle.map((step) => (
              <li
                key={step.key}
                className="border-b border-[color:var(--hairline)] py-6 sm:pr-10"
              >
                <span className="font-mono text-[11px] uppercase tracking-[.14em] text-brand-700">
                  {step.key}
                </span>
                <h3 className="mt-2 font-display text-base font-bold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-sand-600">{step.note}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── WHO TRADES HERE ────────────────────────────────── */}
      <section className="section border-t border-[color:var(--hairline)] bg-white">
        <div className="container-page">
          <h2 className="max-w-2xl font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Built for every side of the trade
          </h2>

          <div className="mt-10 grid gap-10 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-[color:var(--hairline)]">
            {roles.map((role) => (
              <div key={role.name} className="lg:px-8 lg:first:pl-0 lg:last:pr-0">
                <div className="flex items-center gap-2.5">
                  <role.icon size={17} className="shrink-0 text-brand-700" />
                  <h3 className="font-display text-lg font-bold text-ink">{role.name}</h3>
                </div>
                <p className="mt-3 text-sm font-medium leading-relaxed text-ink/75">{role.line}</p>
                <ul className="mt-5 space-y-2.5">
                  {role.points.map((point) => (
                    <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-sand-600">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLOSING ────────────────────────────────────────── */}
      <section className="bg-ink-950">
        <div className="container-page grid gap-8 py-20 sm:py-24 lg:grid-cols-[1.35fr_1fr] lg:items-end lg:gap-16">
          <h2 className="font-display text-3xl font-extrabold leading-[1.05] tracking-[-0.03em] text-white sm:text-4xl lg:text-5xl">
            Sell the harvest.
            <br />
            Source the supply.
          </h2>

          <div className="flex flex-col gap-3">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-lime-300 px-6 py-3.5 text-sm font-bold text-ink transition hover:bg-lime-400"
            >
              Create a free account
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/commodities"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Browse listings
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
