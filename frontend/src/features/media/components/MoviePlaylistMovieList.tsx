import { useState } from 'react'
import { Movie } from '../types/movie'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { X, GripVertical } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

interface MoviePlaylistMovieListProps {
  movies: (Movie & { position: number; added_at: string })[]
  onRemove: (movieId: number) => void
  onReorder: (movieIds: number[]) => void
}

function MoviePlaylistMovieList({ movies, onRemove, onReorder }: MoviePlaylistMovieListProps) {
  const navigate = useNavigate()
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const getImageUrl = (path: string | null) => {
    if (!path) return null
    return `${TMDB_IMAGE_BASE}/w185${path}`
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newMovies = [...movies]
    const [draggedMovie] = newMovies.splice(draggedIndex, 1)
    newMovies.splice(dropIndex, 0, draggedMovie)

    // Update positions
    const reorderedMovies = newMovies.map((movie, index) => ({
      ...movie,
      position: index,
    }))

    // Call onReorder with the new order of movie IDs
    const movieIds = reorderedMovies.map(m => m.id)
    onReorder(movieIds)

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  if (movies.length === 0) {
    return (
      <div className="text-center py-[60px] px-5 bg-card rounded-lg">
        <p className="text-lg text-muted-foreground">
          No movies in this playlist yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {movies.map((movie, index) => {
        const posterUrl = getImageUrl(movie.poster_path)
        const isDragging = draggedIndex === index
        const isDragOver = dragOverIndex === index

        return (
          <div
            key={movie.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`
              flex items-center gap-4 p-4 bg-card rounded-lg border border-border
              transition-all cursor-move
              ${isDragging ? 'opacity-50' : ''}
              ${isDragOver ? 'border-primary border-2' : 'hover:shadow-md'}
            `}
          >
            <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
              <GripVertical className="h-5 w-5" />
            </div>
            <div className="flex-shrink-0">
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={movie.title}
                  className="w-20 h-[120px] object-cover rounded"
                />
              ) : (
                <div className="w-20 h-[120px] bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                  No poster
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3
                className="font-bold text-lg mb-1 cursor-pointer hover:text-primary transition-colors"
                onClick={() => navigate(`/movies/${movie.id}`)}
              >
                {movie.title}
              </h3>
              {movie.overview && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {movie.overview}
                </p>
              )}
              <div className="flex gap-4 text-xs text-muted-foreground">
                {movie.release_date && (
                  <span>Released: {format(new Date(movie.release_date), 'MMM d, yyyy')}</span>
                )}
                <span>Added: {format(new Date(movie.added_at), 'MMM d, yyyy')}</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(movie.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default MoviePlaylistMovieList

