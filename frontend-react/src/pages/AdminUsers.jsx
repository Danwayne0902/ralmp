import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  BadgeCheck, Building2, Check, CircleAlert, Clock3, Mail, MapPin, MoreHorizontal,
  Phone, RefreshCw, Search, ShieldCheck, Sprout, Truck, UserCheck, UserX, Users,
} from 'lucide-react'
import { PageHeader, Stat, Table, Th, Td, Tr, EmptyState, Skeleton, Pagination, Avatar } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Overlay'
import { Field, NativeSelect } from '../components/ui/Form'
import { adminService } from '../lib/services'
import { fmtDate, roleLabel } from '../lib/format'
import { imgUrl } from '../lib/format'
import { parseError, cn } from '../lib/utils'
import { useAuth } from '../store/auth'

const ROLES = [
  { value: '', label: 'All roles' },
  { value: 'farmer', label: 'Farmer / Co-op', icon: Sprout },
  { value: 'buyer', label: 'Industrial buyer', icon: Building2 },
  { value: 'logistics_provider', label: 'Logistics carrier', icon: Truck },
  { value: 'admin', label: 'Platform admin', icon: ShieldCheck },
]

const ROLE_ICONS = { farmer: Sprout, buyer: Building2, logistics_provider: Truck, admin: ShieldCheck }

const VERIFY_FILTERS = [
  { value: '', label: 'All accounts' },
  { value: '1', label: 'Verified only' },
  { value: '0', label: 'Unverified only' },
]

