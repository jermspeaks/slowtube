import { useState, useEffect } from 'react'
import { moviePlaylistsAPI } from '../services/api'
import { MoviePlaylistWithCount } from '../types/movie-playlist'
import MoviePlaylistForm from './MoviePlaylistForm'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { toast } from 'sonner'
import { Plus, Check } from 'lucide-react'

interface AddToPlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  movieIds: number[]
  onSuccess?: () => void
}

function AddToPlaylistModal({ isOpen, onClose, movieIds, onSuccess }: AddToPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<MoviePlaylistWithCount[]>([])
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadPlaylists()
      setSelectedPlaylistIds(new Set())
      setShowCreateForm(false)
    }
  }, [isOpen])

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

  const handleTogglePlaylist = (playlistId: number) => {
    const newSelected = new Set(selectedPlaylistIds)
    if (newSelected.has(playlistId)) {
      newSelected.delete(playlistId)
    } else {
      newSelected.add(playlistId)
    }
    setSelectedPlaylistIds(newSelected)
  }

  const handleCreatePlaylist = async (data: { name: string; description: string | null; color: string | null }) => {
    try {
      const newPlaylist = await moviePlaylistsAPI.create(data.name, data.description, data.color)
      toast.success('Playlist created successfully')
      setShowCreateForm(false)
      await loadPlaylists()
      // Automatically select the newly created playlist
      setSelectedPlaylistIds(new Set([newPlaylist.id]))
    } catch (error: any) {
      console.error('Error creating playlist:', error)
      toast.error(error.response?.data?.error || 'Failed to create playlist')
    }
  }

  const handleAddToPlaylists = async () => {
    if (selectedPlaylistIds.size === 0) {
      toast.error('Please select at least one playlist')
      return
    }

    try {
      setLoading(true)
      let successCount = 0
      let errorCount = 0

      for (const playlistId of selectedPlaylistIds) {
        try {
          await moviePlaylistsAPI.addMovies(playlistId, movieIds)
          successCount++
        } catch (error) {
          errorCount++
          console.error(`Error adding movies to playlist ${playlistId}:`, error)
        }
      }

      if (successCount > 0) {
        toast.success(`Added ${movieIds.length} movie(s) to ${successCount} playlist(s)`)
        onSuccess?.()
        onClose()
      } else {
        toast.error('Failed to add movies to playlists')
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} playlist(s) failed to update`)
      }
    } catch (error) {
      console.error('Error adding movies to playlists:', error)
      toast.error('Failed to add movies to playlists')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add to Playlist</DialogTitle>
          <DialogDescription>
            Select playlists to add {movieIds.length} {movieIds.length === 1 ? 'movie' : 'movies'} to.
          </DialogDescription>
        </DialogHeader>

        {showCreateForm ? (
          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={() => setShowCreateForm(false)}
              className="mb-2"
            >
              ← Back to playlists
            </Button>
            <MoviePlaylistForm
              onSubmit={handleCreatePlaylist}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={() => setShowCreateForm(true)}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Create New Playlist
            </Button>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading playlists...
              </div>
            ) : playlists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4">No playlists found.</p>
                <p className="text-sm">Create a new playlist to get started.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {playlists.map(playlist => {
                  const isSelected = selectedPlaylistIds.has(playlist.id)
                  return (
                    <div
                      key={playlist.id}
                      onClick={() => handleTogglePlaylist(playlist.id)}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                        transition-colors
                        ${isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-accent'
                        }
                      `}
                    >
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded border-2 border-primary bg-primary flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded border-2 border-border" />
                        )}
                      </div>
                      {playlist.color && (
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: playlist.color }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{playlist.name}</div>
                        {playlist.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {playlist.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {playlist.movie_count} {playlist.movie_count === 1 ? 'movie' : 'movies'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleAddToPlaylists}
                disabled={loading || selectedPlaylistIds.size === 0}
              >
                {loading ? 'Adding...' : `Add to ${selectedPlaylistIds.size} Playlist(s)`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default AddToPlaylistModal

