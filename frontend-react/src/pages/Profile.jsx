import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  BadgeCheck, Building2, Camera, Check, CircleAlert, Clock3, KeyRound, Loader2, Lock,
  LogOut, Mail, MapPin, Phone, Save, ShieldCheck, Sprout, Truck, User as UserIcon, Wallet,
} from 'lucide-react'
import { PageHeader, Avatar, Skeleton } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card, Callout, KeyValue } from '../components/ui/Card'
import { Field, Input } from '../components/ui/Form'
import { profileService } from '../lib/services'
import { NIGERIA_STATES } from '../data/nigeria'
import { fmtDate, imgUrl, roleLabel } from '../lib/format'
import { parseError, cn } from '../lib/utils'
import { useAuth } from '../store/auth'

const ROLE_ICONS = {
  farmer: Sprout,
  buyer: Building2,
  logistics_provider: Truck,
  admin: ShieldCheck,
}

export default function Profile() {
  const navigate = useNavigate()
  const { setUser, logout } = useAuth()
  const fileRef = useRef(null)
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', state: '', lga: '', address: '' })
  const [avatar, setAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('identity')

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [changing, setChanging] = useState(false)

  useEffect(() => {
    let active = true
    profileService
      .get()
      .then((res) => {
        if (!active) return
        const data = res.data?.user || res.data
        setProfile(data)
        setForm({
          name: data.name || '',
          phone: data.phone || '',
          state: data.state || '',
          lga: data.lga || '',
          address: data.address || '',
        })
      })
      .catch((err) => {
        if (active) setError(parseError(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!avatar) {
      setAvatarPreview('')
      return
    }
    const url = URL.createObjectURL(avatar)
    setAvatarPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [avatar])

  async function saveProfile(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await profileService.update({ ...form, ...(avatar ? { profile_image: avatar } : {}) })
      const updated = res.data?.user || res.data
      setProfile(updated)
      setUser(updated)
      setAvatar(null)
      toast.success('Profile updated')
    } catch (err) {
      setError(parseError(err))
    } finally {
      setSaving(false)
    }
  }

  async function changePassword(event) {
    event.preventDefault()
    if (passwords.next.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    if (passwords.next !== passwords.confirm) {
      toast.error('New passwords do not match')
      return
    }
    setChanging(true)
    try {
      await profileService.changePassword(passwords.current, passwords.next, passwords.confirm)
      toast.success('Password changed')
      setPasswords({ current: '', next: '', confirm: '' })
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setChanging(false)
    }
  }

  async function signOut() {
    await logout()
    navigate('/login')
  }

  const RoleIcon = ROLE_ICONS[profile?.role] || UserIcon
  const verified = Boolean(profile?.email_verified_at)
  const avatarSrc = avatarPreview || imgUrl(profile?.profile_image) || undefined

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="Account"
        title="Profile & verification"
        description="Identity, origin and security settings used across procurement, listing and settlement."
        actions={
          <Button variant="outline" size="md" onClick={signOut}>
            <LogOut size={15} /> Sign out
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <div className="rounded-card border border-line bg-white shadow-card">
            <div className="relative h-24 bg-forest-900">
              <div className="absolute inset-0 grid-lines opacity-10" aria-hidden />
            </div>
            <div className="px-5 pb-5">
              <div className="-mt-9 flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-end gap-3">
                  <div className="relative">
                    <Avatar name={profile?.name} src={avatarSrc} size="xl" className="h-20 w-20 rounded-2xl border-4 border-white text-xl shadow-card" />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      aria-label="Change profile photo"
                      className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-forest-500 text-white shadow-sm transition hover:bg-forest-600"
                    >
                      <Camera size={13} />
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 2 * 1024 * 1024) {
                          toast.error('Profile photo must be under 2 MB')
                          return
                        }
                        setAvatar(file)
                      }}
                    />
                  </div>
                  <div className="pb-1">
                    <h2 className="font-display text-[19px] font-extrabold tracking-[-0.01em] text-ink">
                      {profile?.name || 'Member'}
                    </h2>
                    <p className="flex items-center gap-1.5 text-[11.5px] text-muted">
                      <RoleIcon size={12} className="text-forest-500" /> {roleLabel(profile?.role)}
                      <span className="text-sage-400">·</span>
                      ID {profile?.id}
                    </p>
                  </div>
                </div>
                <Badge tone={verified ? 'verified' : 'pending'} size="md">
                  {verified ? <BadgeCheck size={11} /> : <Clock3 size={11} />}
                  {verified ? 'Email verified' : 'Email verification pending'}
                </Badge>
              </div>

              {avatar && (
                <p className="mt-3 flex items-center gap-2 text-[11px] text-harvest-600">
                  <CircleAlert size={12} /> New photo selected. Save the profile to upload it.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { value: 'identity', label: 'Identity & origin', icon: UserIcon },
              { value: 'security', label: 'Security', icon: KeyRound },
              { value: 'verification', label: 'Verification', icon: ShieldCheck },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-btn border px-3.5 text-[12.5px] font-semibold transition',
                  tab === item.value
                    ? 'border-forest-500 bg-forest-500 text-white'
                    : 'border-line bg-white text-muted hover:border-sage-400 hover:text-ink',
                )}
              >
                <item.icon size={13} /> {item.label}
              </button>
            ))}
          </div>

          {tab === 'identity' && (
            <Card>
              <div className="border-b border-line px-5 py-4">
                <h2 className="font-display text-[15px] font-bold text-ink">Identity & farm-gate origin</h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  Origin is attached to every lot you publish and every order you place.
                </p>
              </div>
              {loading ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <form onSubmit={saveProfile} className="space-y-4 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full name" required>
                      <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
                    </Field>
                    <Field label="Email address" hint="Contact the desk to change">
                      <Input value={profile?.email || ''} disabled className="bg-canvas text-muted" />
                    </Field>
                    <Field label="Phone number" required>
                      <Input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                        required
                      />
                    </Field>
                    <Field label="State" required>
                      <select
                        value={form.state}
                        onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                        className="select"
                        required
                      >
                        <option value="">Select state</option>
                        {NIGERIA_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                      </select>
                    </Field>
                    <Field label="LGA / district" required>
                      <Input value={form.lga} onChange={(e) => setForm((prev) => ({ ...prev, lga: e.target.value }))} required />
                    </Field>
                    <Field label="Physical address" required>
                      <Input
                        value={form.address}
                        onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                        required
                      />
                    </Field>
                  </div>

                  {error && (
                    <p className="rounded-lg border border-critical-200 bg-critical-50 px-3.5 py-2.5 text-[12px] font-medium text-critical-600">
                      {error}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                    <p className="text-[10.5px] text-muted">
                      Changes are reflected on live lots and open orders.
                    </p>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                      {saving ? 'Saving…' : 'Save profile'}
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          )}

          {tab === 'security' && (
            <Card>
              <div className="border-b border-line px-5 py-4">
                <h2 className="font-display text-[15px] font-bold text-ink">Password & session</h2>
                <p className="mt-0.5 text-[11px] text-muted">Use a unique password. Sessions expire when you sign out.</p>
              </div>
              <form onSubmit={changePassword} className="space-y-4 p-5">
                <Field label="Current password" required>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={passwords.current}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, current: e.target.value }))}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="New password" hint="Minimum 8 characters" required>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      value={passwords.next}
                      onChange={(e) => setPasswords((prev) => ({ ...prev, next: e.target.value }))}
                    />
                  </Field>
                  <Field label="Confirm new password" required>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      value={passwords.confirm}
                      onChange={(e) => setPasswords((prev) => ({ ...prev, confirm: e.target.value }))}
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <p className="text-[10.5px] text-muted">You will stay signed in on this device.</p>
                  <Button type="submit" disabled={changing}>
                    {changing ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
                    {changing ? 'Updating…' : 'Change password'}
                  </Button>
                </div>
              </form>

              <div className="border-t border-line px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[12.5px] font-semibold text-ink">Active session</p>
                    <p className="text-[10.5px] text-muted">This browser · authenticated with a Sanctum token</p>
                  </div>
                  <Button variant="danger" size="sm" onClick={signOut}>
                    <LogOut size={13} /> Sign out
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {tab === 'verification' && (
            <Card>
              <div className="border-b border-line px-5 py-4">
                <h2 className="font-display text-[15px] font-bold text-ink">Verification & limits</h2>
                <p className="mt-0.5 text-[11px] text-muted">The trade desk reviews identity, origin and payout instructions.</p>
              </div>
              <div className="space-y-4 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: 'Email address', done: verified, note: verified ? `Verified ${fmtDate(profile?.email_verified_at)}` : 'Verification link pending' },
                    { label: 'Phone number', done: Boolean(profile?.phone), note: profile?.phone || 'Not supplied' },
                    { label: 'Physical address', done: Boolean(profile?.address), note: profile?.address || 'Not supplied' },
                    { label: 'Email verification (KYC)', done: verified, note: verified ? 'Identity record active' : 'Required before first settlement' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-line bg-canvas p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-semibold text-ink">{item.label}</p>
                        <span
                          className={cn(
                            'grid h-5 w-5 place-items-center rounded-full',
                            item.done ? 'bg-forest-500 text-white' : 'border border-sage-400 bg-white text-muted',
                          )}
                        >
                          {item.done ? <Check size={11} strokeWidth={3.5} /> : <Clock3 size={11} />}
                        </span>
                      </div>
                      <p className="mt-1 text-[10.5px] leading-4 text-muted">{item.note}</p>
                    </div>
                  ))}
                </div>

                <Callout tone="sage" icon={ShieldCheck} title="Why verification matters">
                  Unverified accounts can list and browse, but escrow release and payout instructions are held until
                  identity is confirmed. This protects both counterparties under the platform trade rules.
                </Callout>

                <div className="rounded-xl border border-line bg-white p-4">
                  <p className="text-[12px] font-semibold text-ink">Need to update a verified detail?</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted">
                    Legal name, bank account and identity document changes require a support request so the audit
                    trail stays intact.
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link to="/messages">Contact the trade desk</Link>
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Account summary</p>
            <dl className="mt-2.5 space-y-0.5">
              <KeyValue label="Role">{roleLabel(profile?.role)}</KeyValue>
              <KeyValue label="Email">
                <span className="inline-flex items-center gap-1"><Mail size={11} className="text-muted" /> {profile?.email}</span>
              </KeyValue>
              <KeyValue label="Member since">{fmtDate(profile?.created_at)}</KeyValue>
              <KeyValue label="Account state">
                <Badge tone={verified ? 'verified' : 'pending'} size="sm">{verified ? 'Active' : 'Limited'}</Badge>
              </KeyValue>
            </dl>
          </div>

          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
              <MapPin size={12} /> Trade origin
            </p>
            <p className="mt-2 text-[12.5px] font-semibold text-ink">
              {[profile?.lga, profile?.state].filter(Boolean).join(', ') || 'Origin not set'}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              {profile?.role === 'farmer'
                ? 'This origin appears on every lot you publish. Buyers filter supply by state.'
                : profile?.role === 'buyer'
                  ? 'This is the default delivery point for procurement. Update it before confirming a delivery window.'
                  : 'This address anchors dispatch instructions and carrier matching.'}
            </p>
          </div>

          {profile?.role === 'farmer' && (
            <div className="rounded-card border border-forest-100 bg-forest-50 p-4">
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-forest-700">
                <Wallet size={13} /> Payout readiness
              </p>
              <ul className="mt-2 space-y-1.5 text-[10.5px] leading-4 text-forest-700/80">
                <li className="flex items-center gap-1.5"><Check size={10} /> NIBSS rail available</li>
                <li className="flex items-center gap-1.5"><Check size={10} /> Bank details held by settlement desk</li>
                <li className="flex items-center gap-1.5"><Phone size={10} /> USSD payout authorisation enabled</li>
              </ul>
              <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                <Link to="/farmer/payouts">Open payout statement</Link>
              </Button>
            </div>
          )}

          <div className="rounded-xl border border-line bg-white p-4">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
              <Lock size={12} /> Data handling
            </p>
            <p className="mt-1.5 text-[10.5px] leading-4 text-muted">
              Your contact and address details are shared only with counterparties on an active order and with the
              settlement desk. Public listings expose name, LGA and state only.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
