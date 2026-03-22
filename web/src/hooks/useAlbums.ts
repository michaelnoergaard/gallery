import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api/client.ts'
import type { Album } from '../types/album.ts'
import type { MediaListResult } from '../types/media.ts'

export function useAlbums() {
  return useQuery<Album[]>({
    queryKey: ['albums'],
    queryFn: () => apiClient.get<Album[]>('/api/albums'),
  })
}

export function useAlbum(id: number) {
  return useQuery<Album>({
    queryKey: ['album', id],
    queryFn: () => apiClient.get<Album>(`/api/albums/${id}`),
    enabled: id > 0,
  })
}

export function useAlbumItems(id: number, page = 1, limit = 80) {
  return useQuery<MediaListResult>({
    queryKey: ['album-items', id, page, limit],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      return apiClient.get<MediaListResult>(`/api/albums/${id}/items?${params.toString()}`)
    },
    enabled: id > 0,
  })
}

export function useCreateAlbum() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      apiClient.post<Album>('/api/albums', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] })
    },
  })
}

export function useUpdateAlbum() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name: string; description: string }) =>
      apiClient.put<Album>(`/api/albums/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['albums'] })
      queryClient.invalidateQueries({ queryKey: ['album', variables.id] })
    },
  })
}

export function useDeleteAlbum() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => apiClient.del<void>(`/api/albums/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] })
    },
  })
}

export function useAddToAlbum() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ albumId, mediaIds }: { albumId: number; mediaIds: number[] }) =>
      apiClient.post<void>(`/api/albums/${albumId}/items`, { media_ids: mediaIds }),
    onMutate: async ({ albumId }) => {
      await queryClient.cancelQueries({ queryKey: ['album', albumId] })
      await queryClient.cancelQueries({ queryKey: ['albums'] })
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['albums'] })
      queryClient.invalidateQueries({ queryKey: ['album', variables.albumId] })
      queryClient.invalidateQueries({ queryKey: ['album-items', variables.albumId] })
    },
  })
}

export function useRemoveFromAlbum() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ albumId, mediaId }: { albumId: number; mediaId: number }) =>
      apiClient.del<void>(`/api/albums/${albumId}/items/${mediaId}`),
    onMutate: async ({ albumId, mediaId }) => {
      await queryClient.cancelQueries({ queryKey: ['album-items', albumId] })

      const previousItems = queryClient.getQueryData<MediaListResult>(['album-items', albumId])
      if (previousItems) {
        queryClient.setQueryData<MediaListResult>(['album-items', albumId], {
          ...previousItems,
          items: previousItems.items.filter((i) => i.id !== mediaId),
          total: previousItems.total - 1,
        })
      }

      return { previousItems }
    },
    onError: (_err, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['album-items', variables.albumId], context.previousItems)
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['albums'] })
      queryClient.invalidateQueries({ queryKey: ['album', variables.albumId] })
      queryClient.invalidateQueries({ queryKey: ['album-items', variables.albumId] })
    },
  })
}
