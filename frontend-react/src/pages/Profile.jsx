import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  BadgeCheck, Building2, Camera, Check, CircleAlert, Clock3, CreditCard, KeyRound, Landmark,
  Loader2, Lock, LogOut, Mail, MapPin, Phone, RefreshCw, Save, ShieldCheck, Sprout, Truck,
  User as UserIcon, Wallet,
} from 'lucide-react'
import { PageHeader, Avatar, Skeleton } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card, Callout, KeyValue } from '../components/ui/Card'
import { Field, Input } from '../components/ui/Form'
import { payoutService, profileService } from '../lib/services'
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
  const [searchParams] = useSearchParams()
  const { setUser, logout } = useAuth()
  const fileRef = useRef(null)
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', state: '', lga: '', address: '' })
  const [avatar, setAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState(() => (searchParams.get('tab') === 'payout' ? 'payout' : 'identity'))

  const [banks, setBanks] = useState([])
  const [banksLoading, setBanksLoading] = useState(true)
  const [banksError, setBanksError] = useState('')
  const [bankForm, setBankForm] = useState({ bank_code: '', bank_name: '', account_name: '', account_number: '' })
  const [bankSaving, setBankSaving] = useState(false)
  const [banksRetry, setBanksRetry] = useState(0)

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
        setBankForm({
          bank_code: data.bank_code || '',
          bank_name: data.bank_name || '',
          account_name: data.account_name || '',
          account_number: data.account_number || '',
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
    let active = true
    setBanksLoading(true)
    payoutService
      .banks()
      .then((res) => {
        if (active) {
          setBanks(res.data?.banks || [])
          setBanksError('')
        }
      })
      .catch(() => {
        if (active) setBanksError('The bank list could not be loaded. Check your connection and try again.')
      })
      .finally(() => {
        if (active) setBanksLoading(false)
      })
    return () => {
      active = false
    }
  }, [banksRetry])

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

  async function saveBank(event) {
    event.preventDefault()
    if (!bankForm.bank_code || !bankForm.bank_name || !bankForm.account_name) {
      toast.error('Choose your bank and enter the account name.')
      return
    }
    if (!/^\d{10}$/.test(bankForm.account_number)) {
      toast.error('The account number must be 10 digits.')
      return
    }
    setBankSaving(true)
    setError('')
    try {
      const res = await profileService.update(bankForm)
      const updated = res.data?.user || res.data
      setProfile(updated)
      setUser(updated)
      toast.success('Payout account saved')
    } catch (err) {
      setError(parseError(err))
    } finally {
      setBankSaving(false)
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
        eyebrow="My account"
        title="My profile"
        description="Your details, address and password."
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
              { value: 'payout', label: 'Payout account', icon: Landmark },
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
                <h2 className="font-display text-[15px] font-bold text-ink">Your details and address</h2>
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
                    <Field label="Email" hint="Ask our team to change this">
                      <Input value={profile?.email || ''} disabled className="bg-canvas text-muted" />
                    </Field>
                    <Field label="Phone" required>
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
                    <Field label="Local government area" required>
                      <Input value={form.lga} onChange={(e) => setForm((prev) => ({ ...prev, lga: e.target.value }))} required />
                    </Field>
                    <Field label="Address" required>
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

          {tab === 'payout' && (
            <Card>
              <div className="border-b border-line px-5 py-4">
                <h2 className="font-display text-[15px] font-bold text-ink">Payout account</h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  This is the bank account where your money is sent. Use an account in your own name.
                </p>
              </div>

              <form onSubmit={saveBank} className="space-y-4 p-5">
                <div className="rounded-xl border border-line bg-canvas p-3.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
                    <CreditCard size={13} className="text-forest-500" /> {profile?.account_number ? 'Saved account' : 'No account saved yet'}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-muted">
                    {profile?.account_number
                      ? `${profile.bank_name || 'Your bank'} · ${profile.account_name || 'Account name not set'} · ****${String(profile.account_number).slice(-4)}`
                      : 'Money released from escrow can only be transferred after you add your account here.'}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Bank" required hint={banksError ? 'Bank list unavailable' : 'The bank that holds the account'}>
                    <select
                      value={bankForm.bank_code}
                      onChange={(e) => {
                        const bank = banks.find((item) => item.code === e.target.value)
                        setBankForm((prev) => ({
                          ...prev,
                          bank_code: e.target.value,
                          bank_name: bank?.name || '',
                        }))
                      }}
                      className="select"
                      required
                      disabled={banksLoading || Boolean(banksError)}
                    >
                      <option value="">{banksLoading ? 'Loading banks…' : 'Select bank'}</option>
                      {banks.map((bank) => (
                        <option key={bank.code} value={bank.code}>{bank.name}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Account number" required hint="10 digits, no spaces">
                    <Input
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      value={bankForm.account_number}
                      onChange={(e) => setBankForm((prev) => ({
                        ...prev,
                        account_number: e.target.value.replace(/\D/g, '').slice(0, 10),
                      }))}
                      placeholder="0123456789"
                      required
                    />
                  </Field>

                  <div className="sm:col-span-2">
                    <Field label="Account name" required hint="Exactly as it appears on the bank account">
                      <Input
                        value={bankForm.account_name}
                        onChange={(e) => setBankForm((prev) => ({ ...prev, account_name: e.target.value }))}
                        placeholder="e.g. Adewale Okafor"
                        required
                      />
                    </Field>
                  </div>
                </div>

                {banksError && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-harvest-200 bg-harvest-50 px-3.5 py-2.5">
                    <p className="text-[11.5px] font-medium text-harvest-600">{banksError}</p>
                    <Button type="button" size="sm" variant="outline" onClick={() => setBanksRetry((n) => n + 1)}>
                      <RefreshCw size={13} /> Try again
                    </Button>
                  </div>
                )}

                {error && (
                  <p className="rounded-lg border border-critical-200 bg-critical-50 px-3.5 py-2.5 text-[12px] font-medium text-critical-600">
                    {error}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <p className="text-[10.5px] text-muted">
                    Changing the account stops the old account from receiving new payouts.
                  </p>
                  <Button type="submit" loading={bankSaving} disabled={Boolean(banksError)}>
                    {!bankSaving && <Save size={15} />}
                    {bankSaving ? 'Saving…' : 'Save payout account'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {tab === 'security' && (
            <Card>
              <div className="border-b border-line px-5 py-4">
                <h2 className="font-display text-[15px] font-bold text-ink">Password</h2>
                <p className="mt-0.5 text-[11px] text-muted">Use a password that only you know.</p>
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
                  <Field label="Type new password again" required>
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
                    <p className="text-[12.5px] font-semibold text-ink">This device</p>
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
                <h2 className="font-display text-[15px] font-bold text-ink">Verification</h2>
                <p className="mt-0.5 text-[11px] text-muted">Our team checks your name, address and payment details.</p>
              </div>
              <div className="space-y-4 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: 'Email address', done: verified, note: verified ? `Verified ${fmtDate(profile?.email_verified_at)}` : 'Verification link pending' },
                    { label: 'Phone number', done: Boolean(profile?.phone), note: profile?.phone || 'Not supplied' },
                    { label: 'Address', done: Boolean(profile?.address), note: profile?.address || 'Not supplied' },
                    { label: 'Email and identity check', done: verified, note: verified ? 'Your ID is on file' : 'Needed before your first payment' },
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

                <Callout tone="sage" icon={ShieldCheck} title="Why we check">
                  You can list and browse before you are verified, but payments are held until we confirm who you are.
                  This keeps both sides safe.
                </Callout>

                <div className="rounded-xl border border-line bg-white p-4">
                  <p className="text-[12px] font-semibold text-ink">Need to update a verified detail?</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted">
                    Legal name and identity document changes require a support request so the audit trail stays
                    intact. You can update your payout bank account yourself on the payout tab.
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link to="/messages">Contact our team</Link>
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Account details</p>
            <dl className="mt-2.5 space-y-0.5">
              <KeyValue label="Role">{roleLabel(profile?.role)}</KeyValue>
              <KeyValue label="Email">
                <span className="inline-flex items-center gap-1"><Mail size={11} className="text-muted" /> {profile?.email}</span>
              </KeyValue>
              <KeyValue label="Joined">{fmtDate(profile?.created_at)}</KeyValue>
              <KeyValue label="Status">
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
                  ? 'This is your default delivery address. Update it before you confirm a delivery window.'
                  : 'This address is used for pickups and delivery jobs.'}
            </p>
          </div>

          {profile?.role === 'farmer' && (
            <div className="rounded-card border border-forest-100 bg-forest-50 p-4">
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-forest-700">
                <Wallet size={13} /> Getting paid
              </p>
              <ul className="mt-2 space-y-1.5 text-[10.5px] leading-4 text-forest-700/80">
                <li className="flex items-center gap-1.5"><Check size={10} /> Money is sent to your saved bank account</li>
                <li className="flex items-center gap-1.5"><Check size={10} /> Bank details are used only for your payouts</li>
                <li className="flex items-center gap-1.5"><Phone size={10} /> Email sent when a transfer is confirmed</li>
              </ul>
              <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                <Link to="/farmer/payouts">See payment statement</Link>
              </Button>
            </div>
          )}

          <div className="rounded-xl border border-line bg-white p-4">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
              <Lock size={12} /> Data handling
            </p>
            <p className="mt-1.5 text-[10.5px] leading-4 text-muted">
              Your contact and address details are shared only with the other person on an active order and with our
              team. Public listings show only your name, local area and state.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
