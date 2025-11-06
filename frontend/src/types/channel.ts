export interface Channel {
  id: number
  youtube_channel_id: string
  channel_title: string | null
  description: string | null
  thumbnail_url: string | null
  subscriber_count: number | null
  is_subscribed: number // 0 or 1 (boolean as integer)
  custom_tags: string | null // JSON array as string
  created_at: string
  updated_at: string
}

export interface ChannelWithCount extends Channel {
  watch_later_count: number
  last_video_date: string | null
}

export type ChannelVideoType = 'watch_later' | 'latest' | 'liked'

