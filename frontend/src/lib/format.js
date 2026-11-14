export const money = (n) =>
  Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })

export const money2 = (n) =>
  Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtDate = (d, opts = {}) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', {
    year: 'numeric', month: 'short', day: 'numeric', ...opts
  })
}

export const relativeDate = (d) => {
  if (!d) return ''
  const diff = Math.floor((Date.now() - new Date(d)) / 86400000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  return fmtDate(d)
}

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase() || 'U'

export const imgUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const base = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/api\/v1\/?$/, '')
  return `${base}/storage/${path}`
}

export const roleHome = (role) => {
  switch (role) {
    case 'farmer': return '/farmer'
    case 'buyer': return '/buyer'
    case 'admin': return '/admin'
    default: return '/dashboard'
  }
}

export const roleLabel = (role) => ({
  farmer: 'Farmer',
  buyer: 'Buyer',
  logistics_provider: 'Logistics Provider',
  admin: 'Administrator'
}[role] || role || 'Member')
