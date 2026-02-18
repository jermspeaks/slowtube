import { useState, useEffect } from 'react'
import { moviePlaylistsAPI } from '../services/api'
import { SuggestedPlaylist, AISuggestResponse } from '../types/movie-playlist'
import { Movie } from '../types/movie'
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
import { X } from 'lucide-react'

interface AISuggestReviewModalProps {
  isOpen: boolean
  onClose: () => void
  data: AISuggestResponse
  movies: Pick<Movie, 'id' | 'title'>[]
  onSuccess?: () => void
}

function AISuggestReviewModal({ isOpen, onClose, data, movies, onSuccess }: AISuggestReviewModalProps) {
  const [playlists, setPlaylists] = useState<SuggestedPlaylist[]>([])
  const [unassigned, setUnassigned] = useState<number[]>([])
  const [applying, setApplying] = useState(false)

  const movieTitleMap = new Map(movies.map((m) => [m.id, m.title]))

  useEffect(() => {
    if (isOpen && data) {
      setPlaylists(data.suggestedPlaylists.map((p) => ({ ...p, movieIds: [...p.movieIds] })))
      setUnassigned([...data.unassignedMovieIds])
    }
  }, [isOpen, data])

  const removeFromPlaylist = (playlistIndex: number, movieId: number) => {
    setPlaylists((prev) => {
      const next = prev.map((p, i) =>
        i === playlistIndex ? { ...p, movieIds: p.movieIds.filter((id) => id !== movieId) } : p
      )
      return next
    })
    setUnassigned((prev) => (prev.includes(movieId) ? prev : [...prev, movieId]))
  }

  const addToPlaylist = (playlistIndex: number, movieId: number) => {
    setPlaylists((prev) =>
      prev.map((p, i) =>
        i === playlistIndex ? { ...p, movieIds: [...p.movieIds, movieId] } : p
      )
    )
    setUnassigned((prev) => prev.filter((id) => id !== movieId))
  }

  const updatePlaylistName = (playlistIndex: number, name: string) => {
    setPlaylists((prev) =>
      prev.map((p, i) => (i === playlistIndex ? { ...p, name } : p))
    )
  }

  const updatePlaylistDescription = (playlistIndex: number, description: string | null) => {
    setPlaylists((prev) =>
      prev.map((p, i) => (i === playlistIndex ? { ...p, description } : p))
    )
  }

  const handleApply = async () => {
    const toCreate = playlists.filter((p) => p.movieIds.length > 0)
    if (toCreate.length === 0) {
      toast.error('No playlists with movies to create')
      return
    }

    try {
      setApplying(true)
      let created = 0
      for (const p of toCreate) {
        const newPlaylist = await moviePlaylistsAPI.create(p.name, p.description, null)
        await moviePlaylistsAPI.addMovies(newPlaylist.id, p.movieIds)
        created++
      }
      toast.success(`Created ${created} playlist(s)`)
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Error applying playlists:', error)
      toast.error(error.response?.data?.error || 'Failed to create playlists')
    } finally {
      setApplying(false)
    }
  }

  if (!data) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review AI playlist suggestions</DialogTitle>
          <DialogDescription>
            Edit names and descriptions, move movies between playlists or to unassigned, then apply to create playlists.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-2">
          {playlists.map((playlist, playlistIndex) => (
            <section key={playlistIndex} className="border border-border rounded-lg p-4 space-y-2">
              <div className="grid gap-2">
                <input
                  type="text"
                  value={playlist.name}
                  onChange={(e) => updatePlaylistName(playlistIndex, e.target.value)}
                  placeholder="Playlist name"
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground font-medium"
                />
                <textarea
                  value={playlist.description ?? ''}
                  onChange={(e) =>
                    updatePlaylistDescription(playlistIndex, e.target.value.trim() || null)
                  }
                  placeholder="Short description (optional)"
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground resize-none text-sm"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Movies:</span>
                {playlist.movieIds.map((movieId) => (
                  <span
                    key={movieId}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-sm"
                  >
                    {movieTitleMap.get(movieId) ?? `Movie ${movieId}`}
                    <button
                      type="button"
                      onClick={() => removeFromPlaylist(playlistIndex, movieId)}
                      className="p-0.5 rounded hover:bg-muted-foreground/20"
                      aria-label={`Remove ${movieTitleMap.get(movieId)}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {unassigned.length > 0 && (
                  <select
                    className="pl-2 pr-8 py-1.5 text-sm border border-border rounded bg-background text-foreground"
                    value=""
                    onChange={(e) => {
                      const id = Number(e.target.value)
                      if (Number.isInteger(id)) addToPlaylist(playlistIndex, id)
                      e.target.value = ''
                    }}
                  >
                    <option value="">Add from unassigned</option>
                    {unassigned.map((id) => (
                      <option key={id} value={id}>
                        {movieTitleMap.get(id) ?? `Movie ${id}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </section>
          ))}

          {unassigned.length > 0 && (
            <section className="border border-dashed border-border rounded-lg p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Unassigned movies</h3>
              <div className="flex flex-wrap gap-2">
                {unassigned.map((movieId) => (
                  <span
                    key={movieId}
                    className="inline-flex items-center px-2 py-0.5 rounded bg-muted/60 text-sm"
                  >
                    {movieTitleMap.get(movieId) ?? `Movie ${movieId}`}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={applying}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={applying}>
            {applying ? 'Creating…' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AISuggestReviewModal
