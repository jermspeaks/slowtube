import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { moviePlaylistsAPI } from '../services/api'
import { MoviePlaylistWithCount } from '../types/movie-playlist'
import { toast } from 'sonner'
import { GripVertical } from 'lucide-react'

interface ConfigureMovieDashboardModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: () => void
}

function ConfigureMovieDashboardModal({ isOpen, onClose, onSave }: ConfigureMovieDashboardModalProps) {
  const [playlists, setPlaylists] = useState<MoviePlaylistWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [displayOnHomeMap, setDisplayOnHomeMap] = useState<Map<number, boolean>>(new Map())
  const [saving, setSaving] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadPlaylists()
    }
  }, [isOpen])

  const loadPlaylists = async () => {
    try {
      setLoading(true)
      const data = await moviePlaylistsAPI.getAll()
      setPlaylists(data)
      
      // Initialize display_on_home map
      const map = new Map<number, boolean>()
      data.forEach(playlist => {
        map.set(playlist.id, playlist.display_on_home === 1)
      })
      setDisplayOnHomeMap(map)
    } catch (error) {
      console.error('Error loading movie playlists:', error)
      toast.error('Failed to load movie playlists')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (playlistId: number) => {
    const newMap = new Map(displayOnHomeMap)
    newMap.set(playlistId, !newMap.get(playlistId))
    setDisplayOnHomeMap(newMap)
  }

  const handleSelectAll = () => {
    const newMap = new Map<number, boolean>()
    playlists.forEach(playlist => {
      newMap.set(playlist.id, true)
    })
    setDisplayOnHomeMap(newMap)
  }

  const handleDeselectAll = () => {
    const newMap = new Map<number, boolean>()
    playlists.forEach(playlist => {
      newMap.set(playlist.id, false)
    })
    setDisplayOnHomeMap(newMap)
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

    const newPlaylists = [...playlists]
    const [draggedPlaylist] = newPlaylists.splice(draggedIndex, 1)
    newPlaylists.splice(dropIndex, 0, draggedPlaylist)

    setPlaylists(newPlaylists)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Reload playlists to ensure we have the latest list (in case playlists were added/deleted)
      const allPlaylists = await moviePlaylistsAPI.getAll()
      const allPlaylistIds = allPlaylists.map(p => p.id)
      const currentPlaylistIds = playlists.map(p => p.id)
      
      // Check if we have all playlists - if not, merge the new playlists with our current order
      const missingIds = allPlaylistIds.filter(id => !currentPlaylistIds.includes(id))
      let playlistsToSave = [...playlists]
      
      if (missingIds.length > 0) {
        // Add missing playlists to the end of the list
        const missingPlaylists = allPlaylists.filter(p => missingIds.includes(p.id))
        playlistsToSave = [...playlists, ...missingPlaylists]
      }
      
      // Also check for playlists that were deleted
      const deletedIds = currentPlaylistIds.filter(id => !allPlaylistIds.includes(id))
      if (deletedIds.length > 0) {
        playlistsToSave = playlistsToSave.filter(p => !deletedIds.includes(p.id))
      }
      
      // Update all playlists that changed display_on_home
      const updates: Promise<any>[] = []
      for (const playlist of playlistsToSave) {
        const currentValue = playlist.display_on_home === 1
        const newValue = displayOnHomeMap.get(playlist.id) ?? false
        
        if (currentValue !== newValue) {
          updates.push(moviePlaylistsAPI.toggleDisplayOnHome(playlist.id, newValue))
        }
      }
      
      // Save the new order - use all playlists to ensure we include everything
      const playlistIds = playlistsToSave.map(p => p.id)
      updates.push(moviePlaylistsAPI.reorderPlaylists(playlistIds))
      
      await Promise.all(updates)
      
      toast.success('Dashboard configuration updated')
      if (onSave) {
        onSave()
      }
      onClose()
    } catch (error: any) {
      console.error('Error saving dashboard configuration:', error)
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Failed to save configuration'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const displayedCount = Array.from(displayOnHomeMap.values()).filter(Boolean).length

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Display on Home</DialogTitle>
          <DialogDescription>
            Select which movie playlists should appear on your dashboard. Drag and drop to reorder them.
          </DialogDescription>
        </DialogHeader>

        {!loading && playlists.length > 0 && (
          <div className="flex gap-2 pb-2 border-b">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={saving}
              className="text-xs"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              disabled={saving}
              className="text-xs"
            >
              Deselect All
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading movie playlists...
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No movie playlists found. Create a playlist first.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {playlists.map((playlist, index) => {
                const isDisplayed = displayOnHomeMap.get(playlist.id) ?? false
                const isDragging = draggedIndex === index
                const isDragOver = dragOverIndex === index
                return (
                  <div
                    key={playlist.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border border-border
                      transition-all cursor-move
                      ${isDragging ? 'opacity-50' : ''}
                      ${isDragOver ? 'border-primary border-2 bg-accent' : 'hover:bg-accent'}
                    `}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      {playlist.color && (
                        <div
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: playlist.color }}
                        />
                      )}
                      <label
                        htmlFor={`playlist-${playlist.id}`}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="font-medium text-sm text-foreground truncate">
                          {playlist.name}
                        </div>
                        {playlist.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {playlist.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {playlist.movie_count} {playlist.movie_count === 1 ? 'movie' : 'movies'}
                        </div>
                      </label>
                    </div>
                    <input
                      id={`playlist-${playlist.id}`}
                      type="checkbox"
                      checked={isDisplayed}
                      onChange={() => handleToggle(playlist.id)}
                      className="w-5 h-5 cursor-pointer shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t pt-4 mt-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-muted-foreground">
              {displayedCount} {displayedCount === 1 ? 'playlist' : 'playlists'} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || loading}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConfigureMovieDashboardModal
