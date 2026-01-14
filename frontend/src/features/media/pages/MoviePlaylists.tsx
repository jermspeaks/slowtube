import { useState, useEffect } from 'react'
import { moviePlaylistsAPI } from '../services/api'
import { MoviePlaylistWithCount } from '../types/movie-playlist'
import MoviePlaylistCard from '../components/MoviePlaylistCard'
import MoviePlaylistTable from '../components/MoviePlaylistTable'
import MoviePlaylistForm from '../components/MoviePlaylistForm'
import ViewToggle from '../../youtube/components/ViewToggle'
import { ViewMode } from '../../youtube/types/video'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

function MoviePlaylists() {
  const [playlists, setPlaylists] = useState<MoviePlaylistWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingPlaylist, setEditingPlaylist] = useState<MoviePlaylistWithCount | null>(null)
  const [deletingPlaylist, setDeletingPlaylist] = useState<MoviePlaylistWithCount | null>(null)

  useEffect(() => {
    loadPlaylists()
  }, [])

  const loadPlaylists = async () => {
    try {
      setLoading(true)
      const data = await moviePlaylistsAPI.getAll()
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

  const handleEdit = (playlist: MoviePlaylistWithCount) => {
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

  const handleDeleteClick = (playlist: MoviePlaylistWithCount) => {
    setDeletingPlaylist(playlist)
    setIsDeleteDialogOpen(true)
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
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
          <h1 className="text-3xl font-bold">Movie Playlists</h1>
          <div className="flex items-center gap-4">
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Playlist
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
            <div className="text-lg text-muted-foreground">Loading playlists...</div>
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-[60px] px-5 bg-card rounded-lg">
            <p className="text-lg text-muted-foreground mb-4">
              No playlists found
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first playlist to organize your movies.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Playlist
            </Button>
          </div>
        ) : (
          <>
            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playlists.map(playlist => (
                  <MoviePlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>
            ) : (
              <MoviePlaylistTable
                playlists={playlists}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            )}
          </>
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

