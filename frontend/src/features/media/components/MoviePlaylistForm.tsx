import { useState, useEffect } from 'react'
import { MoviePlaylist } from '../types/movie-playlist'
import { Button } from '@/shared/components/ui/button'

interface MoviePlaylistFormProps {
  playlist?: MoviePlaylist | null
  onSubmit: (data: { name: string; description: string | null; color: string | null }) => void
  onCancel: () => void
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
]

function MoviePlaylistForm({ playlist, onSubmit, onCancel }: MoviePlaylistFormProps) {
  const [name, setName] = useState(playlist?.name || '')
  const [description, setDescription] = useState(playlist?.description || '')
  const [color, setColor] = useState(playlist?.color || null)

  useEffect(() => {
    if (playlist) {
      setName(playlist.name)
      setDescription(playlist.description || '')
      setColor(playlist.color)
    }
  }, [playlist])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      return
    }
    onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      color: color || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter playlist name"
          className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
          required
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter playlist description (optional)"
          rows={3}
          className="w-full px-3 py-2 border border-border rounded bg-background text-foreground resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Color (optional)
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setColor(null)}
            className={`w-10 h-10 rounded border-2 ${
              color === null
                ? 'border-foreground ring-2 ring-primary'
                : 'border-border hover:border-foreground'
            } flex items-center justify-center bg-muted`}
            title="No color"
          >
            {color === null && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          {DEFAULT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-10 h-10 rounded border-2 ${
                color === c
                  ? 'border-foreground ring-2 ring-primary'
                  : 'border-border hover:border-foreground'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            >
              {color === c && (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
        <input
          type="color"
          value={color || '#000000'}
          onChange={(e) => setColor(e.target.value)}
          className="mt-2 w-full h-10 rounded border border-border cursor-pointer"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim()}>
          {playlist ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}

export default MoviePlaylistForm