export default function AdminUsers() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [meta, setMeta] = useState({ total: 0, pages: 1, current: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [verified, setVerified] = useState('')
  const [page, setPage] = useState(1)
  const [target, setTarget] = useState(null)
  const [editRole, setEditRole] = useState('farmer')
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const params = { page, per_page: 20 }
      if (role) params.role = role
      if (verified !== '') params.verified = verified
      const res = await adminService.users(params)
      setUsers(res.data?.data || [])
      setMeta({
        total: res.data?.total || 0,
        pages: res.data?.last_page || 1,
        current: res.data?.current_page || 1,
      })
    } catch (err) {
      setError(parseError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, verified, page])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return users
    return users.filter((person) =>
      [person.name, person.email, person.phone, person.lga, person.state]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    )
  }, [users, q])

  const summary = useMemo(() => {
    return {
      verified: users.filter((person) => person.email_verified_at).length,
      suspended: users.filter((person) => person.is_active === false).length,
      admins: users.filter((person) => person.role === 'admin').length,
    }
  }, [users])

  function openManage(person) {
    setTarget(person)
    setEditRole(person.role || 'farmer')
  }

  async function applyRole() {
    if (!target || editRole === target.role) return
    setBusy(true)
    try {
      await adminService.setRole(target.id, editRole)
      toast.success(`${target.name} is now a ${roleLabel(editRole).toLowerCase()}`)
      setTarget(null)
      await load()
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setBusy(false)
    }
  }

  async function toggleStatus(person) {
    setBusy(true)
    try {
      const res = await adminService.toggleStatus(person.id)
      toast.success(res.data?.message || 'Account status updated')
      setTarget(null)
      await load()
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setBusy(false)
    }
  }

  function changeFilter(setter, value) {
    setter(value)
    setPage(1)
  }

  const isSelf = (person) => person.id === currentUser?.id

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="Administration · participants"
        title="User & role registry"
        description="Every account on the exchange, its verified origin and its operating role. Role changes take effect on next sign-in."
        actions={
          <Button variant="outline" size="md" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
        }
      />

      {error && (
        <p className="mb-4 rounded-card border border-critical-200 bg-critical-50 px-4 py-3 text-[12.5px] text-critical-600">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Users} label="Accounts on this page" value={users.length} hint={`${meta.total} total participants`} />
        <Stat icon={BadgeCheck} label="Verified" value={summary.verified} tone="sprout" hint="Email identity confirmed" />
        <Stat icon={ShieldCheck} label="Administrators" value={summary.admins} tone="gold" hint="Platform oversight access" />
        <Stat
          icon={UserX}
          label="Suspended"
          value={summary.suspended}
          tone={summary.suspended > 0 ? 'critical' : 'neutral'}
          hint="Access revoked, records retained"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5 rounded-card border border-line bg-white px-4 py-3 shadow-card">
        <div className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-btn border border-line bg-canvas px-3 sm:flex-none">
          <Search size={14} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter this page by name, email, phone or LGA"
            aria-label="Filter users on this page"
            className="h-full w-full bg-transparent text-[12px] outline-none placeholder:text-muted/60 sm:w-64"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {ROLES.map((item) => (
            <button
              key={item.value || 'all'}
              type="button"
              onClick={() => changeFilter(setRole, item.value)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-semibold transition',
                role === item.value
                  ? 'border-forest-500 bg-forest-50 text-forest-600'
                  : 'border-line bg-white text-muted hover:border-sage-400 hover:text-ink',
              )}
            >
              {item.icon && <item.icon size={11} />}
              {item.value ? item.label.split(' ')[0] : item.label}
            </button>
          ))}
        </div>

        <NativeSelect
          value={verified}
          onChange={(e) => changeFilter(setVerified, e.target.value)}
          className="h-9 w-auto min-w-[140px] text-[12px]"
          aria-label="Filter by verification status"
        >
          {VERIFY_FILTERS.map((item) => (
            <option key={item.value || 'all'} value={item.value}>{item.label}</option>
          ))}
        </NativeSelect>
      </div>

      <div className="mt-4 overflow-hidden rounded-card border border-line bg-white shadow-card">
        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No accounts match this view"
            description="Adjust the role or verification filter. Participant records persist even after suspension."
            className="border-0 shadow-none"
          />
        ) : (
          <>
            <div className="hidden lg:block">
              <Table minWidth={940}>
                <thead>
                  <tr>
                    <Th>Participant</Th>
                    <Th>Role</Th>
                    <Th>Origin</Th>
                    <Th>Contact</Th>
                    <Th>Verification</Th>
                    <Th>Account state</Th>
                    <Th>Joined</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((person) => {
                    const RoleIcon = ROLE_ICONS[person.role] || Users
                    const suspended = person.is_active === false
                    return (
                      <Tr key={person.id}>
                        <Td>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={person.name} src={imgUrl(person.profile_image) || undefined} size="sm" />
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 break-words font-semibold text-ink">
                                {person.name}
                                {isSelf(person) && (
                                  <span className="rounded bg-sage-100 px-1 py-0.5 text-[9px] font-bold uppercase text-muted">You</span>
                                )}
                              </p>
                              <p className="break-words text-[10.5px] text-muted">ID {person.id}</p>
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <Badge tone="neutral" size="sm">
                            <RoleIcon size={10} /> {roleLabel(person.role)}
                          </Badge>
                        </Td>
                        <Td>
                          <p className="break-words text-[11.5px]">{person.lga || '—'}</p>
                          <p className="text-[10.5px] text-muted">{person.state || '—'}</p>
                        </Td>
                        <Td>
                          <p className="break-words text-[11.5px]">{person.email}</p>
                          <p className="text-[10.5px] text-muted">{person.phone || 'No phone'}</p>
                        </Td>
                        <Td>
                          <Badge tone={person.email_verified_at ? 'verified' : 'pending'} size="sm">
                            {person.email_verified_at ? <BadgeCheck size={10} /> : <Clock3 size={10} />}
                            {person.email_verified_at ? 'Verified' : 'Pending'}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge tone={suspended ? 'critical' : 'live'} size="sm">
                            {suspended ? <UserX size={10} /> : <UserCheck size={10} />}
                            {suspended ? 'Suspended' : 'Active'}
                          </Badge>
                        </Td>
                        <Td className="text-[11.5px] text-muted">{fmtDate(person.created_at)}</Td>
                        <Td>
                          <Button variant="ghost" size="sm" onClick={() => openManage(person)}>
                            <MoreHorizontal size={14} /> Manage
                          </Button>
                        </Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>

            <ul className="divide-y divide-line lg:hidden">
              {filtered.map((person) => {
                const RoleIcon = ROLE_ICONS[person.role] || Users
                const suspended = person.is_active === false
                return (
                  <li key={person.id} className="px-4 py-4">
                    <div className="flex items-start gap-2.5">
                      <Avatar name={person.name} src={imgUrl(person.profile_image) || undefined} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-[13.5px] font-bold text-ink">{person.name}</p>
                        <p className="flex items-center gap-1 text-[10.5px] text-muted">
                          <RoleIcon size={10} /> {roleLabel(person.role)}
                        </p>
                      </div>
                      <Badge tone={suspended ? 'critical' : 'live'} size="sm">
                        {suspended ? 'Suspended' : 'Active'}
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-1 pl-10 text-[10.5px] text-muted">
                      <p className="flex items-center gap-1 break-words"><Mail size={10} /> {person.email}</p>
                      <p className="flex items-center gap-1"><Phone size={10} /> {person.phone || 'No phone'}</p>
                      <p className="flex items-center gap-1">
                        <MapPin size={10} /> {[person.lga, person.state].filter(Boolean).join(', ') || 'Origin not set'}
                      </p>
                    </div>
                    <div className="mt-3 flex gap-2 pl-10">
                      <Badge tone={person.email_verified_at ? 'verified' : 'pending'} size="sm">
                        {person.email_verified_at ? 'Verified' : 'Pending'}
                      </Badge>
                      <Button variant="outline" size="sm" className="ml-auto" onClick={() => openManage(person)}>
                        Manage
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      <Pagination
        className="mt-5"
        page={meta.current}
        pages={meta.pages}
        total={meta.total}
        perPage={20}
        onChange={setPage}
      />

      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-line bg-white p-4">
        <CircleAlert size={15} className="mt-0.5 shrink-0 text-harvest-500" />
        <p className="text-[11px] leading-5 text-muted">
          Role changes reassign the participant&apos;s workspace and permissions. Suspension revokes access without
          deleting order, settlement or message records — the audit trail must stay intact for arbitration.
        </p>
      </div>

      <Modal
        open={Boolean(target)}
        onOpenChange={(open) => !open && setTarget(null)}
        title={target ? `Manage ${target.name}` : 'Manage account'}
        description="Role and access changes are recorded against your administrator identity."
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)} disabled={busy}>Close</Button>
            <Button onClick={applyRole} disabled={busy || !target || editRole === target.role}>
              <Check size={14} /> {busy ? 'Saving…' : 'Apply role'}
            </Button>
          </>
        }
      >
        {target && (
          <div className="space-y-4">
            <dl className="grid gap-2 rounded-xl border border-line bg-canvas px-4 py-3 text-[11.5px] sm:grid-cols-2">
              <div><dt className="text-muted">Account ID</dt><dd className="font-semibold text-ink">#{target.id}</dd></div>
              <div><dt className="text-muted">Current role</dt><dd className="font-semibold text-ink">{roleLabel(target.role)}</dd></div>
              <div><dt className="text-muted">Email</dt><dd className="break-words font-semibold text-ink">{target.email}</dd></div>
              <div><dt className="text-muted">Phone</dt><dd className="font-semibold text-ink">{target.phone || '—'}</dd></div>
              <div><dt className="text-muted">Verification</dt><dd className="font-semibold text-ink">{target.email_verified_at ? 'Verified' : 'Pending'}</dd></div>
              <div><dt className="text-muted">Joined</dt><dd className="font-semibold text-ink">{fmtDate(target.created_at)}</dd></div>
            </dl>

            <Field label="Operating role" hint="Takes effect on next sign-in">
              <NativeSelect value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                {ROLES.filter((item) => item.value).map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </NativeSelect>
            </Field>

            <div className="rounded-xl border border-line bg-white p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-ink">Account access</p>
                  <p className="text-[10.5px] text-muted">
                    {target.is_active === false ? 'Suspended — cannot sign in or trade.' : 'Active — full workspace access.'}
                  </p>
                </div>
                <Button
                  variant={target.is_active === false ? 'secondary' : 'danger'}
                  size="sm"
                  onClick={() => toggleStatus(target)}
                  disabled={busy || isSelf(target)}
                >
                  {target.is_active === false ? <><UserCheck size={13} /> Reactivate</> : <><UserX size={13} /> Suspend</>}
                </Button>
              </div>
              {isSelf(target) && (
                <p className="mt-2 text-[10px] text-muted">You cannot suspend your own administrator account.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
