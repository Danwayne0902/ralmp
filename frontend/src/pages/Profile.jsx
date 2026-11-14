import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Lock, LogOut, MapPin, Save, Settings, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'
import { profileService } from '../lib/services'
import { useAuth } from '../store/auth'
import { roleLabel } from '../lib/format'
import { nigeriaStates, getLGAsForState } from '../data/nigeria'
import PageHeader from '../components/PageHeader'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Select
} from '../components/ui'

const EASE = [0.22, 1, 0.36, 1]

const tabs = [
  { id: 'personal', label: 'Personal info', icon: UserIcon },
  { id: 'address', label: 'Address', icon: MapPin },
  { id: 'preferences', label: 'Preferences', icon: Settings },
  { id: 'security', label: 'Security', icon: Lock }
]

export default function Profile() {
  const navigate = useNavigate()
  const { user: sessionUser, setUser, logout } = useAuth()
  const reduce = useReducedMotion()
  const [tab, setTab] = useState('personal')
  const [user, setLocal] = useState({ name: '', email: '', phone: '', role: '', state: '', lga: '', address: '' })
  const [prefs, setPrefs] = useState({ email: true, sms: false })
  const [passwords, setPasswords] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const lgas = useMemo(() => getLGAsForState(user.state), [user.state])

  useEffect(() => {
    profileService
      .get()
      .then((res) => {
        const d = res.data.user || res.data
        setLocal({
          name: d.name || '', email: d.email || '', phone: d.phone || '',
          role: d.role || '', state: d.state || '', lga: d.lga || '', address: d.address || ''
        })
      })
      .catch(() => {
        if (sessionUser) {
          setLocal({
            name: sessionUser.name || '', email: sessionUser.email || '', phone: sessionUser.phone || '',
            role: sessionUser.role || '', state: sessionUser.state || '', lga: sessionUser.lga || '', address: sessionUser.address || ''
          })
        }
      })
      .finally(() => setLoading(false))
  }, [sessionUser])

  function set(key, value) {
    setLocal((u) => ({ ...u, [key]: value }))
  }

  async function savePersonal() {
    setSaving(true)
    try {
      await profileService.update({ name: user.name, email: user.email, phone: user.phone })
      setUser({ ...sessionUser, name: user.name, email: user.email, phone: user.phone })
      toast.success('Profile updated')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not update profile')
    } finally {
      setSaving(false)
    }
  }

  async function saveAddress() {
    setSaving(true)
    try {
      await profileService.update({ state: user.state, lga: user.lga, address: user.address })
      setUser({ ...sessionUser, state: user.state, lga: user.lga, address: user.address })
      toast.success('Address updated')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not update address')
    } finally {
      setSaving(false)
    }
  }

  async function savePreferences() {
    setSaving(true)
    try {
      await profileService.update({ preferences: { email_notifications: prefs.email, sms_notifications: prefs.sms } })
      toast.success('Preferences saved')
    } catch {
      toast.error('Could not save preferences')
    } finally {
      setSaving(false)
    }
  }

  async function changePassword() {
    if (passwords.password !== passwords.password_confirmation) {
      toast.error('Passwords do not match')
      return
    }
    setSaving(true)
    try {
      await profileService.changePassword(passwords.current_password, passwords.password, passwords.password_confirmation)
      toast.success('Password updated')
      setPasswords({ current_password: '', password: '', password_confirmation: '' })
    } catch (e) {
      const errors = e.response?.data?.errors
      toast.error(errors ? Object.values(errors).flat()[0] : e.response?.data?.message || 'Could not update password')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-44 skeleton" />
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            <div className="card p-6"><div className="mx-auto skeleton h-16 w-16 rounded-xl" /><div className="mx-auto mt-4 skeleton h-4 w-28" /><div className="mx-auto mt-2 skeleton h-3 w-20" /></div>
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-11 w-full" />)}</div>
          </div>
          <div className="card p-6"><div className="skeleton h-5 w-48" /><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="skeleton h-16 w-full" /><div className="skeleton h-16 w-full" /></div><div className="mt-4 skeleton h-16 w-full" /><div className="mt-6 skeleton h-10 w-36" /></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Account" title="Your profile" subtitle="Manage identity, delivery details and account security." />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <Card className="p-6 text-center">
            <Avatar name={user.name || 'Your account'} size="xl" className="mx-auto" />
            <h2 className="mt-4 font-display text-base font-bold text-ink">{user.name || 'Your account'}</h2>
            <p className="mt-0.5 text-xs text-sand-500">{roleLabel(user.role)}</p>
            <Badge tone="success" className="mt-3">Verified member</Badge>
          </Card>

          <nav className="space-y-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`side-link w-full ${tab === t.id ? 'side-link-active' : ''}`}
              >
                <t.icon size={16} /> {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="side-link w-full text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut size={16} /> Sign out
            </button>
          </nav>
        </aside>

        <motion.div
          key={tab}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          {tab === 'personal' && (
            <Card>
              <CardHeader icon={UserIcon} title="Personal information" subtitle="This is how partners see you across RALMP." />
              <CardBody className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" htmlFor="p-name">
                    <Input id="p-name" value={user.name} onChange={(e) => set('name', e.target.value)} />
                  </Field>
                  <Field label="Phone" htmlFor="p-phone">
                    <Input id="p-phone" value={user.phone} onChange={(e) => set('phone', e.target.value)} />
                  </Field>
                </div>
                <Field label="Email address" htmlFor="p-email">
                  <Input id="p-email" type="email" value={user.email} onChange={(e) => set('email', e.target.value)} />
                </Field>
                <Field label="Role" htmlFor="p-role">
                  <Input id="p-role" value={roleLabel(user.role)} disabled />
                </Field>
                <Button leftIcon={Save} onClick={savePersonal} loading={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </CardBody>
            </Card>
          )}

          {tab === 'address' && (
            <Card>
              <CardHeader icon={MapPin} title="Address & delivery" subtitle="Used to prefill checkout and delivery estimates." />
              <CardBody className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="State" htmlFor="p-state">
                    <Select
                      id="p-state"
                      value={user.state}
                      onChange={(e) => { set('state', e.target.value); set('lga', '') }}
                    >
                      <option value="">Select state…</option>
                      {nigeriaStates.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </Field>
                  <Field label="LGA" htmlFor="p-lga">
                    <Select id="p-lga" value={user.lga} onChange={(e) => set('lga', e.target.value)} disabled={!user.state}>
                      <option value="">Select LGA…</option>
                      {lgas.map((l) => <option key={l} value={l}>{l}</option>)}
                    </Select>
                  </Field>
                </div>
                <Field label="Street address" htmlFor="p-address">
                  <Input
                    id="p-address"
                    value={user.address}
                    onChange={(e) => set('address', e.target.value)}
                    placeholder="House number, street, landmark"
                  />
                </Field>
                <Button leftIcon={Save} onClick={saveAddress} loading={saving}>
                  {saving ? 'Saving…' : 'Save address'}
                </Button>
              </CardBody>
            </Card>
          )}

          {tab === 'preferences' && (
            <Card>
              <CardHeader icon={Settings} title="Notifications" subtitle="Choose how RALMP keeps you informed." />
              <CardBody className="space-y-3">
                {[
                  { key: 'email', title: 'Email notifications', desc: 'Order updates, messages and market alerts.' },
                  { key: 'sms', title: 'SMS notifications', desc: 'Delivery and payment alerts by text message.' }
                ].map((p) => (
                  <div
                    key={p.key}
                    className="flex items-center justify-between gap-4 rounded-xl border border-[color:var(--hairline)] p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">{p.title}</p>
                      <p className="mt-0.5 text-xs text-sand-500">{p.desc}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={prefs[p.key]}
                      aria-label={p.title}
                      onClick={() => setPrefs((v) => ({ ...v, [p.key]: !v[p.key] }))}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition ${prefs[p.key] ? 'bg-brand-600' : 'bg-sand-300'}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${prefs[p.key] ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
                <div className="pt-1">
                  <Button leftIcon={Save} onClick={savePreferences} loading={saving}>
                    {saving ? 'Saving…' : 'Save preferences'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {tab === 'security' && (
            <Card>
              <CardHeader icon={Lock} title="Change password" subtitle="Use at least 8 characters with a mix of letters and numbers." />
              <CardBody className="space-y-4">
                <Field label="Current password" htmlFor="p-current">
                  <Input
                    id="p-current"
                    type="password"
                    value={passwords.current_password}
                    onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="New password" htmlFor="p-new">
                    <Input
                      id="p-new"
                      type="password"
                      value={passwords.password}
                      onChange={(e) => setPasswords({ ...passwords, password: e.target.value })}
                    />
                  </Field>
                  <Field label="Confirm password" htmlFor="p-confirm">
                    <Input
                      id="p-confirm"
                      type="password"
                      value={passwords.password_confirmation}
                      onChange={(e) => setPasswords({ ...passwords, password_confirmation: e.target.value })}
                    />
                  </Field>
                </div>
                <Button leftIcon={Lock} onClick={changePassword} loading={saving}>
                  {saving ? 'Updating…' : 'Update password'}
                </Button>
              </CardBody>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  )
}
