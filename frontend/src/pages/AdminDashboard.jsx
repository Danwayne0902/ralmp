import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity, ArrowRight, BarChart3, MapPin, Package, Sprout, Users, Wallet
} from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { adminService } from '../lib/services'
import { money, relativeDate } from '../lib/format'
import PageHeader from '../components/PageHeader'
import {
  Badge, Button, Card, CardBody, CardHeader, Spinner, StatCard
} from '../components/ui'

const EASE = [0.22, 1, 0.36, 1]
const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: EASE, delay }
})

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [charts, setCharts] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([adminService.analytics(), adminService.charts({ period: 30 }), adminService.insights()])
      .then(([a, c, i]) => {
        setData({ ...a.data, insights: i.data })
        setCharts(c.data)
      })
      .catch(() => setData({}))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner label="Loading platform overview…" />

  const d = data || {}
  const revenue = (charts?.revenue_over_time || []).map((r) => ({ date: r.date?.slice(5), total: Number(r.total) }))
  const orders = (charts?.orders_over_time || []).map((r) => ({ date: r.date?.slice(5), count: Number(r.count) }))
  const series = orders.map((o, i) => ({ ...o, revenue: revenue[i]?.total || 0 }))

  const kpis = [
    { icon: Users, label: 'Total users', value: d.total_users || 0, hint: `${d.total_farmers || 0} farmers · ${d.total_buyers || 0} buyers`, tone: 'brand' },
    { icon: Sprout, label: 'Listings', value: d.total_listings || 0, hint: 'Across all farmers', tone: 'lime' },
    { icon: Package, label: 'Orders', value: d.total_orders || 0, hint: `${d.total_logistics || 0} logistics partners`, tone: 'neutral' },
    { icon: Wallet, label: 'Revenue', value: `₦${money(d.total_revenue)}`, hint: 'Completed & delivered', tone: 'amber' }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Platform overview"
        subtitle="Marketplace health, users and transaction activity."
        actions={
          <>
            <Button variant="ghost" to="/admin/users" leftIcon={Users}>Users</Button>
            <Button variant="primary" to="/admin/analytics" leftIcon={BarChart3}>Analytics</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} {...reveal(i * 0.05)}>
            <StatCard icon={k.icon} label={k.label} value={k.value} hint={k.hint} tone={k.tone} />
          </motion.div>
        ))}
      </div>

      <motion.div {...reveal(0.1)} className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader
            icon={Activity}
            title="Activity · last 30 days"
            subtitle="Orders and revenue trend"
            actions={<Badge tone="brand" icon={Activity}>Live</Badge>}
          />
          <CardBody>
            <div className="h-64">
              {series.length === 0 ? (
                <div className="grid h-full place-items-center rounded-xl border border-dashed border-[color:var(--hairline)] bg-sand-50 text-center">
                  <div>
                    <BarChart3 size={26} className="mx-auto text-sand-300" />
                    <p className="mt-2 text-xs text-sand-400">No transactions in this period yet.</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0B8050" stopOpacity={0.24} />
                        <stop offset="100%" stopColor="#0B8050" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ordFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E8DF" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8C8C7E' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#8C8C7E' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E8E8DF', fontSize: 12 }} />
                    <Area type="monotone" dataKey="revenue" stroke="#0B8050" strokeWidth={2} fill="url(#revFill)" />
                    <Area type="monotone" dataKey="count" stroke="#F59E0B" strokeWidth={2} fill="url(#ordFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardBody>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Recent activity" />
          <div className="divide-y divide-[color:var(--hairline)]">
            {(d.recent_activity || []).slice(0, 6).map((a) => (
              <div key={a.id} className="flex gap-3 px-5 py-3.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-sm">{a.icon || '•'}</span>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-xs leading-snug text-sand-600">{a.description}</p>
                  <p className="mt-0.5 font-mono text-2xs text-sand-400">{relativeDate(a.created_at)}</p>
                </div>
              </div>
            ))}
            {!d.recent_activity?.length && (
              <p className="px-5 py-8 text-center text-xs text-sand-400">No recent activity.</p>
            )}
          </div>
        </Card>
      </motion.div>

      <motion.div {...reveal(0.15)} className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Top commodities"
            actions={
              <Button variant="ghost" size="sm" to="/admin/analytics" rightIcon={ArrowRight}>Details</Button>
            }
          />
          <CardBody className="space-y-2">
            {(d.top_commodities || []).slice(0, 5).map((c) => (
              <div key={c.commodity_name} className="flex items-center gap-3 rounded-xl border border-[color:var(--hairline)] p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-lime-100 text-sm">🌾</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-ink">{c.commodity_name}</p>
                  <p className="text-2xs capitalize text-sand-400">{c.category} · {c.unit}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tnum text-xs font-bold text-brand-700">₦{money(c.total_revenue)}</p>
                  <p className="tnum text-2xs text-sand-400">{c.total_orders} orders</p>
                </div>
              </div>
            ))}
            {!d.top_commodities?.length && (
              <p className="py-8 text-center text-xs text-sand-400">No commodities yet.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={MapPin} title="Top locations" />
          <CardBody className="space-y-2">
            {(d.top_locations || []).slice(0, 5).map((l, i) => (
              <div key={l.location} className="flex items-center gap-3 rounded-xl border border-[color:var(--hairline)] p-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-extrabold text-brand-700">{i + 1}</span>
                <p className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{l.location}</p>
                <div className="shrink-0 text-right">
                  <p className="tnum text-xs font-bold text-ink">{l.total_listings}</p>
                  <p className="text-2xs text-sand-400">listings</p>
                </div>
              </div>
            ))}
            {!d.top_locations?.length && (
              <p className="py-8 text-center text-xs text-sand-400">No location data yet.</p>
            )}
          </CardBody>
        </Card>
      </motion.div>
    </div>
  )
}
