import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { moviePlaylistsAPI } from '../services/api'
import { MoviePlaylistWithMovies } from '../types/movie-playlist'
import MoviePlaylistMovieList from '../components/MoviePlaylistMovieList'
import MoviePlaylistForm from '../components/MoviePlaylistForm'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { toast } from 'sonner'
import { Edit, ArrowLeft } from 'lucide-react'

function MoviePlaylistDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [playlist, setPlaylist] = useState<MoviePlaylistWithMovies | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  useEffect(() => {
    if (id) {
      loadPlaylist()
    }
  }, [id])

  const loadPlaylist = async () => {
    if (!id) return

    try {
      setLoading(true)
      const data = await moviePlaylistsAPI.getById(parseInt(id, 10))
      setPlaylist(data)
    } catch (error: any) {
      console.error('Error loading playlist:', error)
      toast.error(error.response?.data?.error || 'Failed to load playlist')
      if (error.response?.status === 404) {
        navigate('/media/playlists')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (data: { name: string; description: string | null; color: string | null }) => {
    if (!playlist) return

    try {
      const updated = await moviePlaylistsAPI.update(playlist.id, data)
      setPlaylist(updated)
      toast.success('Playlist updated successfully')
      setIsEditModalOpen(false)
    } catch (error: any) {
      console.error('Error updating playlist:', error)
      toast.error(error.response?.data?.error || 'Failed to update playlist')
    }
  }

  const handleRemoveMovie = async (movieId: number) => {
    if (!playlist) return

    try {
      await moviePlaylistsAPI.removeMovie(playlist.id, movieId)
      toast.success('Movie removed from playlist')
      loadPlaylist()
    } catch (error: any) {
      console.error('Error removing movie:', error)
      toast.error(error.response?.data?.error || 'Failed to remove movie')
    }
  }

  const handleReorder = async (movieIds: number[]) => {
    if (!playlist) return

    try {
      await moviePlaylistsAPI.reorderMovies(playlist.id, movieIds)
      // Reload to get updated positions
      loadPlaylist()
    } catch (error: any) {
      console.error('Error reordering movies:', error)
      toast.error(error.response?.data?.error || 'Failed to reorder movies')
      // Reload to reset on error
      loadPlaylist()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
            <div className="text-lg text-muted-foreground">Loading playlist...</div>
          </div>
        </main>
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="text-center py-[60px] px-5 bg-card rounded-lg">
            <p className="text-lg text-muted-foreground mb-4">Playlist not found</p>
            <Button onClick={() => navigate('/media/playlists')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Playlists
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/media/playlists')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {playlist.color && (
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: playlist.color }}
                />
              )}
              <h1 className="text-2xl md:text-3xl font-bold">{playlist.name}</h1>
            </div>
            {playlist.description && (
              <p className="text-muted-foreground">{playlist.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {playlist.movie_count} {playlist.movie_count === 1 ? 'movie' : 'movies'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsEditModalOpen(true)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Drag and drop movies to reorder them in the playlist.
          </p>
        </div>

        <MoviePlaylistMovieList
          movies={playlist.movies}
          onRemove={handleRemoveMovie}
          onReorder={handleReorder}
        />
      </main>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
            <DialogDescription>
              Update playlist details.
            </DialogDescription>
          </DialogHeader>
          <MoviePlaylistForm
            playlist={playlist}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MoviePlaylistDetail

