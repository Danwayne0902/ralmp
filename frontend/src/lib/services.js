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
  register: (data) => api.post('/auth/register', toFormData(data), {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email })
}

export const profileService = {
  get: () => api.get('/profile'),
  update: (data) => api.put('/profile', data),
  changePassword: (current_password, password, password_confirmation) =>
    api.post('/profile/change-password', { current_password, password, password_confirmation })
}

export const produceService = {
  list: (params) => api.get('/produce-listings', { params }),
  get: (id) => api.get(`/produce-listings/${id}`).then((r) => ({
    ...r, data: r.data?.produce ?? r.data
  })),
  create: (data) => api.post('/produce-listings', toFormData(data), {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  // PHP does not populate the request body for PUT + multipart/form-data,
  // which made updates silently no-op. Spoof PUT through POST instead.
  update: (id, data) => api.post(`/produce-listings/${id}`, toFormData({ ...data, _method: 'PUT' }), {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  remove: (id) => api.delete(`/produce-listings/${id}`),
  mine: (params) => api.get('/farmer/listings', { params }),
  earnings: () => api.get('/farmer/earnings')
}

export const buyerService = {
  search: (params) => api.get('/commodities/search', { params }),
  dashboard: () => api.get('/buyer/dashboard'),
  orders: () => api.get('/buyer/orders')
}

export const cartService = {
  get: () => api.get('/cart'),
  add: (produce_id, quantity) => api.post('/cart/add', { produce_id, quantity }),
  update: (produce_id, quantity) => api.put('/cart/update', { produce_id, quantity }),
  remove: (produce_id) => api.delete('/cart/remove', { data: { produce_id } }),
  clear: () => api.delete('/cart/clear')
}

export const orderService = {
  list: (params) => api.get('/orders', { params }),
  get: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  setStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  cancel: (id) => api.post(`/orders/${id}/cancel`)
}

export const adminService = {
  users: (params) => api.get('/admin/users', { params }),
  setRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  toggleStatus: (id) => api.put(`/admin/users/${id}/status`),
  analytics: () => api.get('/admin/analytics'),
  charts: (params) => api.get('/admin/chart-data', { params }),
  insights: () => api.get('/admin/market-insights'),
  orders: (params) => api.get('/admin/orders', { params })
}

export const paymentService = {
  initialize: (data) => api.post('/payment/initialize', data),
  verify: (reference) => api.post('/payment/verify', { reference }),
  history: () => api.get('/payment/history')
}

export const messageService = {
  conversations: () => api.get('/messages/conversations'),
  conversation: (userId) => api.get(`/messages/${userId}`),
  send: (data) => api.post('/messages', data),
  markRead: (userId) => api.put(`/messages/${userId}/read`),
  unread: () => api.get('/messages/unread-count')
}

export const reviewService = {
  create: (data) => api.post('/reviews', data),
  forFarmer: (farmerId) => api.get(`/reviews/farmer/${farmerId}`),
  mine: () => api.get('/reviews')
}
