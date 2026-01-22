import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router'
import { videosAPI } from '../services/api'
import { toast } from 'sonner'
import { Channel } from '../types/channel'

interface ChannelWithLikedCount extends Channel {
  liked_count: number
}

function LikedChannels() {
  const navigate = useNavigate()
  const [channels, setChannels] = useState<ChannelWithLikedCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChannels()
  }, [])

  const loadChannels = async () => {
    try {
      setLoading(true)
      const response = await videosAPI.getChannelsFromLikedVideos()
      setChannels(response.channels || [])
    } catch (error) {
      console.error('Error loading channels from liked videos:', error)
      toast.error('Failed to load channels')
    } finally {
      setLoading(false)
    }
  }

  const handleChannelClick = (channel: ChannelWithLikedCount) => {
    if (channel.youtube_channel_id) {
      navigate(`/youtube/channels/${channel.youtube_channel_id}/liked`)
    }
  }

  return (
    <>
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Channels with Liked Videos</h1>

      {loading ? (
        <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
          <div className="text-lg text-muted-foreground">Loading channels...</div>
        </div>
      ) : channels.length === 0 ? (
        <div className="text-center py-[60px] px-5 bg-card rounded-lg">
          <p className="text-lg text-muted-foreground mb-4">
            No channels with liked videos
          </p>
          <p className="text-sm text-muted-foreground">
            Channels will appear here once you have liked videos from them.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {channels.map((channel) => (
            <div
              key={channel.id}
              onClick={() => handleChannelClick(channel)}
              className="bg-card rounded-lg p-4 shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
            >
              {channel.thumbnail_url && (
                <div className="mb-3">
                  <img
                    src={channel.thumbnail_url}
                    alt={channel.channel_title || 'Channel'}
                    className="w-full h-32 object-cover rounded"
                  />
                </div>
              )}
              <h3 className="font-bold text-sm mb-2 line-clamp-2">
                {channel.channel_title || 'Unknown Channel'}
              </h3>
              <div className="text-xs text-muted-foreground">
                <div className="mb-1">
                  {channel.liked_count} {channel.liked_count === 1 ? 'liked video' : 'liked videos'}
                </div>
                {channel.subscriber_count && (
                  <div>
                    {channel.subscriber_count.toLocaleString()} subscribers
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default LikedChannels
