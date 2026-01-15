import { useState } from 'react'
import { Movie } from '../types/movie'
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
import { MoreVertical, Trash2, Archive, ArchiveRestore, Star, Check, X } from 'lucide-react'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

interface MovieTableProps {
  movies: Movie[]
  onDelete: (movie: Movie) => void
  onArchive?: (movie: Movie, isArchived: boolean) => void
  onStar?: (movie: Movie, isStarred: boolean) => void
  onWatched?: (movie: Movie, isWatched: boolean) => void
  selectedMovieIds?: Set<number>
  onSelectionChange?: (selectedIds: Set<number>) => void
}

function MovieTable({ movies, onDelete, onArchive, onStar, onWatched, selectedMovieIds, onSelectionChange }: MovieTableProps) {
  const navigate = useNavigate()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [movieToDelete, setMovieToDelete] = useState<Movie | null>(null)

  const isSelected = (movieId: number) => selectedMovieIds?.has(movieId) ?? false
  const allSelected = movies.length > 0 && movies.every(m => isSelected(m.id))
  const someSelected = movies.some(m => isSelected(m.id))

  const handleSelectAll = () => {
    if (!onSelectionChange) return
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(movies.map(m => m.id)))
    }
  }

  const handleSelectMovie = (movieId: number) => {
    if (!onSelectionChange || !selectedMovieIds) return
    const newSelected = new Set(selectedMovieIds)
    if (newSelected.has(movieId)) {
      newSelected.delete(movieId)
    } else {
      newSelected.add(movieId)
    }
    onSelectionChange(newSelected)
  }

  const getImageUrl = (path: string | null) => {
    if (!path) return null
    return `${TMDB_IMAGE_BASE}/w185${path}`
  }

  const handleDeleteClick = (movie: Movie) => {
    setMovieToDelete(movie)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (movieToDelete) {
      onDelete(movieToDelete)
      setDeleteDialogOpen(false)
      setMovieToDelete(null)
    }
  }

  const handleArchiveClick = (movie: Movie) => {
    if (onArchive) {
      onArchive(movie, !movie.is_archived)
    }
  }

  const handleStarClick = (movie: Movie) => {
    if (onStar) {
      onStar(movie, !movie.is_starred)
    }
  }

  const handleWatchedClick = (movie: Movie) => {
    if (onWatched) {
      onWatched(movie, !movie.is_watched)
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-card rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-muted">
              {onSelectionChange && (
                <th className="p-2 md:p-3 text-left border-b-2 border-border w-10 md:w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someSelected && !allSelected
                    }}
                    onChange={handleSelectAll}
                    className="cursor-pointer"
                  />
                </th>
              )}
              <th className="p-2 md:p-3 text-left border-b-2 border-border">Poster</th>
              <th className="p-2 md:p-3 text-left border-b-2 border-border">Title</th>
              <th className="p-2 md:p-3 text-left border-b-2 border-border hidden md:table-cell">Overview</th>
              <th className="p-2 md:p-3 text-left border-b-2 border-border">Release Date</th>
              <th className="p-2 md:p-3 text-left border-b-2 border-border hidden lg:table-cell">Created At</th>
              <th className="p-2 md:p-3 text-left border-b-2 border-border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {movies.map(movie => {
              const posterUrl = getImageUrl(movie.poster_path)
              return (
                <tr
                  key={movie.id}
                  className={`border-b border-border hover:bg-accent transition-colors ${isSelected(movie.id) ? 'bg-accent' : ''}`}
                >
                  {onSelectionChange && (
                    <td className="p-2 md:p-3">
                      <input
                        type="checkbox"
                        checked={isSelected(movie.id)}
                        onChange={() => handleSelectMovie(movie.id)}
                        className="cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="p-2 md:p-3">
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={movie.title}
                        className="w-16 h-24 md:w-20 md:h-[120px] object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-24 md:w-20 md:h-[120px] bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        No poster
                      </div>
                    )}
                  </td>
                  <td className="p-2 md:p-3 max-w-[200px] md:max-w-[300px]">
                    <div
                      className="font-bold mb-1 cursor-pointer hover:text-primary transition-colors text-sm md:text-base"
                      onClick={() => navigate(`/media/movies/${movie.id}`)}
                    >
                      {movie.title}
                    </div>
                    {movie.tmdb_id && (
                      <div className="text-xs text-muted-foreground">TMDB: {movie.tmdb_id}</div>
                    )}
                  </td>
                  <td className="p-2 md:p-3 max-w-[400px] hidden md:table-cell">
                    {movie.overview ? (
                      <div className="text-sm text-muted-foreground line-clamp-3">
                        {movie.overview}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </td>
                  <td className="p-2 md:p-3 text-muted-foreground text-xs md:text-sm">
                    {movie.release_date ? (
                      format(new Date(movie.release_date), 'MMM d, yyyy')
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-2 md:p-3 text-muted-foreground text-xs md:text-sm hidden lg:table-cell">
                    {movie.created_at ? (
                      format(new Date(movie.created_at), 'MMM d, yyyy')
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
                        {onStar && (
                          <DropdownMenuItem
                            onClick={() => handleStarClick(movie)}
                            className="cursor-pointer"
                          >
                            {movie.is_starred ? (
                              <>
                                <Star className="mr-2 h-4 w-4 fill-current" />
                                Unstar
                              </>
                            ) : (
                              <>
                                <Star className="mr-2 h-4 w-4" />
                                Star
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                        {onWatched && (
                          <DropdownMenuItem
                            onClick={() => handleWatchedClick(movie)}
                            className="cursor-pointer"
                          >
                            {movie.is_watched ? (
                              <>
                                <X className="mr-2 h-4 w-4" />
                                Mark as Unwatched
                              </>
                            ) : (
                              <>
                                <Check className="mr-2 h-4 w-4" />
                                Mark as Watched
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                        {onArchive && (
                          <DropdownMenuItem
                            onClick={() => handleArchiveClick(movie)}
                            className="cursor-pointer"
                          >
                            {movie.is_archived ? (
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
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(movie)}
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
            <DialogTitle>Delete Movie</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{movieToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setMovieToDelete(null)
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

export default MovieTable

