import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api/client.ts'
import type { MediaListResult, ScanStatus } from '../types/media.ts'

interface MediaListParams {
  year?: number
  month?: number
  limit?: number
  q?: string
}

export function useMediaList(params: MediaListParams = {}) {
  const { year, month, limit = 80, q } = params

  return useInfiniteQuery<MediaListResult>({
    queryKey: ['media', { year, month, limit, q }],
    queryFn: async ({ pageParam }) => {
      const searchParams = new URLSearchParams()
      searchParams.set('page', String(pageParam))
      searchParams.set('limit', String(limit))
      if (year !== undefined) searchParams.set('year', String(year))
      if (month !== undefined) searchParams.set('month', String(month))
      if (q) searchParams.set('q', q)
      return apiClient.get<MediaListResult>(`/api/media?${searchParams.toString()}`)
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1
      }
      return undefined
    },
  })
}

export function useScanStatus() {
  return useQuery<ScanStatus>({
    queryKey: ['scan-status'],
    queryFn: () => apiClient.get<ScanStatus>('/api/scan/status'),
    refetchInterval: (query) => {
      return query.state.data?.running ? 2000 : false
    },
  })
}

export function useTriggerScan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient.post<void>('/api/scan'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scan-status'] })
    },
  })
}
