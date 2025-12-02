import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Channel, ChannelWithCount } from '../types/channel'
import { channelsAPI } from '../services/api'
import { toast } from 'sonner'
import { RefreshCw, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AddToChannelListModal from '../components/AddToChannelListModal'

function ChannelsList() {
  const location = useLocation()
  const navigate = useNavigate()
  const [channels, setChannels] = useState<ChannelWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false)
  const [selectedChannelIds, setSelectedChannelIds] = useState<Set<string>>(new Set())
  
  // Pagination state (only for subscribed channels)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 50

  // Sort state
  const [sortBy, setSortBy] = useState<'channel_title' | 'updated_at' | 'last_video_date'>('channel_title')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Determine filter type from route
  const filterType = location.pathname.includes('/subscribed') ? 'subscribed' : 'watch_later'

  useEffect(() => {
    // Reset to page 1 when filter type changes
    setCurrentPage(1)
    // Reset sort to default when filter type changes
    setSortBy('channel_title')
    setSortOrder('asc')
  }, [location.pathname])

  useEffect(() => {
    loadChannels()
  }, [location.pathname, currentPage, sortBy, sortOrder])

  const loadChannels = async () => {
    try {
      setLoading(true)
      
      // For subscribed channels, only allow channel_title and updated_at sorting
      const validSortBy = filterType === 'subscribed' 
        ? (sortBy === 'channel_title' || sortBy === 'updated_at' ? sortBy : 'channel_title')
        : sortBy
      
      if (filterType === 'subscribed') {
        // For subscribed channels, use pagination
        const data = await channelsAPI.getAll(filterType, currentPage, limit, validSortBy, sortOrder)
        setChannels(data.channels || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setCurrentPage(data.page || 1)
      } else {
        // For watch_later channels, get all (no pagination)
        const data = await channelsAPI.getAll(filterType, undefined, undefined, validSortBy, sortOrder)
        setChannels(data || [])
        setTotal(data?.length || 0)
        setTotalPages(1)
        setCurrentPage(1)
      }
    } catch (error) {
      console.error('Error loading channels:', error)
      toast.error('Failed to load channels')
    } finally {
      setLoading(false)
    }
  }

  const handleSortChange = (value: string) => {
    if (value === 'none') {
      setSortBy('channel_title')
      setSortOrder('asc')
    } else {
      const lastUnderscoreIndex = value.lastIndexOf('_')
      if (lastUnderscoreIndex !== -1) {
        const by = value.substring(0, lastUnderscoreIndex) as 'channel_title' | 'updated_at' | 'last_video_date'
        const order = value.substring(lastUnderscoreIndex + 1) as 'asc' | 'desc'
        if ((by === 'channel_title' || by === 'updated_at' || by === 'last_video_date') && (order === 'asc' || order === 'desc')) {
          setSortBy(by)
          setSortOrder(order)
        }
      }
    }
    // Reset to page 1 when sort changes
    if (filterType === 'subscribed') {
      setCurrentPage(1)
    }
  }

  const handleChannelClick = (channel: Channel, e?: React.MouseEvent) => {
    // Don't navigate if clicking on the add to list button
    if (e && (e.target as HTMLElement).closest('.add-to-list-button')) {
      return
    }
    navigate(`/channels/${channel.youtube_channel_id}/watch-later`)
  }

  const handleAddToListsClick = (channel: Channel, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedChannelIds(new Set([channel.youtube_channel_id]))
    setIsAddToListModalOpen(true)
  }

  const handleAddToListsSuccess = () => {
    setSelectedChannelIds(new Set())
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

  const handleSyncSubscriptions = async () => {
    try {
      setSyncing(true)
      const result = await channelsAPI.syncSubscriptions()
      
      toast.success(result.message || `Successfully synced ${result.synced || 0} subscribed channels`)
      
      // Refresh the channel list
      await loadChannels()
    } catch (error: any) {
      console.error('Error syncing subscriptions:', error)
      
      if (error.response?.status === 401 || error.response?.data?.requiresAuth) {
        toast.error('YouTube authentication required. Please connect your YouTube account in Settings.', {
          action: {
            label: 'Go to Settings',
            onClick: () => navigate('/settings')
          }
        })
      } else {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to sync subscriptions'
        toast.error(errorMessage)
      }
    } finally {
      setSyncing(false)
    }
  }

  const handleRefreshLatestVideos = async () => {
    try {
      setRefreshing(true)
      const result = await channelsAPI.fetchLatestAll(50)
      
      // Build detailed success message
      let message = `Processed ${result.channelsProcessed || 0} channels: ${result.totalVideos || 0} videos fetched`
      if (result.newVideos !== undefined && result.existingVideos !== undefined) {
        message += ` (${result.newVideos} new, ${result.existingVideos} existing)`
      }
      if (result.channelsWithErrors > 0) {
        message += `, ${result.channelsWithErrors} channel(s) had errors`
      }
      
      toast.success(message, {
        duration: 5000,
      })
      
      // If there were errors, show details in console or additional toast
      if (result.results && result.results.length > 0) {
        const errorChannels = result.results.filter((r: any) => r.error)
        if (errorChannels.length > 0) {
          console.warn('Channels with errors:', errorChannels)
          // Optionally show a detailed toast for errors
          if (errorChannels.length <= 5) {
            const errorList = errorChannels.map((r: any) => r.channelTitle).join(', ')
            toast.error(`Errors in: ${errorList}`, { duration: 7000 })
          }
        }
      }
      
      // Refresh the channel list to show updated counts
      await loadChannels()
    } catch (error: any) {
      console.error('Error refreshing latest videos:', error)
      
      if (error.response?.status === 401 || error.response?.data?.requiresAuth) {
        toast.error('YouTube authentication required. Please connect your YouTube account in Settings.', {
          action: {
            label: 'Go to Settings',
            onClick: () => navigate('/settings')
          }
        })
      } else {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to refresh latest videos'
        toast.error(errorMessage)
      }
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="mb-6 flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {filterType === 'subscribed' ? 'Subscribed Channels' : 'Watch Later Channels'}
            </h1>
            <p className="text-muted-foreground">
              {filterType === 'subscribed' 
                ? 'Channels you are subscribed to' 
                : 'Channels with videos in your watch later list'}
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex gap-2 items-center">
              <label className="font-semibold text-sm text-foreground whitespace-nowrap">Sort:</label>
              <select
                value={sortBy ? `${sortBy}_${sortOrder}` : 'none'}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-3 py-2 border border-border rounded text-sm bg-background"
              >
                <option value="channel_title_asc">Alphabetical (A-Z)</option>
                <option value="channel_title_desc">Alphabetical (Z-A)</option>
                <option value="updated_at_desc">Last Updated (Newest)</option>
                <option value="updated_at_asc">Last Updated (Oldest)</option>
                {filterType === 'watch_later' && (
                  <>
                    <option value="last_video_date_desc">Last Video Uploaded (Newest)</option>
                    <option value="last_video_date_asc">Last Video Uploaded (Oldest)</option>
                  </>
                )}
              </select>
            </div>
            {filterType === 'subscribed' && (
              <>
                <Button
                  onClick={handleRefreshLatestVideos}
                  disabled={refreshing || syncing}
                  className="gap-2"
                  variant="outline"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh Latest Videos'}
                </Button>
                <Button
                  onClick={handleSyncSubscriptions}
                  disabled={syncing || refreshing}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Subscriptions'}
                </Button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
            <div className="text-lg text-muted-foreground">Loading channels...</div>
          </div>
        ) : channels.length === 0 ? (
          <div className="text-center py-[60px] px-5 bg-card rounded-lg">
            <p className="text-lg text-muted-foreground mb-4">
              No channels found
            </p>
            <p className="text-sm text-muted-foreground">
              {filterType === 'subscribed' 
                ? 'Subscribe to channels to see them here.'
                : 'Channels will appear here once you have videos in your watch later list.'}
            </p>
          </div>
        ) : (
          <>
            {filterType === 'subscribed' && total > 0 && (
              <div className="mb-4 text-sm text-muted-foreground">
                Showing {channels.length} of {total} channels
              </div>
            )}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
              {channels.map((channel) => (
                <div
                  key={channel.youtube_channel_id}
                  onClick={(e) => handleChannelClick(channel, e)}
                  className="bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden relative"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      {channel.thumbnail_url ? (
                        <img
                          src={channel.thumbnail_url}
                          alt={channel.channel_title || 'Channel'}
                          className="w-16 h-16 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <span className="text-muted-foreground text-xl">
                            {channel.channel_title?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-foreground truncate">
                          {channel.channel_title || 'Untitled Channel'}
                        </h3>
                        {channel.subscriber_count !== null && (
                          <p className="text-sm text-muted-foreground">
                            {formatSubscriberCount(channel.subscriber_count)} subscribers
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {channel.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {channel.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm text-muted-foreground border-t border-border pt-4">
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 add-to-list-button"
                    onClick={(e) => handleAddToListsClick(channel, e)}
                    title="Add to list"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            {filterType === 'subscribed' && totalPages > 1 && (
              <div className="mt-6 flex justify-center items-center gap-4 flex-wrap">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-border rounded text-sm bg-card hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">Page</span>
                  <select
                    value={currentPage}
                    onChange={(e) => setCurrentPage(parseInt(e.target.value, 10))}
                    className="px-3 py-2 border border-border rounded text-sm bg-background"
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <option key={page} value={page}>
                        {page}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-foreground">of {totalPages}</span>
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-border rounded text-sm bg-card hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <AddToChannelListModal
        isOpen={isAddToListModalOpen}
        onClose={() => {
          setIsAddToListModalOpen(false)
          setSelectedChannelIds(new Set())
        }}
        channelIds={Array.from(selectedChannelIds)}
        onSuccess={handleAddToListsSuccess}
      />
    </div>
  )
}

export default ChannelsList

