export interface Episode {
  id: number
  tv_show_id: number
  season_number: number
  episode_number: number
  name: string | null
  overview: string | null
  air_date: string | null
  runtime: number | null
  still_path: string | null
  is_watched: number
  watched_at: string | null
  created_at: string
  updated_at: string
  tv_show_title?: string
  tv_show_poster?: string | null
}

