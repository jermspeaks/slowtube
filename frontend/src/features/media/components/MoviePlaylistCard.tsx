import { useNavigate } from 'react-router'
import { MoviePlaylistWithCount } from '../types/movie-playlist'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { MoreVertical, Edit, Trash2, List } from 'lucide-react'

interface MoviePlaylistCardProps {
  playlist: MoviePlaylistWithCount
  onEdit: (playlist: MoviePlaylistWithCount) => void
  onDelete: (playlist: MoviePlaylistWithCount) => void
}

function MoviePlaylistCard({ playlist, onEdit, onDelete }: MoviePlaylistCardProps) {
  const navigate = useNavigate()

  return (
    <div className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {playlist.color && (
            <div
              className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
              style={{ backgroundColor: playlist.color }}
            />
          )}
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-lg mb-1 cursor-pointer hover:text-primary transition-colors truncate"
              onClick={() => navigate(`/media/playlists/${playlist.id}`)}
            >
              {playlist.name}
            </h3>
            {playlist.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {playlist.description}
              </p>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 hover:bg-accent rounded transition-colors flex-shrink-0">
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => navigate(`/media/playlists/${playlist.id}`)}
              className="cursor-pointer"
            >
              <List className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEdit(playlist)}
              className="cursor-pointer"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(playlist)}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{playlist.movie_count} {playlist.movie_count === 1 ? 'movie' : 'movies'}</span>
        <span className="text-xs">
          {new Date(playlist.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}

export default MoviePlaylistCard

