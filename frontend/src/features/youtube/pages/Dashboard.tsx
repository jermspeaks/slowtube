import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Video } from '../types/video'
import { dashboardAPI, videosAPI } from '../services/api'
import { DashboardSection } from '../types/dashboard'
import DashboardSectionRow from '../components/DashboardSectionRow'
import VideoDetailModal from '../components/VideoDetailModal'
import ConfigureDashboardModal from '../components/ConfigureDashboardModal'
import { toast } from 'sonner'
import { useEntityListState } from '@/shared/hooks/useEntityListState'

function Dashboard() {
  const [sections, setSections] = useState<DashboardSection[]>([])
  const [loading, setLoading] = useState(true)
  const [isConfigureModalOpen, setIsConfigureModalOpen] = useState(false)
  const {
    selectedItem: selectedVideo,
    setSelectedItem: setSelectedVideo,
    handleItemUpdated: handleVideoUpdated,
  } = useEntityListState<Video>({})

  useEffect(() => {
    loadSections()
  }, [])

  const loadSections = async () => {
    try {
      setLoading(true)
      const response = await dashboardAPI.getSections()
      setSections(response.sections || [])
    } catch (error) {
      console.error('Error loading dashboard sections:', error)
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleVideoClick = async (video: Video) => {
    try {
      const fullVideo = await videosAPI.getById(video.id)
      setSelectedVideo(fullVideo)
    } catch (error) {
      console.error('Error loading video details:', error)
      setSelectedVideo(video)
    }
  }

  const handleVideoStateChange = (updatedVideo: Video) => {
    // Update the video in the sections
    setSections(prevSections => 
      prevSections.map(section => ({
        ...section,
        videos: section.videos.map(v => 
          v.id === updatedVideo.id ? updatedVideo : v
        )
      }))
    )
    handleVideoUpdated(updatedVideo)
  }

  const handleConfigureSave = () => {
    // Reload sections after configuration change
    loadSections()
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
            Configure your dashboard to show channel groups, or add videos to your inbox or feed.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <DashboardSectionRow
              key={section.id}
              section={section}
              onVideoClick={handleVideoClick}
              onVideoStateChange={handleVideoStateChange}
            />
          ))}
        </div>
      )}

      {/* Video Detail Modal */}
      {selectedVideo && (
        <VideoDetailModal
          video={selectedVideo}
          videos={sections.flatMap(s => s.videos)}
          onClose={() => setSelectedVideo(null)}
          onVideoUpdated={handleVideoUpdated}
          onVideoChange={(newVideo) => {
            setSelectedVideo(newVideo)
          }}
        />
      )}

      {/* Configure Dashboard Modal */}
      <ConfigureDashboardModal
        isOpen={isConfigureModalOpen}
        onClose={() => setIsConfigureModalOpen(false)}
        onSave={handleConfigureSave}
      />
    </>
  )
}

export default Dashboard
