import api from './api'

function toFormData(data) {
  const fd = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    if (Array.isArray(value)) {
      value.forEach((item) => fd.append(`${key}[]`, item))
      return
    }
    fd.append(key, value)
  })
  return fd
}

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) =>
    api.post('/auth/register', toFormData(data), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
}

export const profileService = {
  get: () => api.get('/profile'),
  // Multipart PUT bodies are not parsed by PHP, so spoof the verb through POST.
  update: (data) =>
    api.post('/profile', toFormData({ ...data, _method: 'PUT' }), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  changePassword: (current_password, password, password_confirmation) =>
    api.post('/profile/change-password', { current_password, password, password_confirmation }),
}

export const produceService = {
  list: (params) => api.get('/produce-listings', { params }),
  get: (id) => api.get(`/produce-listings/${id}`).then((r) => r.data?.produce ?? r.data),
  create: (data) =>
    api.post('/produce-listings', toFormData(data), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  // PHP does not parse multipart bodies on PUT, so spoof the verb through POST.
  update: (id, data) =>
    api.post(`/produce-listings/${id}`, toFormData({ ...data, _method: 'PUT' }), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  remove: (id) => api.delete(`/produce-listings/${id}`),
  mine: (params) => api.get('/farmer/listings', { params }),
  earnings: () => api.get('/farmer/earnings'),
}

export const buyerService = {
  search: (params) => api.get('/commodities/search', { params }),
  get: (id) => api.get(`/commodities/${id}`),
  dashboard: () => api.get('/buyer/dashboard'),
  orders: () => api.get('/buyer/orders'),
  savedSuppliers: () => api.get('/buyer/saved-suppliers'),
}

export const logisticsService = {
  dashboard: () => api.get('/logistics/dashboard'),
  deliveries: (params) => api.get('/logistics/deliveries', { params }),
  delivery: (id) => api.get(`/logistics/deliveries/${id}`),
  assign: (id) => api.post(`/logistics/deliveries/${id}/assign`),
  setStatus: (id, data) => api.put(`/logistics/deliveries/${id}/status`, data),
  track: (id) => api.get(`/logistics/track/${id}`),
  history: (id) => api.get(`/logistics/deliveries/${id}/tracking`),
  addTracking: (id, data) => api.post(`/logistics/deliveries/${id}/tracking`, data),
  estimate: (params) => api.get('/logistics/estimate-cost', { params }),
}

export const cartService = {
  get: () => api.get('/cart'),
  add: (produce_id, quantity) => api.post('/cart/add', { produce_id, quantity }),
  update: (produce_id, quantity) => api.put('/cart/update', { produce_id, quantity }),
  remove: (produce_id) => api.delete('/cart/remove', { data: { produce_id } }),
  clear: () => api.delete('/cart/clear'),
}

export const orderService = {
  list: (params) => api.get('/orders', { params }),
  stats: () => api.get('/orders/stats'),
  get: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  setStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  cancel: (id) => api.post(`/orders/${id}/cancel`),
  confirmDelivery: (id) => api.post(`/orders/${id}/confirm-delivery`),
}

export const deliveryOfferService = {
  // Every offer for one order, plus the current delivery state.
  forOrder: (orderId) => api.get(`/orders/${orderId}/delivery-offers`),
  propose: (orderId, data) => api.post(`/orders/${orderId}/delivery-offers`, data),
  accept: (id) => api.post(`/delivery-offers/${id}/accept`),
  decline: (id) => api.post(`/delivery-offers/${id}/decline`),
  // Drivers: paid orders that still need a driver.
  openJobs: () => api.get('/logistics/open-jobs'),
  confirmHandover: (orderId) => api.post(`/orders/${orderId}/handover-confirm`),
}

export const escrowService = {
  list: (params) => api.get('/escrow', { params }),
  forOrder: (orderId) => api.get(`/escrow/orders/${orderId}`),
  pending: () => api.get('/admin/escrow/pending'),
  release: (id, note) => api.post(`/admin/escrow/releases/${id}/release`, { note }),
  hold: (id, note) => api.post(`/admin/escrow/releases/${id}/hold`, { note }),
}

export const payoutService = {
  list: (params) => api.get('/payouts', { params }),
  // Starts a real bank transfer. Paystack's webhook marks the payout sent.
  send: (id) => api.post(`/admin/payouts/${id}/send`),
  finalizeOtp: (id, otp) => api.post(`/admin/payouts/${id}/transfer-otp`, { otp }),
  // Fallback only: money sent outside Paystack.
  markPaid: (id, note) => api.post(`/admin/payouts/${id}/paid`, { note }),
  banks: () => api.get('/banks'),
}

export const adminService = {
  users: (params) => api.get('/admin/users', { params }),
  user: (id) => api.get(`/admin/users/${id}`),
  setRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  toggleStatus: (id) => api.put(`/admin/users/${id}/status`),
  analytics: () => api.get('/admin/analytics'),
  fees: () => api.get('/admin/fees'),
  charts: (params) => api.get('/admin/chart-data', { params }),
  insights: () => api.get('/admin/market-insights'),
  orders: (params) => api.get('/admin/orders', { params }),
  commodities: (params) => api.get('/admin/commodities', { params }),
  removeCommodity: (id) => api.delete(`/admin/commodities/${id}`),
  logs: () => api.get('/admin/system-logs'),
  reviews: (params) => api.get('/admin/reviews', { params }),
  inspections: () => api.get('/admin/quality/inspections'),
  inspection: (orderId) => api.get(`/admin/quality/orders/${orderId}/inspection`),
  saveInspection: (orderId, data) => api.post(`/admin/quality/orders/${orderId}/inspection`, data),
}

export const paymentService = {
  initialize: (data) => api.post('/payment/initialize', data),
  verify: (reference) => api.post('/payment/verify', { reference }),
  history: () => api.get('/payment/history'),
}

export const messageService = {
  conversations: (params) => api.get('/messages/conversations', { params }),
  conversation: (userId, params) => api.get(`/messages/${userId}`, { params }),
  send: (data) => api.post('/messages', data),
  markRead: (userId) => api.put(`/messages/${userId}/read`),
  unread: () => api.get('/messages/unread-count'),
}

export const reviewService = {
  create: (data) => api.post('/reviews', data),
  forFarmer: (farmerId) => api.get(`/reviews/farmer/${farmerId}`),
  mine: () => api.get('/reviews'),
}
