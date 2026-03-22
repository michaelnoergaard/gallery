import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api/client.ts'

export interface AdminStats {
  total_media: number
  total_images: number
  total_videos: number
  total_albums: number
  total_users: number
  total_size_bytes: number
  thumbs_pending: number
  db_size_bytes: number
}

export interface AdminUser {
  id: number
  username: string
  email: string
  role: string
  created_at: string
}

interface CreateUserPayload {
  username: string
  password: string
  role: string
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: () => apiClient.get<AdminStats>('/api/admin/stats'),
  })
}

export function useAdminUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: () => apiClient.get<AdminUser[]>('/api/admin/users'),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateUserPayload) =>
      apiClient.post<AdminUser>('/api/admin/users', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => apiClient.del<void>(`/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}
