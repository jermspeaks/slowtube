import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { format } from 'date-fns'
import { moviePlaylistsAPI } from '../services/api'
import { MoviePlaylistWithMovies } from '../types/movie-playlist'
import MoviePlaylistForm from '../components/MoviePlaylistForm'
import MovieSectionRow from '../components/MovieSectionRow'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Button } from '@/shared/components/ui/button'
import { toast } from 'sonner'
import { Plus, MoreVertical, Edit, Trash2 } from 'lucide-react'

function MoviePlaylists() {
  const navigate = useNavigate()
  const [playlists, setPlaylists] = useState<MoviePlaylistWithMovies[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingPlaylist, setEditingPlaylist] = useState<MoviePlaylistWithMovies | null>(null)
  const [deletingPlaylist, setDeletingPlaylist] = useState<MoviePlaylistWithMovies | null>(null)

  useEffect(() => {
    loadPlaylists()
  }, [])

  const loadPlaylists = async () => {
    try {
      setLoading(true)
      const data = await moviePlaylistsAPI.getAllWithMovies()
      setPlaylists(data)
    } catch (error) {
      console.error('Error loading playlists:', error)
      toast.error('Failed to load playlists')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data: { name: string; description: string | null; color: string | null }) => {
    try {
      await moviePlaylistsAPI.create(data.name, data.description, data.color)
      toast.success('Playlist created successfully')
      setIsCreateModalOpen(false)
      loadPlaylists()
    } catch (error: any) {
      console.error('Error creating playlist:', error)
      toast.error(error.response?.data?.error || 'Failed to create playlist')
    }
  }

  const handleEdit = (playlist: MoviePlaylistWithMovies) => {
    setEditingPlaylist(playlist)
    setIsEditModalOpen(true)
  }

  const handleUpdate = async (data: { name: string; description: string | null; color: string | null }) => {
    if (!editingPlaylist) return

    try {
      await moviePlaylistsAPI.update(editingPlaylist.id, data)
      toast.success('Playlist updated successfully')
      setIsEditModalOpen(false)
      setEditingPlaylist(null)
      loadPlaylists()
    } catch (error: any) {
      console.error('Error updating playlist:', error)
      toast.error(error.response?.data?.error || 'Failed to update playlist')
    }
  }

  const handleDeleteClick = (playlist: MoviePlaylistWithMovies) => {
    setDeletingPlaylist(playlist)
    setIsDeleteDialogOpen(true)
  }

  const handleMovieClick = (movie: { id: number }) => {
    navigate(`/media/movies/${movie.id}`)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingPlaylist) return

    try {
      await moviePlaylistsAPI.delete(deletingPlaylist.id)
      toast.success('Playlist deleted successfully')
      setIsDeleteDialogOpen(false)
      setDeletingPlaylist(null)
      loadPlaylists()
    } catch (error: any) {
      console.error('Error deleting playlist:', error)
      toast.error(error.response?.data?.error || 'Failed to delete playlist')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="flex justify-between items-start mb-4 md:mb-6 flex-wrap gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">Movie Playlists</h1>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Playlist</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12 md:py-[60px] px-5 bg-card rounded-lg">
            <div className="text-base md:text-lg text-muted-foreground">Loading playlists...</div>
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-12 md:py-[60px] px-5 bg-card rounded-lg">
            <p className="text-base md:text-lg text-muted-foreground mb-4">
              No playlists found
            </p>
            <p className="text-sm md:text-base text-muted-foreground mb-4">
              Create your first playlist to organize your movies.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Playlist
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            {playlists.map((playlist) => (
              <section key={playlist.id} className="mb-8">
                {/* Header: Title, description · metadata · actions */}
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/media/playlists/${playlist.id}`}
                        className="text-xl md:text-2xl font-bold text-foreground hover:text-primary transition-colors"
                      >
                        {playlist.name}
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1">
                        {[
                          playlist.description,
                          `${playlist.movie_count} ${playlist.movie_count === 1 ? 'movie' : 'movies'}`,
                          playlist.created_at
                            ? `Created ${format(new Date(playlist.created_at), 'MMM d, yyyy')}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/media/playlists/${playlist.id}`}
                        className="text-sm text-primary hover:underline whitespace-nowrap"
                      >
                        View all
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEdit(playlist)}
                            className="cursor-pointer"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(playlist)}
                            className="cursor-pointer text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
                {/* Movie feed or empty state */}
                {playlist.movies && playlist.movies.length > 0 ? (
                  <MovieSectionRow
                    title=""
                    description=""
                    movies={playlist.movies}
                    onMovieClick={handleMovieClick}
                    onlyFeed
                  />
                ) : (
                  <div className="py-8 px-4 bg-card rounded-lg text-center">
                    <p className="text-sm text-muted-foreground mb-2">No movies in this playlist.</p>
                    <Link
                      to={`/media/playlists/${playlist.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Open playlist to add movies
                    </Link>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Playlist</DialogTitle>
            <DialogDescription>
              Create a new playlist to organize your movies.
            </DialogDescription>
          </DialogHeader>
          <MoviePlaylistForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

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
            playlist={editingPlaylist}
            onSubmit={handleUpdate}
            onCancel={() => {
              setIsEditModalOpen(false)
              setEditingPlaylist(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Playlist</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingPlaylist?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeletingPlaylist(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MoviePlaylists

