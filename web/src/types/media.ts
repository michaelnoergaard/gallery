export interface MediaItem {
  id: number
  file_path: string
  file_name: string
  file_size: number
  file_hash: string
  media_type: 'image' | 'video'
  mime_type: string
  width: number | null
  height: number | null
  duration_ms: number | null
  taken_at: string | null
  year: number
  month: number
  thumbnail_path: string | null
  indexed_at: string
  updated_at: string
}

export interface MediaListResult {
  items: MediaItem[]
  total: number
  page: number
  total_pages: number
}

export interface ScanStatus {
  running: boolean
  files_found: number
  files_indexed: number
  files_skipped: number
  thumbs_pending: number
}
