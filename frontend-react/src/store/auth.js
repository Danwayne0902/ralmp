import { create } from 'zustand'
import { authService } from '../lib/services'
import { TOKEN_KEY, USER_KEY } from '../lib/api'

function readUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

const initialUser = readUser()
const initialToken = localStorage.getItem(TOKEN_KEY)

export const useAuth = create((set, get) => ({
  user: initialUser,
  token: initialToken,
  isLoggedIn: Boolean(initialToken && initialUser),

  setUser: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    set({ user })
  },

  login: async (email, password) => {
    const res = await authService.login(email, password)
    const { token, user } = res.data
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    set({ token, user, isLoggedIn: true })
    return user
  },

  adopt: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    set({ token, user, isLoggedIn: true })
  },

  refresh: async () => {
    if (!get().token) return null
    const res = await authService.me()
    const user = res.data?.user ?? res.data
    if (user?.id) {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      set({ user })
    }
    return user
  },

  logout: async () => {
    try {
      await authService.logout()
    } catch {
      /* session may already be gone */
    }
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    set({ user: null, token: null, isLoggedIn: false })
  },

  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    set({ user: null, token: null, isLoggedIn: false })
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('ralmp:unauthorized', () => {
    useAuth.getState().clear()
  })
}
