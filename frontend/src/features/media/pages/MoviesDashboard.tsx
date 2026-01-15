import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Settings } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Movie } from '../types/movie'
import { movieDashboardAPI } from '../services/api'
import { MovieDashboardSection } from '../types/dashboard'
import MovieSectionRow from '../components/MovieSectionRow'
import ConfigureMovieDashboardModal from '../components/ConfigureMovieDashboardModal'
import { toast } from 'sonner'

function MoviesDashboard() {
  const navigate = useNavigate()
  const [sections, setSections] = useState<MovieDashboardSection[]>([])
  const [loading, setLoading] = useState(true)
  const [isConfigureModalOpen, setIsConfigureModalOpen] = useState(false)

  useEffect(() => {
    loadSections()
  }, [])

  const loadSections = async () => {
    try {
      setLoading(true)
      const response = await movieDashboardAPI.getSections()
      setSections(response.sections || [])
    } catch (error) {
      console.error('Error loading Movie dashboard sections:', error)
      toast.error('Failed to load Movie dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleMovieClick = (movie: Movie) => {
    navigate(`/media/movies/${movie.id}`)
  }

  const handleConfigureSave = () => {
    // Reload sections after configuration change
    loadSections()
  }

  const getViewAllLink = (sectionType: string, playlistId?: number) => {
    if (sectionType === 'all_movies') {
      return '/media/movies/all'
    } else if (sectionType === 'upcoming_movies') {
      return '/media/movies/all' // Could add filter for upcoming in the future
    } else if (sectionType === 'movie_playlist' && playlistId) {
      return `/media/playlists/${playlistId}`
    }
    return '#'
  }

  return (
    <>
      {/* Header with Configure button */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Welcome</h1>
        <Button
          variant="outline"
          onClick={() => setIsConfigureModalOpen(true)}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Configure
        </Button>
      </div>

      {/* Dashboard Sections */}
      {loading ? (
        <div className="flex justify-center items-center py-16 bg-card rounded-lg">
          <div className="text-lg text-muted-foreground">Loading dashboard...</div>
        </div>
      ) : sections.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-lg">
          <p className="text-lg text-muted-foreground mb-4">
            No content to display
          </p>
          <p className="text-sm text-muted-foreground">
            Configure your dashboard to show movie playlists, or add movies to your collection.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => {
            if (section.movies && section.movies.length > 0) {
              return (
                <MovieSectionRow
                  key={section.id}
                  title={section.title}
                  description={section.description}
                  movies={section.movies}
                  onMovieClick={handleMovieClick}
                  viewAllLink={getViewAllLink(section.type, section.playlistId)}
                />
              )
            }
            return null
          })}
        </div>
      )}

      {/* Configure Dashboard Modal */}
      <ConfigureMovieDashboardModal
        isOpen={isConfigureModalOpen}
        onClose={() => setIsConfigureModalOpen(false)}
        onSave={handleConfigureSave}
      />
    </>
  )
}

export default MoviesDashboard
