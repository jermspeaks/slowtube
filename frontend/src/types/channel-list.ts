import { Channel } from './channel'

export interface ChannelList {
  id: number
  name: string
  description: string | null
  color: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ChannelListItem {
  id: number
  list_id: number
  youtube_channel_id: string
  position: number
  added_at: string
}

export interface ChannelListWithChannels extends ChannelList {
  channels: (Channel & { position: number; added_at: string })[]
  channel_count: number
}

export interface ChannelListWithCount extends ChannelList {
  channel_count: number
}

