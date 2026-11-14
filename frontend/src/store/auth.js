import { create } from 'zustand'
import { authService } from '../lib/services'

const storedUser = (() => {
  try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
})()

export const useAuth = create((set, get) => ({
  user: storedUser,
  token: localStorage.getItem('auth_token') || null,
  isLoggedIn: !!localStorage.getItem('auth_token'),

  setSession: (token, user) => {
    localStorage.setItem('auth_token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ token, user, isLoggedIn: true })
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },

  login: async (email, password) => {
    const res = await authService.login(email, password)
    const { token, user } = res.data
    get().setSession(token, user)
    return user
  },

  refresh: async () => {
    try {
      const res = await authService.me()
      const user = res.data.user
      get().setUser(user)
      return user
    } catch { return null }
  },

  logout: async () => {
    try { await authService.logout() } catch { /* ignore */ }
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    set({ user: null, token: null, isLoggedIn: false })
  }
}))
