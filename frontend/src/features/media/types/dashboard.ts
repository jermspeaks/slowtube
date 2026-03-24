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

/** TMDB-only movie (no local id); used for discovery sections (Upcoming, In Theaters). */
export interface DiscoveryMovie {
  tmdb_id: number
  title: string
  overview: string | null
  poster_path: string | null
  backdrop_path: string | null
  release_date: string | null
}

export interface MovieDashboardSection {
  id: string
  type: 'all_movies' | 'tmdb_upcoming' | 'tmdb_now_playing' | 'upcoming_movies' | 'starred_movies' | 'movie_playlist'
  title: string
  description: string
  movies?: (Movie | DiscoveryMovie)[]
  playlistId?: number
}

export interface MovieDashboardSectionsResponse {
  sections: MovieDashboardSection[]
}
