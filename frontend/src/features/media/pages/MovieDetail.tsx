import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Movie } from '../types/movie'
import { moviesAPI } from '../services/api'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Star, Archive, ArchiveRestore, Trash2, Check, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

function MovieDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  useEffect(() => {
    if (!id) {
      navigate('/movies')
      return
    }

    loadMovie()
  }, [navigate, id])

  const loadMovie = async () => {
    if (!id) return

    try {
      setLoading(true)
      const data = await moviesAPI.getById(parseInt(id, 10))
      setMovie(data)
    } catch (error) {
      console.error('Error loading movie:', error)
      toast.error('Failed to load movie')
      navigate('/movies')
    } finally {
      setLoading(false)
    }
  }

  const handleArchive = async () => {
    if (!id || !movie) return

    try {
      await moviesAPI.archive(parseInt(id, 10), !movie.is_archived)
      await loadMovie()
      toast.success(`Movie ${movie.is_archived ? 'unarchived' : 'archived'} successfully`)
    } catch (error) {
      console.error('Error archiving movie:', error)
      toast.error('Failed to archive movie')
    }
  }

  const handleStar = async () => {
    if (!id || !movie) return

    try {
      await moviesAPI.star(parseInt(id, 10), !movie.is_starred)
      await loadMovie()
      toast.success(`Movie ${movie.is_starred ? 'unstarred' : 'starred'} successfully`)
    } catch (error) {
      console.error('Error starring movie:', error)
      toast.error('Failed to star movie')
    }
  }

  const handleWatched = async () => {
    if (!id || !movie) return

    try {
      await moviesAPI.watched(parseInt(id, 10), !movie.is_watched)
      await loadMovie()
      toast.success(`Movie marked as ${movie.is_watched ? 'unwatched' : 'watched'} successfully`)
    } catch (error) {
      console.error('Error marking movie as watched:', error)
      toast.error('Failed to mark movie as watched')
    }
  }

  const handleDelete = async () => {
    if (!id) return

    try {
      await moviesAPI.delete(parseInt(id, 10))
      toast.success('Movie deleted successfully')
      navigate('/movies')
    } catch (error) {
      console.error('Error deleting movie:', error)
      toast.error('Failed to delete movie')
    }
  }

  const getImageUrl = (path: string | null, size: string = 'w500') => {
    if (!path) return null
    return `${TMDB_IMAGE_BASE}/${size}${path}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
            <div className="text-lg text-muted-foreground">Loading movie...</div>
          </div>
        </main>
      </div>
    )
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="text-center py-[60px] px-5 bg-card rounded-lg">
            <p className="text-lg text-muted-foreground mb-4">Movie not found</p>
            <button
              onClick={() => navigate('/movies')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Back to Movies
            </button>
          </div>
        </main>
      </div>
    )
  }

  const backdropUrl = getImageUrl(movie.backdrop_path, 'w1280')
  const posterUrl = getImageUrl(movie.poster_path, 'w500')

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Header Section with Backdrop */}
        <div className="relative rounded-lg overflow-hidden mb-6 shadow-lg">
          {backdropUrl && (
            <div className="absolute inset-0">
              <img
                src={backdropUrl}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60" />
            </div>
          )}
          <div className={`relative p-6 ${backdropUrl ? 'text-white' : 'bg-card'}`}>
            <div className="flex items-start gap-6">
              {posterUrl && (
                <img
                  src={posterUrl}
                  alt={movie.title}
                  className="w-32 h-48 object-cover rounded flex-shrink-0 shadow-lg"
                />
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold mb-3">{movie.title}</h1>
                
                <div className="flex flex-wrap gap-3 items-center mb-4">
                  {movie.release_date && (
                    <span className="text-sm opacity-90">
                      Released: {format(new Date(movie.release_date), 'MMM d, yyyy')}
                    </span>
                  )}
                  {movie.saved_at && (
                    <span className="text-sm opacity-90">
                      Saved: {format(new Date(movie.saved_at), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate('/movies')}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded transition-colors backdrop-blur-sm"
                  >
                    Back to Movies
                  </button>
                  <button
                    onClick={handleStar}
                    className={`px-4 py-2 rounded transition-colors backdrop-blur-sm flex items-center gap-2 ${
                      movie.is_starred
                        ? 'bg-yellow-500/80 hover:bg-yellow-500 text-white'
                        : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                  >
                    <Star className={`h-4 w-4 ${movie.is_starred ? 'fill-current' : ''}`} />
                    {movie.is_starred ? 'Starred' : 'Star'}
                  </button>
                  <button
                    onClick={handleWatched}
                    className={`px-4 py-2 rounded transition-colors backdrop-blur-sm flex items-center gap-2 ${
                      movie.is_watched
                        ? 'bg-green-500/80 hover:bg-green-500 text-white'
                        : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                  >
                    {movie.is_watched ? (
                      <>
                        <Check className="h-4 w-4" />
                        Watched
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4" />
                        Mark as Watched
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleArchive}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded transition-colors backdrop-blur-sm flex items-center gap-2"
                  >
                    {movie.is_archived ? (
                      <>
                        <ArchiveRestore className="h-4 w-4" />
                        Unarchive
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4" />
                        Archive
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded transition-colors backdrop-blur-sm flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                  <a
                    href={`https://www.themoviedb.org/movie/${movie.tmdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded transition-colors backdrop-blur-sm inline-block"
                  >
                    View on TMDB →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Section */}
        {movie.overview && (
          <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold mb-3">Overview</h2>
            <p className="text-muted-foreground leading-relaxed">{movie.overview}</p>
          </div>
        )}

        {/* Statistics Section */}
        <div className="bg-card rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4">Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {movie.release_date && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Release Date</div>
                <div className="text-lg font-semibold">
                  {format(new Date(movie.release_date), 'MMMM d, yyyy')}
                </div>
              </div>
            )}
            {movie.saved_at && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Saved Date</div>
                <div className="text-lg font-semibold">
                  {format(new Date(movie.saved_at), 'MMMM d, yyyy')}
                </div>
              </div>
            )}
            {movie.created_at && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Added to Collection</div>
                <div className="text-lg font-semibold">
                  {format(new Date(movie.created_at), 'MMMM d, yyyy')}
                </div>
              </div>
            )}
            {movie.imdb_id && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">IMDB ID</div>
                <div className="text-lg font-semibold">
                  <a
                    href={`https://www.imdb.com/title/${movie.imdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {movie.imdb_id}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Movie</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{movie?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                handleDelete()
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MovieDetail

