import { create } from 'zustand'

interface User {
  id: number
  username: string
  role: string
}

export interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  needsSetup: boolean | null
  setToken: (token: string) => void
  setUser: (user: User | null) => void
  setNeedsSetup: (needs: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('gallery_token'),
  user: null,
  isAuthenticated: localStorage.getItem('gallery_token') !== null,
  needsSetup: null,

  setToken: (token: string) => {
    localStorage.setItem('gallery_token', token)
    set({ token, isAuthenticated: true })
  },

  setUser: (user: User | null) => {
    set({ user })
  },

  setNeedsSetup: (needs: boolean) => {
    set({ needsSetup: needs })
  },

  logout: () => {
    localStorage.removeItem('gallery_token')
    set({ token: null, user: null, isAuthenticated: false })
    window.location.href = '/login'
  },
}))
