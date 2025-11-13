export interface Movie {
  id: number
  tmdb_id: number
  imdb_id: string | null
  title: string
  overview: string | null
  poster_path: string | null
  backdrop_path: string | null
  release_date: string | null
  saved_at: string | null
  created_at: string
  updated_at: string
  is_archived: boolean
  is_starred: boolean
}

