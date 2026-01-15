import { useState } from 'react'
import { TVShow } from '../types/tv-show'
import { format } from 'date-fns'
import { useNavigate } from 'react-router'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { MoreVertical, Trash2, Archive, ArchiveRestore, Play, PlayCircle } from 'lucide-react'
import { tvShowsAPI } from '../services/api'
import { toast } from 'sonner'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

interface TVShowTableProps {
  tvShows: TVShow[]
  onDelete: (tvShow: TVShow) => void
  onArchive: (tvShow: TVShow, isArchived: boolean) => void
  onStartedChange?: () => void
}

function TVShowTable({ tvShows, onDelete, onArchive, onStartedChange }: TVShowTableProps) {
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

  const handleStartedClick = async (tvShow: TVShow) => {
    try {
      await tvShowsAPI.setStarted(tvShow.id, !tvShow.is_started)
      toast.success(`TV show ${!tvShow.is_started ? 'marked as started' : 'marked as not started'}`)
      if (onStartedChange) {
        onStartedChange()
      }
    } catch (error) {
      console.error('Error setting started status:', error)
      toast.error('Failed to update started status')
    }
  }

  const getWatchedProgress = (tvShow: TVShow) => {
    const watched = tvShow.watched_count || 0
    const total = tvShow.total_episodes || 0
    if (total === 0) return '-'
    const percentage = Math.round((watched / total) * 100)
    return `${percentage}%`
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-card rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 md:p-3 text-left border-b-2 border-border">Poster</th>
              <th className="p-2 md:p-3 text-left border-b-2 border-border">Title</th>
              <th className="p-2 md:p-3 text-left border-b-2 border-border hidden md:table-cell">Overview</th>
              <th className="p-2 md:p-3 text-left border-b-2 border-border hidden lg:table-cell">Status</th>
              <th className="p-2 md:p-3 text-left border-b-2 border-border hidden md:table-cell">Watched</th>
              <th className="p-2 md:p-3 text-left border-b-2 border-border hidden md:table-cell">Started</th>
              <th className="p-2 md:p-3 text-left border-b-2 border-border">Last Aired</th>
              <th className="p-2 md:p-3 text-left border-b-2 border-border">Actions</th>
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
                  <td className="p-2 md:p-3">
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={tvShow.title}
                        className="w-16 h-24 md:w-20 md:h-30 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate(`/media/tv-shows/${tvShow.id}`)}
                      />
                    ) : (
                      <div 
                        className="w-16 h-24 md:w-20 md:h-30 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate(`/media/tv-shows/${tvShow.id}`)}
                      >
                        No poster
                      </div>
                    )}
                  </td>
                  <td className="p-2 md:p-3 max-w-[200px] md:max-w-[300px]">
                    <div
                      className="font-bold mb-1 cursor-pointer hover:text-primary transition-colors text-sm md:text-base"
                      onClick={() => navigate(`/media/tv-shows/${tvShow.id}`)}
                    >
                      {tvShow.title}
                    </div>
                    {tvShow.tmdb_id && (
                      <div className="text-xs text-muted-foreground">TMDB: {tvShow.tmdb_id}</div>
                    )}
                  </td>
                  <td className="p-2 md:p-3 max-w-[400px] hidden md:table-cell">
                    {tvShow.overview ? (
                      <div className="text-sm text-muted-foreground line-clamp-3">
                        {tvShow.overview}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </td>
                  <td className="p-2 md:p-3 hidden lg:table-cell">
                    {tvShow.status ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {tvShow.status}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </td>
                  <td className="p-2 md:p-3 text-muted-foreground text-xs md:text-sm hidden md:table-cell">
                    {getWatchedProgress(tvShow)}
                  </td>
                  <td className="p-2 md:p-3 hidden md:table-cell">
                    <button
                      onClick={() => handleStartedClick(tvShow)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                        tvShow.is_started
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={tvShow.is_started ? 'Mark as not started' : 'Mark as started'}
                    >
                      {tvShow.is_started ? (
                        <>
                          <PlayCircle className="h-3 w-3" />
                          Started
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" />
                          New
                        </>
                      )}
                    </button>
                  </td>
                  <td className="p-2 md:p-3 text-muted-foreground text-xs md:text-sm">
                    {tvShow.last_episode_date ? (
                      format(new Date(tvShow.last_episode_date), 'MMM d, yyyy')
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-2 md:p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-accent rounded transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleStartedClick(tvShow)}
                          className="cursor-pointer"
                        >
                          {tvShow.is_started ? (
                            <>
                              <Play className="mr-2 h-4 w-4" />
                              Mark as New
                            </>
                          ) : (
                            <>
                              <PlayCircle className="mr-2 h-4 w-4" />
                              Mark as Started
                            </>
                          )}
                        </DropdownMenuItem>
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

