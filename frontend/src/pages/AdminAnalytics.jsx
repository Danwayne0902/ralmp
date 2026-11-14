import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, MapPin, TrendingUp, Users } from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { adminService } from '../lib/services'
import { money } from '../lib/format'
import PageHeader from '../components/PageHeader'
import { Card, CardBody, CardHeader, Select, Spinner } from '../components/ui'

const EASE = [0.22, 1, 0.36, 1]
const reveal = () => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: EASE }
})

const COLORS = ['#0B8050', '#40C07F', '#B4E626', '#F59E0B', '#096841', '#77A006']

export default function AdminAnalytics() {
  const [period, setPeriod] = useState('30')
  const [charts, setCharts] = useState(null)
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([adminService.charts({ period }), adminService.insights()])
      .then(([c, i]) => { setCharts(c.data); setInsights(i.data) })
      .catch(() => { setCharts(null); setInsights(null) })
      .finally(() => setLoading(false))
  }, [period])

  if (loading) return <Spinner label="Crunching analytics…" />

  const orders = (charts?.orders_over_time || []).map((d) => ({ date: d.date?.slice(5), count: Number(d.count) }))
  const revenue = (charts?.revenue_over_time || []).map((d) => ({ date: d.date?.slice(5), total: Number(d.total) }))
  const top = (charts?.top_commodities || []).map((d) => ({ name: d.commodity_name, count: Number(d.count) }))
  const topFarmers = insights?.top_farmers || []
  const topLocations = insights?.top_commodities || []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Analytics"
        subtitle="Order velocity, revenue and market concentration."
        actions={
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-40"
            aria-label="Select period"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </Select>
        }
      />

      <motion.div {...reveal()} className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader icon={BarChart3} title="Orders over time" subtitle="Daily order volume for the selected period" />
          <CardBody>
            <div className="h-64">
              {orders.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={orders} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E8DF" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8C8C7E' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#8C8C7E' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E8E8DF', fontSize: 12 }} />
                    <Line type="monotone" dataKey="count" stroke="#0B8050" strokeWidth={2.5} dot={{ r: 3, fill: '#0B8050' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="No orders recorded yet" />
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={TrendingUp} title="Revenue over time" subtitle="Completed and delivered order value" />
          <CardBody>
            <div className="h-64">
              {revenue.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenue} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E8DF" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8C8C7E' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#8C8C7E' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${v > 999999 ? `${(v / 1e6).toFixed(1)}M` : v > 999 ? `${(v / 1e3).toFixed(0)}k` : v}`} />
                    <Tooltip formatter={(v) => `₦${money(v)}`} contentStyle={{ borderRadius: 12, border: '1px solid #E8E8DF', fontSize: 12 }} />
                    <Line type="monotone" dataKey="total" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3, fill: '#F59E0B' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="No revenue recorded yet" />
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={BarChart3} title="Top commodities" subtitle="By listing volume" />
          <CardBody>
            <div className="h-64">
              {top.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E8DF" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8C8C7E' }} axisLine={false} tickLine={false} interval={0} angle={-14} textAnchor="end" height={54} />
                    <YAxis tick={{ fontSize: 11, fill: '#8C8C7E' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E8E8DF', fontSize: 12 }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {top.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="No commodity data yet" />
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={Users} title="Top farmers" subtitle="Ranked by published listings" />
          <CardBody className="space-y-2">
            {topFarmers.slice(0, 6).map((f, i) => (
              <div key={f.id} className="flex items-center gap-3 rounded-xl border border-[color:var(--hairline)] p-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-extrabold text-brand-700">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-ink">{f.name}</p>
                  <p className="flex items-center gap-1 text-2xs text-sand-400"><MapPin size={9} /> {f.state || 'Nigeria'}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tnum text-xs font-bold text-brand-700">{f.listings_count}</p>
                  <p className="text-2xs text-sand-400">listings</p>
                </div>
              </div>
            ))}
            {!topFarmers.length && <p className="py-10 text-center text-xs text-sand-400">No farmer data yet.</p>}
          </CardBody>
        </Card>
      </motion.div>

      <motion.div {...reveal()}>
        <Card>
          <CardHeader icon={MapPin} title="Listing distribution" subtitle="Where marketplace supply is concentrated" />
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topLocations.slice(0, 6).map((l) => (
                <div key={l.id} className="rounded-xl border border-[color:var(--hairline)] p-3.5">
                  <p className="truncate text-xs font-bold text-ink">{l.commodity_name}</p>
                  <p className="mt-0.5 text-2xs text-sand-400">{l.location}</p>
                  <div className="mt-2 flex items-center justify-between text-2xs">
                    <span className="tnum text-sand-400">{money(l.quantity)} {l.unit}</span>
                    <span className="tnum font-bold text-brand-700">₦{money(l.price)}</span>
                  </div>
                </div>
              ))}
              {!topLocations.length && <p className="py-6 text-center text-xs text-sand-400 sm:col-span-2 lg:col-span-3">No listings yet.</p>}
            </div>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  )
}

function EmptyChart({ label }) {
  return (
    <div className="grid h-full place-items-center rounded-xl border border-dashed border-[color:var(--hairline)] bg-sand-50 text-center">
      <div>
        <BarChart3 size={26} className="mx-auto text-sand-300" />
        <p className="mt-2 text-xs text-sand-400">{label}</p>
      </div>
    </div>
  )
}
