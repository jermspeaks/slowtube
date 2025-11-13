import { Movie } from '../types/movie'
import { format } from 'date-fns'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

interface MovieCardProps {
  movie: Movie
  onClick?: () => void
}

function MovieCard({ movie, onClick }: MovieCardProps) {
  const getImageUrl = (path: string | null) => {
    if (!path) return null
    return `${TMDB_IMAGE_BASE}/w500${path}`
  }

  const posterUrl = getImageUrl(movie.poster_path)

  return (
    <div 
      className="bg-card rounded-lg overflow-hidden shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
      onClick={onClick}
    >
      {posterUrl ? (
        <div className="relative w-full pt-[150%]">
          <img
            src={posterUrl}
            alt={movie.title}
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full pt-[150%] bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-sm">No poster</span>
        </div>
      )}
      <div className="p-3">
        <h3 className="m-0 mb-2 text-sm font-bold line-clamp-2">
          {movie.title}
        </h3>
        {movie.overview && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {movie.overview}
          </p>
        )}
        <div className="text-[11px] text-muted-foreground flex flex-col gap-1">
          {movie.release_date && (
            <div>
              Released: {format(new Date(movie.release_date), 'MMM d, yyyy')}
            </div>
          )}
          {movie.saved_at && (
            <div>
              Saved: {format(new Date(movie.saved_at), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MovieCard

