import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  ArrowUpRight, BarChart3, Building2, CalendarDays, CircleAlert, Download,
  MapPin, Package, RefreshCw, Sprout, Truck, Users, Wallet,
} from 'lucide-react'
import { PageHeader, Stat, Table, Th, Td, Tr, Skeleton, Progress } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { adminService } from '../lib/services'
import { compactMoney, fmtDate, money, num } from '../lib/format'
import { downloadCsv, parseError } from '../lib/utils'

const PERIODS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '12 months' },
]

const SERIES_COLORS = ['#176B3A', '#69A84F', '#F4B942', '#2F80ED', '#B54708', '#7A5AF8']

function ChartCard({ title, description, children, action, className }) {
  return (
    <div className={`rounded-card border border-line bg-white shadow-card ${className || ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <div>
          <h2 className="font-display text-[14px] font-bold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-[10.5px] text-muted">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function ChartTooltip({ active, payload, label, prefix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 shadow-modal">
      <p className="text-[10.5px] font-semibold text-muted">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="mt-0.5 text-[12px] font-bold text-ink tnum">
          {prefix}{num(item.value, item.dataKey === 'total' ? 0 : 0)}
          <span className="ml-1 text-[10px] font-medium text-muted">{item.name}</span>
        </p>
      ))}
    </div>
  )
}

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState(null)
  const [charts, setCharts] = useState(null)
  const [period, setPeriod] = useState('30')
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadAnalytics() {
    setLoading(true)
    try {
      const res = await adminService.analytics()
      setAnalytics(res.data)
      setError('')
    } catch (err) {
      setError(parseError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  useEffect(() => {
    let active = true
    setChartLoading(true)
    adminService
      .charts({ period })
      .then((res) => {
        if (active) setCharts(res.data)
      })
      .catch((err) => {
        if (active) setError(parseError(err))
      })
      .finally(() => {
        if (active) setChartLoading(false)
      })
    return () => {
      active = false
    }
  }, [period])

  const ordersSeries = useMemo(
    () =>
      (charts?.orders_over_time || []).map((row) => ({
        date: fmtDate(row.date, { month: 'short', day: 'numeric' }),
        orders: Number(row.count || 0),
      })),
    [charts],
  )

  const revenueSeries = useMemo(
    () =>
      (charts?.revenue_over_time || []).map((row) => ({
        date: fmtDate(row.date, { month: 'short', day: 'numeric' }),
        total: Number(row.total || 0),
      })),
    [charts],
  )

  const topCommoditySeries = useMemo(
    () =>
      (charts?.top_commodities || []).map((row) => ({
        name: row.commodity_name,
        listings: Number(row.count || 0),
      })),
    [charts],
  )

  const roles = Object.entries(analytics?.users_by_role || {})
  const statuses = Object.entries(analytics?.orders_by_status || {})
  const maxRole = Math.max(1, ...roles.map(([, value]) => Number(value)))

  const revenueWindow = revenueSeries.reduce((sum, row) => sum + row.total, 0)
  const ordersWindow = ordersSeries.reduce((sum, row) => sum + row.orders, 0)
  const avgOrder = ordersWindow ? revenueWindow / ordersWindow : 0

  function exportAnalytics() {
    const rows = (analytics?.top_commodities || []).map((row) => ({
      commodity: row.commodity_name,
      category: row.category,
      unit: row.unit,
      orders: row.total_orders,
      quantity: row.total_quantity,
      revenue: row.total_revenue,
    }))
    downloadCsv(`ralmp-market-analytics-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="Reports"
        title="Reports"
        description="Orders, money and supply, measured from live records."
        actions={
          <>
            <Button variant="outline" size="md" onClick={loadAnalytics} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </Button>
            <Button variant="outline" size="md" onClick={exportAnalytics} disabled={!analytics?.top_commodities?.length}>
              <Download size={15} /> Export CSV
            </Button>
          </>
        }
      />

      {error && (
        <p className="mb-4 rounded-card border border-critical-200 bg-critical-50 px-4 py-3 text-[12.5px] text-critical-600">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[108px] rounded-card" />)
        ) : (
          <>
            <Stat icon={Package} label="Orders" value={num(analytics?.total_orders)} hint={`${ordersWindow} in the last ${period} days`} />
            <Stat icon={Wallet} label="Settled revenue" value={money(analytics?.total_revenue ?? 0)} tone="sprout" hint={`${compactMoney(revenueWindow)} in the window`} size="lg" />
            <Stat icon={Sprout} label="Live listings" value={num(analytics?.total_listings)} tone="gold" hint="Availability-marked lots only" />
            <Stat icon={Users} label="Participants" value={num(analytics?.total_users)} tone="neutral" hint={`${analytics?.total_farmers || 0} farmers · ${analytics?.total_buyers || 0} buyers`} />
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white px-4 py-3 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays size={14} className="text-forest-500" />
          <p className="text-[12px] font-semibold text-ink">Chart window</p>
          <div className="flex rounded-lg border border-line bg-canvas p-0.5">
            {PERIODS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPeriod(item.value)}
                className={`rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition ${
                  period === item.value ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[10.5px] text-muted">
          Average order value in window · <span className="font-bold text-ink tnum">{money(avgOrder)}</span>
        </p>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard
          title="Orders"
          description="Orders placed each day."
          action={chartLoading ? <Skeleton className="h-5 w-16" /> : <Badge tone="neutral" size="sm">{ordersWindow} orders</Badge>}
        >
          {chartLoading ? (
            <Skeleton className="h-[240px] w-full rounded-xl" />
          ) : ordersSeries.length === 0 ? (
            <div className="grid h-[240px] place-items-center text-center">
              <div>
                <BarChart3 size={24} className="mx-auto text-sage-400" />
                <p className="mt-2 text-[12px] text-muted">No orders in this window.</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={ordersSeries} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#176B3A" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#176B3A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5EAE3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#52634F' }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 10, fill: '#52634F' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="orders" name="orders" stroke="#176B3A" strokeWidth={2} fill="url(#ordersFill)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Money settled"
          description="Value of delivered and finished orders each day."
          action={chartLoading ? <Skeleton className="h-5 w-16" /> : <Badge tone="verified" size="sm">{compactMoney(revenueWindow)}</Badge>}
        >
          {chartLoading ? (
            <Skeleton className="h-[240px] w-full rounded-xl" />
          ) : revenueSeries.length === 0 ? (
            <div className="grid h-[240px] place-items-center text-center">
              <div>
                <Wallet size={24} className="mx-auto text-sage-400" />
                <p className="mt-2 text-[12px] text-muted">No settled revenue in this window.</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenueSeries} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#69A84F" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#69A84F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5EAE3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#52634F' }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 10, fill: '#52634F' }} axisLine={false} tickLine={false} tickFormatter={(value) => compactMoney(value)} width={64} />
                <Tooltip content={<ChartTooltip prefix="" />} />
                <Area type="monotone" dataKey="total" name="revenue" stroke="#69A84F" strokeWidth={2} fill="url(#revenueFill)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
              <div>
                <h2 className="font-display text-[14px] font-bold text-ink">Commodity demand</h2>
                <p className="mt-0.5 text-[10.5px] text-muted">Order count and settled value by commodity.</p>
              </div>
              <Link to="/admin" className="text-[11px] font-semibold text-forest-600 hover:underline">Oversight home</Link>
            </div>
            {loading ? (
              <div className="space-y-2 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : analytics?.top_commodities?.length ? (
              <Table minWidth={700}>
                <thead>
                  <tr>
                    <Th>Commodity</Th>
                    <Th>Category</Th>
                    <Th className="text-right">Orders</Th>
                    <Th className="text-right">Volume</Th>
                    <Th className="text-right">Settled revenue</Th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.top_commodities.map((row) => (
                    <Tr key={`${row.commodity_name}-${row.unit}`}>
                      <Td className="font-semibold text-ink">{row.commodity_name}</Td>
                      <Td className="capitalize text-muted">{row.category}</Td>
                      <Td className="text-right tnum">{row.total_orders}</Td>
                      <Td className="text-right tnum">{num(row.total_quantity)} {row.unit}</Td>
                      <Td className="text-right font-semibold text-forest-600 tnum">{money(row.total_revenue)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="px-5 py-10 text-center text-[12px] text-muted">
                Commodity demand appears once buyers begin committing to lots.
              </p>
            )}
          </div>

          <ChartCard
            title="What is listed"
            description="The crops with the most listings today."
          >
            {chartLoading ? (
              <Skeleton className="h-[210px] w-full rounded-xl" />
            ) : topCommoditySeries.length === 0 ? (
              <div className="grid h-[210px] place-items-center text-center">
                <div>
                  <Sprout size={24} className="mx-auto text-sage-400" />
                  <p className="mt-2 text-[12px] text-muted">No live listings to chart.</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={topCommoditySeries} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EAE3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: '#52634F' }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={56} />
                  <YAxis tick={{ fontSize: 10, fill: '#52634F' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="listings" name="listings" radius={[5, 5, 0, 0]}>
                    {topCommoditySeries.map((entry, index) => (
                      <Cell key={entry.name} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <aside className="space-y-4">
          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-ink">
              <Users size={15} className="text-forest-500" /> Participants by role
            </h2>
            {loading ? (
              <div className="mt-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
            ) : roles.length === 0 ? (
              <p className="mt-4 text-[11.5px] text-muted">No participant data.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {roles.map(([key, value]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="flex items-center gap-1.5 capitalize text-muted">
                        {key === 'farmer' ? <Sprout size={11} /> : key === 'buyer' ? <Building2 size={11} /> : key === 'logistics_provider' ? <Truck size={11} /> : <Users size={11} />}
                        {key.replace('_', ' ')}
                      </span>
                      <span className="font-bold text-ink tnum">{value}</span>
                    </div>
                    <Progress value={(Number(value) / maxRole) * 100} className="mt-1" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-ink">
              <BarChart3 size={15} className="text-forest-500" /> Order states
            </h2>
            {loading ? (
              <div className="mt-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : statuses.length === 0 ? (
              <p className="mt-4 text-[11.5px] text-muted">No orders yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {statuses.map(([status, value]) => (
                  <li key={status} className="flex items-center justify-between gap-2 py-2">
                    <span className="flex items-center gap-1.5 text-[11.5px] capitalize text-muted">
                      <span className={`h-1.5 w-1.5 rounded-full ${status === 'cancelled' || status === 'rejected' ? 'bg-critical-500' : status === 'completed' || status === 'delivered' ? 'bg-forest-500' : 'bg-harvest-400'}`} />
                      {status}
                    </span>
                    <span className="text-[11.5px] font-bold text-ink tnum">{value}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-ink">
              <MapPin size={15} className="text-forest-500" /> Top origins
            </h2>
            {loading ? (
              <div className="mt-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : analytics?.top_locations?.length ? (
              <ul className="mt-3 divide-y divide-line">
                {analytics.top_locations.slice(0, 6).map((location) => (
                  <li key={location.location} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="break-words text-[11.5px] font-medium text-ink-soft">{location.location}</p>
                      <p className="text-[10px] text-muted">{location.total_orders} orders</p>
                    </div>
                    <Badge tone="neutral" size="sm">{location.total_listings} lots</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[11.5px] text-muted">No origin clusters yet.</p>
            )}
          </div>

          <div className="rounded-card border border-harvest-200 bg-harvest-50 p-4">
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-harvest-600">
              <CircleAlert size={13} /> Measurement note
            </p>
            <p className="mt-1 text-[10.5px] leading-4 text-harvest-600/85">
              Revenue counts delivered and completed orders only. Unfunded or cancelled orders are excluded from
              settled value but remain visible in the order-state distribution.
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-5 rounded-card border border-line bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-ink">
            <ArrowUpRight size={15} className="text-forest-500" /> Recent platform activity
          </h2>
          <Link to="/admin/users" className="text-[11px] font-semibold text-forest-600 hover:underline">
            Participant registry
          </Link>
        </div>
        {loading ? (
          <div className="mt-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : analytics?.recent_activity?.length ? (
          <ul className="mt-2 divide-y divide-line">
            {analytics.recent_activity.slice(0, 8).map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-sage-100 text-[12px]">
                  {item.icon || '•'}
                </span>
                <p className="min-w-0 flex-1 break-words text-[11.5px] text-ink-soft">{item.description}</p>
                <span className="shrink-0 text-[10px] text-muted">{fmtDate(item.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-[11.5px] text-muted">No activity recorded yet.</p>
        )}
      </div>
    </div>
  )
}
