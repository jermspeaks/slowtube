import { useState } from 'react'
import { channelsAPI, videosAPI } from '../services/api'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Loader2 } from 'lucide-react'

interface FetchedVideo {
  id: number
  youtube_id: string
  title: string
  state: 'feed' | 'inbox' | 'archive'
  isNew: boolean
}

interface LatestVideosFetcherProps {
  channelId: string
  onVideosFetched?: () => void
}

function LatestVideosFetcher({ channelId, onVideosFetched }: LatestVideosFetcherProps) {
  const [fetching, setFetching] = useState(false)
  const [fetchedVideos, setFetchedVideos] = useState<FetchedVideo[]>([])
  const [videoStates, setVideoStates] = useState<Map<number, 'feed' | 'inbox' | 'archive'>>(new Map())
  const [updating, setUpdating] = useState(false)

  const handleFetch = async () => {
    try {
      setFetching(true)
      const response = await channelsAPI.fetchLatest(channelId, 50)
      setFetchedVideos(response.videos || [])
      
      // Initialize state map
      const statesMap = new Map<number, 'feed' | 'inbox' | 'archive'>()
      response.videos?.forEach((video: FetchedVideo) => {
        statesMap.set(video.id, video.state)
      })
      setVideoStates(statesMap)
      
      toast.success(`Fetched ${response.videos?.length || 0} videos`)
      
      if (onVideosFetched) {
        onVideosFetched()
      }
    } catch (error: any) {
      console.error('Error fetching latest videos:', error)
      toast.error(error.response?.data?.error || 'Failed to fetch latest videos')
    } finally {
      setFetching(false)
    }
  }

  const handleStateChange = (videoId: number, newState: 'feed' | 'inbox' | 'archive') => {
    setVideoStates(prev => {
      const next = new Map(prev)
      next.set(videoId, newState)
      return next
    })
  }

  const handleSaveStates = async () => {
    try {
      setUpdating(true)
      const updates = Array.from(videoStates.entries()).map(([videoId, state]) => ({
        videoId,
        state,
      }))

      await videosAPI.bulkUpdateState(updates)
      toast.success('Video states updated successfully')
      
      // Clear fetched videos so parent can show database videos
      setFetchedVideos([])
      setVideoStates(new Map())
      
      if (onVideosFetched) {
        onVideosFetched()
      }
    } catch (error: any) {
      console.error('Error updating video states:', error)
      toast.error(error.response?.data?.error || 'Failed to update video states')
    } finally {
      setUpdating(false)
    }
  }

  const getStateButtonClass = (videoId: number, state: 'feed' | 'inbox' | 'archive') => {
    const currentState = videoStates.get(videoId) || 'feed'
    const isActive = currentState === state
    
    if (isActive) {
      switch (state) {
        case 'feed': return 'bg-green-600 text-white hover:bg-green-700'
        case 'inbox': return 'bg-yellow-600 text-white hover:bg-yellow-700'
        case 'archive': return 'bg-gray-600 text-white hover:bg-gray-700'
      }
    }
    return 'bg-muted text-foreground hover:bg-accent'
  }

  if (fetchedVideos.length === 0 && !fetching) {
    return (
      <div className="text-center py-[60px] px-5 bg-card rounded-lg">
        <p className="text-lg text-muted-foreground mb-4">
          No latest videos available for this channel.
        </p>
        <Button
          onClick={handleFetch}
          disabled={fetching}
          className="mt-4"
        >
          {fetching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fetching...
            </>
          ) : (
            'Fetch Latest Videos'
          )}
        </Button>
      </div>
    )
  }

  if (fetching) {
    return (
      <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-lg text-muted-foreground">Fetching latest videos...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          Fetched Videos ({fetchedVideos.length})
        </h3>
        <Button
          onClick={handleSaveStates}
          disabled={updating}
          variant="default"
        >
          {updating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
        {fetchedVideos.map((video) => {
          const currentState = videoStates.get(video.id) || video.state
          
          return (
            <div
              key={video.id}
              className="bg-card rounded-lg shadow-md p-4 border border-border"
            >
              <h4 className="font-semibold mb-3 line-clamp-2 text-sm">
                {video.title}
              </h4>
              
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground mb-3">
                  {video.isNew ? (
                    <span className="text-green-600 font-medium">New video</span>
                  ) : (
                    <span className="text-muted-foreground">Already in database</span>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className={`flex-1 text-xs ${getStateButtonClass(video.id, 'feed')}`}
                    onClick={() => handleStateChange(video.id, 'feed')}
                  >
                    Feed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`flex-1 text-xs ${getStateButtonClass(video.id, 'inbox')}`}
                    onClick={() => handleStateChange(video.id, 'inbox')}
                  >
                    Inbox
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`flex-1 text-xs ${getStateButtonClass(video.id, 'archive')}`}
                    onClick={() => handleStateChange(video.id, 'archive')}
                  >
                    Archive
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default LatestVideosFetcher

