import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, ArrowRight, ArrowUpRight, BarChart3, Building2,
  CircleAlert, FileWarning, FlaskConical, Landmark, Package, RefreshCw, ShieldCheck,
  Sprout, Truck, Users, Wallet,
} from 'lucide-react'
import { PageHeader, Stat, Table, Th, Td, Tr, Skeleton, Progress } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { adminService } from '../lib/services'
import { money, num, relativeDate, roleLabel } from '../lib/format'
import { parseError } from '../lib/utils'

const ROLE_META = {
  farmer: { icon: Sprout, tone: 'sprout' },
  buyer: { icon: Building2, tone: 'forest' },
  logistics_provider: { icon: Truck, tone: 'gold' },
  admin: { icon: ShieldCheck, tone: 'neutral' },
}

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await adminService.analytics()
      setData(res.data)
      setError('')
    } catch (err) {
      setError(parseError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const roles = Object.entries(data?.users_by_role || {})
  const maxRole = Math.max(1, ...roles.map(([, value]) => Number(value)))
  const statuses = Object.entries(data?.orders_by_status || {})
  const maxStatus = Math.max(1, ...statuses.map(([, value]) => Number(value)))

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="Admin"
        title="Dashboard"
        description="People, produce, orders and money across RALMP."
        actions={
          <>
            <Button variant="outline" size="md" onClick={load} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </Button>
            <Button asChild size="md">
              <Link to="/admin/users"><Users size={15} /> Manage users</Link>
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
            <Stat icon={Users} label="People" value={num(data?.total_users)} hint={`${data?.total_farmers || 0} farmers · ${data?.total_buyers || 0} buyers`} />
            <Stat icon={Sprout} label="Produce for sale" value={num(data?.total_listings)} tone="sprout" hint="Available listings" />
            <Stat icon={Package} label="Orders" value={num(data?.total_orders)} tone="gold" hint="All time, everyone" />
            <Stat icon={Wallet} label="Money settled" value={money(data?.total_revenue ?? 0)} tone="neutral" hint="Orders paid and delivered" size="lg" />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-card border border-line bg-white p-5 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[14.5px] font-bold text-ink">People by role</h2>
                <Users size={15} className="text-forest-500" />
              </div>
              {loading ? (
                <div className="mt-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
              ) : roles.length === 0 ? (
                <p className="mt-4 text-[11.5px] text-muted">No people yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {roles.map(([role, value]) => {
                    const meta = ROLE_META[role] || ROLE_META.admin
                    return (
                      <div key={role}>
                        <div className="flex items-center justify-between text-[11.5px]">
                          <span className="flex items-center gap-1.5 text-muted">
                            <meta.icon size={11} /> {roleLabel(role)}
                          </span>
                          <span className="font-bold text-ink tnum">{value}</span>
                        </div>
                        <Progress value={(Number(value) / maxRole) * 100} className="mt-1" tone={meta.tone === 'gold' ? 'gold' : meta.tone === 'sprout' ? 'sprout' : 'forest'} />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="rounded-card border border-line bg-white p-5 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[14.5px] font-bold text-ink">Order status</h2>
                <BarChart3 size={15} className="text-forest-500" />
              </div>
              {loading ? (
                <div className="mt-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
              ) : statuses.length === 0 ? (
                <p className="mt-4 text-[11.5px] text-muted">No orders yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {statuses.map(([status, value]) => (
                    <div key={status}>
                      <div className="flex items-center justify-between text-[11.5px]">
                        <span className="capitalize text-muted">{status}</span>
                        <span className="font-bold text-ink tnum">{value}</span>
                      </div>
                      <Progress value={(Number(value) / maxStatus) * 100} className="mt-1" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="font-display text-[15px] font-bold text-ink">Top crops</h2>
                <p className="mt-0.5 text-[11px] text-muted">What buyers order most.</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin/analytics">Full reports <ArrowRight size={13} /></Link>
              </Button>
            </div>
            {loading ? (
              <div className="space-y-2 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : data?.top_commodities?.length ? (
              <Table minWidth={620}>
                <thead>
                  <tr>
                    <Th>Commodity</Th>
                    <Th>Category</Th>
                    <Th className="text-right">Orders</Th>
                    <Th className="text-right">Quantity</Th>
                    <Th className="text-right">Revenue</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_commodities.slice(0, 8).map((row) => (
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
              <p className="px-5 py-10 text-center text-[12px] text-muted">No orders yet.</p>
            )}
          </div>

          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[15px] font-bold text-ink">Top places</h2>
              <span className="text-[10.5px] text-muted">{data?.top_locations?.length || 0} locations</span>
            </div>
            {loading ? (
              <div className="mt-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : data?.top_locations?.length ? (
              <ul className="mt-3 divide-y divide-line">
                {data.top_locations.slice(0, 6).map((location) => (
                  <li key={location.location} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="break-words text-[12px] font-medium text-ink-soft">{location.location}</p>
                      <p className="text-[10px] text-muted">{location.total_orders} orders against origin</p>
                    </div>
                    <Badge tone="neutral" size="sm">{location.total_listings} listings</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[11.5px] text-muted">No places yet.</p>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
              <h2 className="flex items-center gap-2 font-display text-[13.5px] font-bold text-ink">
                <Activity size={14} className="text-forest-500" /> Recent activity
              </h2>
            </div>
            {loading ? (
              <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : data?.recent_activity?.length ? (
              <ul className="divide-y divide-line">
                {data.recent_activity.slice(0, 7).map((item) => (
                  <li key={item.id} className="flex gap-2.5 px-4 py-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-sage-100 text-[12px]">
                      {item.icon || '•'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11.5px] leading-5 text-ink-soft">{item.description}</p>
                      <p className="text-[9.5px] text-muted">{relativeDate(item.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-8 text-center text-[11.5px] text-muted">No activity yet.</p>
            )}
          </div>

          <div className="rounded-card border border-line bg-white p-4 shadow-card">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Admin tools</p>
            <div className="mt-2 space-y-1">
              {[
                { to: '/admin/users', icon: Users, label: 'People and roles', note: 'Change roles, pause accounts' },
                { to: '/admin/analytics', icon: BarChart3, label: 'Reports', note: 'Sales, money, places' },
                { to: '/admin/disputes', icon: FileWarning, label: 'Complaints', note: 'Orders on hold' },
                { to: '/admin/quality', icon: FlaskConical, label: 'Quality checks', note: 'Tests and weight rules' },
              ].map((item) => (
                <Link key={item.to} to={item.to} className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-sage-50">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-forest-50 text-forest-600">
                    <item.icon size={13} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11.5px] font-semibold text-ink">{item.label}</span>
                    <span className="block text-[10px] text-muted">{item.note}</span>
                  </span>
                  <ArrowUpRight size={12} className="shrink-0 text-muted" />
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-card border border-line bg-white p-4">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
              <Landmark size={12} /> Where the money sits
            </p>
            <p className="mt-2 text-[11px] leading-5 text-ink-soft/80">
              Escrow money is kept apart from the money we use to run RALMP. Only a two-person approval can pause or release it.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="verified" size="sm"><ShieldCheck size={10} /> Separate account</Badge>
              <Badge tone="neutral" size="sm">Bank transfer</Badge>
              <Badge tone="gold" size="sm">Two approvals</Badge>
            </div>
          </div>

          <div className="rounded-card border border-harvest-200 bg-harvest-50 p-4">
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-harvest-600">
              <CircleAlert size={13} /> Data note
            </p>
            <p className="mt-1 text-[10.5px] leading-4 text-harvest-600/85">
              These pages show how complaints and quality checks work. A case only appears when a real order needs attention.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2.5 w-full">
              <Link to="/admin/disputes">See complaints</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
