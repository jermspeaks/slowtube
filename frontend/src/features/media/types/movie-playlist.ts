import { Movie } from './movie'

export interface MoviePlaylist {
  id: number
  name: string
  description: string | null
  color: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface MoviePlaylistItem {
  id: number
  playlist_id: number
  movie_id: number
  position: number
  added_at: string
}

export interface MoviePlaylistWithMovies extends MoviePlaylist {
  movies: (Movie & { position: number; added_at: string })[]
  movie_count: number
}

export interface MoviePlaylistWithCount extends MoviePlaylist {
  movie_count: number
}

