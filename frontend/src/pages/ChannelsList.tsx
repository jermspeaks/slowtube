import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Channel, ChannelWithCount } from '../types/channel'
import { channelsAPI } from '../services/api'

function ChannelsList() {
  const location = useLocation()
  const [channels, setChannels] = useState<ChannelWithCount[]>([])
  const [loading, setLoading] = useState(true)

  // Determine filter type from route
  const filterType = location.pathname.includes('/subscribed') ? 'subscribed' : 'watch_later'

  useEffect(() => {
    loadChannels()
  }, [location.pathname])

  const loadChannels = async () => {
    try {
      setLoading(true)
      const data = await channelsAPI.getAll(filterType)
      setChannels(data || [])
    } catch (error) {
      console.error('Error loading channels:', error)
      alert('Failed to load channels')
    } finally {
      setLoading(false)
    }
  }

  const handleChannelClick = (channel: Channel) => {
    navigate(`/channels/${channel.youtube_channel_id}`)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  const formatSubscriberCount = (count: number | null) => {
    if (!count) return 'N/A'
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {filterType === 'subscribed' ? 'Subscribed Channels' : 'Watch Later Channels'}
          </h1>
          <p className="text-gray-600">
            {filterType === 'subscribed' 
              ? 'Channels you are subscribed to' 
              : 'Channels with videos in your watch later list'}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-[60px] px-5 bg-white rounded-lg">
            <div className="text-lg text-gray-500">Loading channels...</div>
          </div>
        ) : channels.length === 0 ? (
          <div className="text-center py-[60px] px-5 bg-white rounded-lg">
            <p className="text-lg text-gray-500 mb-4">
              No channels found
            </p>
            <p className="text-sm text-gray-500">
              {filterType === 'subscribed' 
                ? 'Subscribe to channels to see them here.'
                : 'Channels will appear here once you have videos in your watch later list.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
            {channels.map((channel) => (
              <div
                key={channel.youtube_channel_id}
                onClick={() => handleChannelClick(channel)}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    {channel.thumbnail_url ? (
                      <img
                        src={channel.thumbnail_url}
                        alt={channel.channel_title || 'Channel'}
                        className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-400 text-xl">
                          {channel.channel_title?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-gray-900 truncate">
                        {channel.channel_title || 'Untitled Channel'}
                      </h3>
                      {channel.subscriber_count !== null && (
                        <p className="text-sm text-gray-500">
                          {formatSubscriberCount(channel.subscriber_count)} subscribers
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {channel.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {channel.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500 border-t pt-4">
                    {'watch_later_count' in channel && (
                      <span>
                        {channel.watch_later_count} video{channel.watch_later_count !== 1 ? 's' : ''}
                      </span>
                    )}
                    {'last_video_date' in channel && channel.last_video_date && (
                      <span>
                        Last: {formatDate(channel.last_video_date)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default ChannelsList

