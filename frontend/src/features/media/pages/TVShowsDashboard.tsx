import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Settings } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { TVShow } from '../types/tv-show'
import { tvDashboardAPI } from '../services/api'
import { TVDashboardSection } from '../types/dashboard'
import TVShowSectionRow from '../components/TVShowSectionRow'
import EpisodeSectionRow from '../components/EpisodeSectionRow'
import { toast } from 'sonner'

function TVShowsDashboard() {
  const navigate = useNavigate()
  const [sections, setSections] = useState<TVDashboardSection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSections()
  }, [])

  const loadSections = async () => {
    try {
      setLoading(true)
      const response = await tvDashboardAPI.getSections()
      setSections(response.sections || [])
    } catch (error) {
      console.error('Error loading TV dashboard sections:', error)
      toast.error('Failed to load TV dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleTVShowClick = (tvShow: TVShow) => {
    navigate(`/media/tv-shows/${tvShow.id}`)
  }

  const handleUpdate = () => {
    loadSections()
  }

  const getViewAllLink = (sectionType: string) => {
    if (sectionType === 'upcoming_episodes') {
      return '/media/tv-shows/up-next'
    } else if (sectionType === 'recently_aired_episodes') {
      return '/media/tv-shows/recently-aired'
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
          onClick={() => navigate('/media/tv-shows/list')}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Manage TV Shows
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
            Add TV shows to see them on your dashboard.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => {
            if (section.type === 'tv_shows_last_aired' && section.tvShows) {
              return (
                <TVShowSectionRow
                  key={section.id}
                  title={section.title}
                  description={section.description}
                  tvShows={section.tvShows}
                  onTVShowClick={handleTVShowClick}
                />
              )
            } else if (
              (section.type === 'upcoming_episodes' || section.type === 'recently_aired_episodes') &&
              section.episodes
            ) {
              return (
                <EpisodeSectionRow
                  key={section.id}
                  title={section.title}
                  description={section.description}
                  episodes={section.episodes}
                  viewAllLink={getViewAllLink(section.type)}
                  onUpdate={handleUpdate}
                />
              )
            }
            return null
          })}
        </div>
      )}
    </>
  )
}

export default TVShowsDashboard
