import axios from 'axios'

export const API_BASE =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'

export const TOKEN_KEY = 'ralmp_token'
export const USER_KEY = 'ralmp_user'

const api = axios.create({
  baseURL: API_BASE,
  headers: { Accept: 'application/json' },
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      window.dispatchEvent(new Event('ralmp:unauthorized'))
    }
    return Promise.reject(error)
  },
)

export default api
