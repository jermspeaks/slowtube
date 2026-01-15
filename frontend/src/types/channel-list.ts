import { Channel } from './channel'

export interface ChannelGroup {
  id: number
  name: string
  description: string | null
  color: string | null
  sort_order: number
  display_on_home?: number
  created_at: string
  updated_at: string
}

export interface ChannelGroupItem {
  id: number
  list_id: number
  youtube_channel_id: string
  position: number
  added_at: string
}

export interface ChannelGroupWithChannels extends ChannelGroup {
  channels: (Channel & { position: number; added_at: string })[]
  channel_count: number
}

export interface ChannelGroupWithCount extends ChannelGroup {
  channel_count: number
}

