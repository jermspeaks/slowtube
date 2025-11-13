import { useState } from 'react'
import { TVShow } from '../types/tv-show'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { MoreVertical, Trash2, Archive, ArchiveRestore } from 'lucide-react'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

interface TVShowTableProps {
  tvShows: TVShow[]
  onDelete: (tvShow: TVShow) => void
  onArchive: (tvShow: TVShow, isArchived: boolean) => void
}

function TVShowTable({ tvShows, onDelete, onArchive }: TVShowTableProps) {
  const navigate = useNavigate()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tvShowToDelete, setTvShowToDelete] = useState<TVShow | null>(null)

  const getImageUrl = (path: string | null) => {
    if (!path) return null
    return `${TMDB_IMAGE_BASE}/w185${path}`
  }

  const handleDeleteClick = (tvShow: TVShow) => {
    setTvShowToDelete(tvShow)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (tvShowToDelete) {
      onDelete(tvShowToDelete)
      setDeleteDialogOpen(false)
      setTvShowToDelete(null)
    }
  }

  const handleArchiveClick = (tvShow: TVShow) => {
    onArchive(tvShow, !tvShow.is_archived)
  }

  const getWatchedProgress = (tvShow: TVShow) => {
    const watched = tvShow.watched_count || 0
    const total = tvShow.total_episodes || 0
    if (total === 0) return '-'
    const percentage = Math.round((watched / total) * 100)
    return `${watched}/${total} (${percentage}%)`
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-card rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-muted">
              <th className="p-3 text-left border-b-2 border-border">Poster</th>
              <th className="p-3 text-left border-b-2 border-border">Title</th>
              <th className="p-3 text-left border-b-2 border-border">Overview</th>
              <th className="p-3 text-left border-b-2 border-border">First Air Date</th>
              <th className="p-3 text-left border-b-2 border-border">Status</th>
              <th className="p-3 text-left border-b-2 border-border">Watched</th>
              <th className="p-3 text-left border-b-2 border-border">Archived</th>
              <th className="p-3 text-left border-b-2 border-border">Created At</th>
              <th className="p-3 text-left border-b-2 border-border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tvShows.map(tvShow => {
              const posterUrl = getImageUrl(tvShow.poster_path)
              return (
                <tr
                  key={tvShow.id}
                  className="border-b border-border hover:bg-accent transition-colors"
                >
                  <td className="p-2">
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={tvShow.title}
                        className="w-20 h-30 object-cover rounded"
                      />
                    ) : (
                      <div className="w-20 h-30 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        No poster
                      </div>
                    )}
                  </td>
                  <td className="p-3 max-w-[300px]">
                    <div
                      className="font-bold mb-1 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => navigate(`/tv-shows/${tvShow.id}`)}
                    >
                      {tvShow.title}
                    </div>
                    {tvShow.tmdb_id && (
                      <div className="text-xs text-muted-foreground">TMDB: {tvShow.tmdb_id}</div>
                    )}
                  </td>
                  <td className="p-3 max-w-[400px]">
                    {tvShow.overview ? (
                      <div className="text-sm text-muted-foreground line-clamp-3">
                        {tvShow.overview}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground text-sm">
                    {tvShow.first_air_date ? (
                      format(new Date(tvShow.first_air_date), 'MMM d, yyyy')
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-3">
                    {tvShow.status ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {tvShow.status}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground text-sm">
                    {getWatchedProgress(tvShow)}
                  </td>
                  <td className="p-3">
                    {tvShow.is_archived ? (
                      <span className="px-2 py-1 bg-gray-500 text-white rounded text-xs">
                        Archived
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground text-sm">
                    {tvShow.created_at ? (
                      format(new Date(tvShow.created_at), 'MMM d, yyyy')
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-accent rounded transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleArchiveClick(tvShow)}
                          className="cursor-pointer"
                        >
                          {tvShow.is_archived ? (
                            <>
                              <ArchiveRestore className="mr-2 h-4 w-4" />
                              Unarchive
                            </>
                          ) : (
                            <>
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(tvShow)}
                          className="cursor-pointer text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete TV Show</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{tvShowToDelete?.title}"? This will also delete all episodes. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setTvShowToDelete(null)
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
    </>
  )
}

export default TVShowTable

