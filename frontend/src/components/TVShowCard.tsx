import { TVShow } from '../types/tv-show'
import { format } from 'date-fns'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

interface TVShowCardProps {
  tvShow: TVShow
  onClick?: () => void
}

function TVShowCard({ tvShow, onClick }: TVShowCardProps) {
  const getImageUrl = (path: string | null) => {
    if (!path) return null
    return `${TMDB_IMAGE_BASE}/w500${path}`
  }

  const posterUrl = getImageUrl(tvShow.poster_path)

  return (
    <div 
      className="bg-card rounded-lg overflow-hidden shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
      onClick={onClick}
    >
      {posterUrl ? (
        <div className="relative w-full pt-[150%]">
          <img
            src={posterUrl}
            alt={tvShow.title}
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
          {tvShow.title}
        </h3>
        {tvShow.overview && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {tvShow.overview}
          </p>
        )}
        {tvShow.status && (
          <div className="mb-2">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[11px]">
              {tvShow.status}
            </span>
          </div>
        )}
        <div className="text-[11px] text-muted-foreground flex flex-col gap-1">
          {tvShow.last_air_date && (
            <div>
              Last Aired: {format(new Date(tvShow.last_air_date), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TVShowCard

