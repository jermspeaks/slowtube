import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Channel } from '../types/channel'
import { channelsAPI } from '../services/api'
import ChannelHeader from '../components/ChannelHeader'
import ChannelNavigation from '../components/ChannelNavigation'
import { toast } from 'sonner'

function ChannelLiked() {
  const navigate = useNavigate()
  const { channelId } = useParams<{ channelId: string }>()
  const [channel, setChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!channelId) {
      navigate('/youtube/channels/watch-later')
      return
    }

    loadChannel()
  }, [navigate, channelId])

  const loadChannel = async () => {
    if (!channelId) return

    try {
      setLoading(true)
      const data = await channelsAPI.getById(channelId)
      setChannel(data)
    } catch (error) {
      console.error('Error loading channel:', error)
      toast.error('Failed to load channel')
      navigate('/youtube/channels/watch-later')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
            <div className="text-lg text-muted-foreground">Loading channel...</div>
          </div>
        </main>
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="text-center py-[60px] px-5 bg-card rounded-lg">
            <p className="text-lg text-muted-foreground mb-4">Channel not found</p>
            <button
              onClick={() => navigate('/youtube/channels/watch-later')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Back to Channels
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <ChannelHeader channel={channel} onChannelUpdated={setChannel} />
        <ChannelNavigation />

        <div className="text-center py-[60px] px-5 bg-card rounded-lg">
          <p className="text-lg text-muted-foreground mb-4">
            Coming soon - Liked videos will be imported separately
          </p>
        </div>
      </main>
    </div>
  )
}

export default ChannelLiked

