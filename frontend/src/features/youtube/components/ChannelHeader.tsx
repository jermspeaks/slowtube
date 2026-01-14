import { Channel } from '../types/channel'
import { channelsAPI } from '../services/api'
import { toast } from 'sonner'

interface ChannelHeaderProps {
  channel: Channel
  onChannelUpdated: (channel: Channel) => void
}

export default function ChannelHeader({ channel, onChannelUpdated }: ChannelHeaderProps) {
  const formatSubscriberCount = (count: number | null) => {
    if (!count) return 'N/A'
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  const handleSubscribe = async () => {
    try {
      if (channel.is_subscribed) {
        await channelsAPI.unsubscribe(channel.youtube_channel_id)
      } else {
        await channelsAPI.subscribe(channel.youtube_channel_id)
      }
      // Reload channel to get updated subscription status
      const updatedChannel = await channelsAPI.getById(channel.youtube_channel_id)
      onChannelUpdated(updatedChannel)
    } catch (error) {
      console.error('Error toggling subscription:', error)
      toast.error('Failed to update subscription')
    }
  }

  return (
    <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-start gap-6">
        {channel.thumbnail_url ? (
          <img
            src={channel.thumbnail_url}
            alt={channel.channel_title || 'Channel'}
            className="w-24 h-24 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-muted-foreground text-2xl">
              {channel.channel_title?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {channel.channel_title || 'Untitled Channel'}
          </h1>
          {channel.subscriber_count !== null && (
            <p className="text-muted-foreground mb-2">
              {formatSubscriberCount(channel.subscriber_count)} subscribers
            </p>
          )}
          {channel.description && (
            <p className="text-muted-foreground mb-4 line-clamp-3">
              {channel.description}
            </p>
          )}
          <button
            onClick={handleSubscribe}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              channel.is_subscribed
                ? 'bg-muted text-foreground hover:bg-accent'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {channel.is_subscribed ? 'Unsubscribe' : 'Subscribe'}
          </button>
        </div>
      </div>
    </div>
  )
}

