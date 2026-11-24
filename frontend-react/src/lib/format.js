import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { API_BASE } from './api'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const NGN = '\u20A6'

export function num(value, decimals = 0) {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString('en-NG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function money(value, decimals = 0) {
  return `${NGN}${num(value, decimals)}`
}

export function compactMoney(value) {
  const n = Number(value || 0)
  if (n >= 1e9) return `${NGN}${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${NGN}${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${NGN}${(n / 1e3).toFixed(0)}K`
  return money(n)
}

export function fmtDate(value, opts = {}) {
  if (!value) return '\u2014'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '\u2014'
  return d.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...opts,
  })
}

export function fmtDateTime(value) {
  if (!value) return '\u2014'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '\u2014'
  return `${fmtDate(d)} \u00B7 ${d.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

export function relativeDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  return fmtDate(d)
}

export function initials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'RA'
  )
}

const ROLE_LABELS = {
  farmer: 'Farmer',
  buyer: 'Buyer',
  logistics_provider: 'Transporter',
  admin: 'Admin',
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || 'Member'
}

export function roleHome(role) {
  if (role === 'admin') return '/admin'
  if (role === 'farmer') return '/farmer'
  if (role === 'logistics_provider') return '/dispatch'
  return '/buyer'
}

// Images live on the API host in development and on a CDN in production.
// VITE_ASSET_URL is the public origin for uploads (for example
// https://cdn.example.com); when it is empty we fall back to the API origin.
const ASSET_BASE = (import.meta.env.VITE_ASSET_URL || '').replace(/\/+$/, '')

export function imgUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const clean = String(path).replace(/^\/+/, '')
  if (ASSET_BASE) return `${ASSET_BASE}/${clean}`

  const origin = API_BASE.replace(/\/api\/v1\/?$/, '')
  return clean.startsWith('storage/') ? `${origin}/${clean}` : `${origin}/storage/${clean}`
}

export function monthKey(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function daysBetween(a, b) {
  const start = new Date(a).getTime()
  const end = new Date(b).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return Math.ceil((end - start) / 86400000)
}

export function unitOne(unit) {
  const value = String(unit || '').trim()
  if (!value) return ''
  return /s$/i.test(value) ? value.replace(/s$/i, '') : value
}

export function qtyUnit(quantity, unit) {
  const n = Number(quantity || 0)
  return `${n.toLocaleString('en-NG')} ${n === 1 ? unitOne(unit) : String(unit || '').trim()}`.trim()
}

export function stockTone(quantity) {
  const n = Number(quantity || 0)
  if (n <= 0) return 'critical'
  if (n < 50) return 'low'
  return 'ok'
}
