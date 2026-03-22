import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api/client.ts'
import { useAuthStore } from '../stores/authStore.ts'

interface SetupStatusResponse {
  needs_setup: boolean
}

interface AuthResponse {
  access_token: string
  user: {
    id: number
    username: string
    role: string
  }
}

interface LoginPayload {
  username: string
  password: string
}

export function useSetupStatus() {
  const setNeedsSetup = useAuthStore((s) => s.setNeedsSetup)

  return useQuery({
    queryKey: ['setup-status'],
    queryFn: async () => {
      const data = await apiClient.get<SetupStatusResponse>('/api/auth/setup')
      setNeedsSetup(data.needs_setup)
      return data
    },
    retry: false,
    staleTime: 60_000,
  })
}

export function useLogin() {
  const setToken = useAuthStore((s) => s.setToken)
  const setUser = useAuthStore((s) => s.setUser)

  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      apiClient.post<AuthResponse>('/api/auth/login', payload),
    onSuccess: (data) => {
      setToken(data.access_token)
      setUser(data.user)
    },
  })
}

export function useSetup() {
  const setToken = useAuthStore((s) => s.setToken)
  const setUser = useAuthStore((s) => s.setUser)
  const setNeedsSetup = useAuthStore((s) => s.setNeedsSetup)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      apiClient.post<AuthResponse>('/api/auth/setup', payload),
    onSuccess: (data) => {
      setToken(data.access_token)
      setUser(data.user)
      setNeedsSetup(false)
      queryClient.invalidateQueries({ queryKey: ['setup-status'] })
    },
  })
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout)

  return useMutation({
    mutationFn: () => apiClient.post<void>('/api/auth/logout'),
    onSettled: () => {
      logout()
    },
  })
}
