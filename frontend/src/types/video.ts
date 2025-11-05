export interface Video {
  id: number
  youtube_id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  duration: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  state?: 'feed' | 'inbox' | 'archive' | null
  tags?: Tag[]
  comments?: Comment[]
}

export interface Tag {
  id: number
  video_id: number
  name: string
  created_at: string
}

export interface Comment {
  id: number
  video_id: number
  content: string
  created_at: string
  updated_at: string
}

export type VideoState = 'feed' | 'inbox' | 'archive'

export type ViewMode = 'card' | 'table'

