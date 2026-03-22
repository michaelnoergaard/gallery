export interface Album {
  id: number
  name: string
  description: string
  cover_media_id: number | null
  cover_thumb_url: string | null
  created_by: number
  creator_name: string
  item_count: number
  created_at: string
  updated_at: string
}
