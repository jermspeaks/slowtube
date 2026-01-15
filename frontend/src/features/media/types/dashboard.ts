import { TVShow } from './tv-show'
import { Episode } from './episode'
import { Movie } from './movie'

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

export interface MovieDashboardSection {
  id: string
  type: 'all_movies' | 'upcoming_movies' | 'movie_playlist'
  title: string
  description: string
  movies?: Movie[]
  playlistId?: number
}

export interface MovieDashboardSectionsResponse {
  sections: MovieDashboardSection[]
}
