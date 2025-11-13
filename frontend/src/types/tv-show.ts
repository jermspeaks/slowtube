export interface TVShow {
  id: number
  tmdb_id: number
  title: string
  overview: string | null
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string | null
  last_air_date: string | null
  status: string | null
  saved_at: string | null
  created_at: string
  updated_at: string
  is_archived?: boolean
  watched_count?: number
  total_episodes?: number
  next_episode_date?: string | null
  last_episode_date?: string | null
}

