import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/client.ts'
import type { MediaItem } from '../types/media.ts'

export interface FolderEntry {
  name: string
  path: string
}

export interface FolderResult {
  path: string
  parent: string
  folders: FolderEntry[]
  items: MediaItem[]
  total_items: number
}

export function useFolders(path: string) {
  return useQuery<FolderResult>({
    queryKey: ['folders', path],
    queryFn: () => {
      const params = new URLSearchParams()
      if (path) params.set('path', path)
      return apiClient.get<FolderResult>(`/api/folders?${params.toString()}`)
    },
  })
}
