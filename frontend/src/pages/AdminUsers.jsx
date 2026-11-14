import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { adminService } from '../lib/services'
import { fmtDate, roleLabel } from '../lib/format'
import PageHeader from '../components/PageHeader'
import {
  Avatar, Badge, EmptyState, Input, Select, Skeleton, StatusBadge
} from '../components/ui'

const EASE = [0.22, 1, 0.36, 1]
const reveal = () => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: EASE }
})

const ROLE_TONE = {
  farmer: 'success',
  buyer: 'brand',
  logistics_provider: 'amber',
  admin: 'dark'
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')

  useEffect(() => {
    adminService
      .users({ per_page: 100 })
      .then((res) => setUsers(res.data.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = users
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
    }
    if (role) list = list.filter((u) => u.role === role)
    return list
  }, [users, search, role])

  async function changeRole(id, next) {
    const prev = users
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, role: next } : u)))
    try {
      await adminService.setRole(id, next)
      toast.success('Role updated')
    } catch {
      setUsers(prev)
      toast.error('Could not update role')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="User management"
        subtitle="Review accounts and adjust access across the platform."
      />

      <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sand-400" aria-hidden />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-10"
            aria-label="Search users"
          />
        </div>
        <Select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="sm:w-48"
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          <option value="farmer">Farmer</option>
          <option value="buyer">Buyer</option>
          <option value="logistics_provider">Logistics</option>
          <option value="admin">Admin</option>
        </Select>
      </div>

      {loading ? (
        <div className="table-wrap">
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-40 max-w-full" />
                  <Skeleton className="h-2.5 w-56 max-w-full" />
                </div>
                <Skeleton className="hidden h-6 w-16 rounded-full sm:block" />
                <Skeleton className="h-9 w-32 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No users found"
          description="Try a different search term or role filter."
        />
      ) : (
        <motion.div {...reveal()} className="space-y-3">
          <div className="table-wrap">
            <table className="table min-w-[760px]">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>State</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Change role</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} src={u.profile_image} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-ink">{u.name}</p>
                          <p className="truncate text-xs text-sand-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><Badge tone={ROLE_TONE[u.role] || 'neutral'}>{roleLabel(u.role)}</Badge></td>
                    <td className="text-sm text-sand-600">{u.state || '—'}</td>
                    <td><StatusBadge status={u.is_active ? 'active' : 'suspended'} /></td>
                    <td className="tnum whitespace-nowrap text-xs text-sand-400">{fmtDate(u.created_at)}</td>
                    <td>
                      <Select
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                        className="h-9 w-full min-w-[140px] py-0 text-xs"
                        aria-label={`Change role for ${u.name}`}
                      >
                        <option value="farmer">Farmer</option>
                        <option value="buyer">Buyer</option>
                        <option value="logistics_provider">Logistics</option>
                        <option value="admin">Admin</option>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-sand-400">
            <span className="tnum">{filtered.length} of {users.length} users</span>
            <span>Roles apply immediately</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}
