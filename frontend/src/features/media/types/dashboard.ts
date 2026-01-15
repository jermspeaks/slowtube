import { TVShow } from './tv-show'
import { Episode } from './episode'

export interface TVDashboardSection {
  id: string
  type: 'tv_shows_last_aired' | 'upcoming_episodes' | 'recently_aired_episodes'
  title: string
  description: string
  tvShows?: TVShow[]
  episodes?: Episode[]
}

export interface TVDashboardSectionsResponse {
  sections: TVDashboardSection[]
}
