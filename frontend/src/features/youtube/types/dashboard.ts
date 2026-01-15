import { Video } from './video'
import { ChannelGroup } from '@/types/channel-list'

export interface DashboardSection {
  id: string
  type: 'inbox' | 'feed' | 'channel_group'
  title: string
  description: string
  videos: Video[]
  groupId?: number
  groupName?: string
  groupColor?: string | null
}

export interface DashboardConfig {
  sections: DashboardSection[]
}

export interface DashboardSectionsResponse {
  sections: DashboardSection[]
}
