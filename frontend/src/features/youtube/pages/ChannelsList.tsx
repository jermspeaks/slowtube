import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Link } from 'react-router'
import { Channel, ChannelWithCount } from '../types/channel'
import { channelsAPI } from '../services/api'
import { toast } from 'sonner'
import { RefreshCw, Plus, Archive, ArchiveRestore } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import AddToChannelGroupModal from '../components/AddToChannelListModal'
import { Pagination } from '@/shared/components/Pagination'

function ChannelsList() {
  const location = useLocation()
  const navigate = useNavigate()
  const [channels, setChannels] = useState<ChannelWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const isInitialLoad = useRef(true)
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

  // Filter state
  const [notInAnyList, setNotInAnyList] = useState(false)
  const [archiveFilter, setArchiveFilter] = useState<'all' | 'archived' | 'unarchived'>('unarchived')

  // Determine filter type from route
  const filterType = location.pathname.includes('/subscribed') ? 'subscribed' : 'watch_later'

  useEffect(() => {
    // Reset to page 1 when filter type changes
    setCurrentPage(1)
    // Reset sort to default when filter type changes
    setSortBy('channel_title')
    setSortOrder('asc')
    // Reset filters when filter type changes
    setNotInAnyList(false)
    setArchiveFilter('unarchived')
  }, [location.pathname])

  useEffect(() => {
    // Only show loading on initial load, not for filter/sort changes
    loadChannels(isInitialLoad.current)
  }, [location.pathname, currentPage, sortBy, sortOrder, notInAnyList, archiveFilter])

  const loadChannels = async (showLoading: boolean = true) => {
    try {
      if (showLoading && isInitialLoad.current) {
        setLoading(true)
      }
      
      // For subscribed channels, only allow channel_title and updated_at sorting
      const validSortBy = filterType === 'subscribed' 
        ? (sortBy === 'channel_title' || sortBy === 'updated_at' ? sortBy : 'channel_title')
        : sortBy
      
      if (filterType === 'subscribed') {
        // For subscribed channels, use pagination
        const data = await channelsAPI.getAll(filterType, currentPage, limit, validSortBy, sortOrder, notInAnyList)
        setChannels(data.channels || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setCurrentPage(data.page || 1)
      } else {
        // For watch_later channels, get all (no pagination)
        const data = await channelsAPI.getAll(filterType, undefined, undefined, validSortBy, sortOrder, notInAnyList, archiveFilter)
        setChannels(data || [])
        setTotal(data?.length || 0)
        setTotalPages(1)
        setCurrentPage(1)
      }
    } catch (error) {
      console.error('Error loading channels:', error)
      toast.error('Failed to load channels')
    } finally {
      if (showLoading && isInitialLoad.current) {
        setLoading(false)
        isInitialLoad.current = false
      }
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

  const handleAddToListsClick = (channel: Channel, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedChannelIds(new Set([channel.youtube_channel_id]))
    setIsAddToListModalOpen(true)
  }

  const handleAddToListsSuccess = () => {
    setSelectedChannelIds(new Set())
  }

  const handleArchive = async (channel: Channel, isArchived: boolean) => {
    try {
      await channelsAPI.archive(channel.youtube_channel_id, isArchived)
      await loadChannels(false)
      toast.success(`Channel ${isArchived ? 'archived' : 'unarchived'} successfully`)
    } catch (error) {
      console.error('Error archiving channel:', error)
      toast.error('Failed to archive channel')
    }
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
      await loadChannels(false)
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
      
      // Refresh the channel group to show updated counts
      await loadChannels(false)
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
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="mb-4 md:mb-6 flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              {filterType === 'subscribed' ? 'Subscribed Channels' : 'Watch Later Channels'}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {filterType === 'subscribed' 
                ? 'Channels you are subscribed to' 
                : 'Channels with videos in your watch later list'}
            </p>
          </div>
          {filterType === 'subscribed' && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Button
                onClick={handleRefreshLatestVideos}
                disabled={refreshing || syncing}
                className="gap-2"
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh Latest Videos'}</span>
                <span className="sm:hidden">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
              <Button
                onClick={handleSyncSubscriptions}
                disabled={syncing || refreshing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync Subscriptions'}</span>
                <span className="sm:hidden">{syncing ? 'Syncing...' : 'Sync'}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Filters and Sort Panel */}
        <div className="bg-card rounded-lg p-4 border border-border shadow-sm mb-4 md:mb-6">
          {/* Always visible section */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex gap-2 items-center w-full sm:w-auto">
              <label className="font-semibold text-sm text-foreground whitespace-nowrap">Sort:</label>
              <select
                value={sortBy ? `${sortBy}_${sortOrder}` : 'none'}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-3 py-2 border border-border rounded text-sm bg-background flex-1 sm:flex-initial"
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
          </div>

          {/* Collapsible section */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground font-medium transition-colors list-none [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-2">
                <span>More options</span>
                <svg
                  className="w-4 h-4 transition-transform details-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </summary>
            <div className="mt-4 pt-4 border-t border-border space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    id="notInAnyList"
                    checked={notInAnyList}
                    onChange={(e) => {
                      setNotInAnyList(e.target.checked)
                      if (filterType === 'subscribed') {
                        setCurrentPage(1)
                      }
                    }}
                    className="w-4 h-4 rounded border-border"
                  />
                  <label htmlFor="notInAnyList" className="text-sm text-foreground cursor-pointer">
                    Channels not in any list
                  </label>
                </div>
                {filterType === 'watch_later' && (
                  <div className="flex gap-2 items-center">
                    <label className="font-semibold text-sm text-foreground whitespace-nowrap">Archive:</label>
                    <select
                      value={archiveFilter}
                      onChange={(e) => setArchiveFilter(e.target.value as 'all' | 'archived' | 'unarchived')}
                      className="px-3 py-2 border border-border rounded text-sm bg-background"
                    >
                      <option value="all">All</option>
                      <option value="archived">Archived</option>
                      <option value="unarchived">Unarchived</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </details>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12 md:py-[60px] px-5 bg-card rounded-lg">
            <div className="text-base md:text-lg text-muted-foreground">Loading channels...</div>
          </div>
        ) : channels.length === 0 ? (
          <div className="text-center py-12 md:py-[60px] px-5 bg-card rounded-lg">
            <p className="text-base md:text-lg text-muted-foreground mb-4">
              No channels found
            </p>
            <p className="text-sm md:text-base text-muted-foreground">
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
            {filterType === 'watch_later' && channels.length > 0 && (
              <div className="mb-4 text-sm text-muted-foreground">
                {channels.length} {channels.length === 1 ? 'channel' : 'channels'}
              </div>
            )}
            {filterType === 'watch_later' ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-card rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2 md:p-3 text-left border-b-2 border-border">Thumbnail</th>
                      <th className="p-2 md:p-3 text-left border-b-2 border-border">Channel</th>
                      <th className="p-2 md:p-3 text-left border-b-2 border-border hidden md:table-cell">Subscribers</th>
                      <th className="p-2 md:p-3 text-left border-b-2 border-border">Videos</th>
                      <th className="p-2 md:p-3 text-left border-b-2 border-border hidden lg:table-cell">Last Video</th>
                      <th className="p-2 md:p-3 text-left border-b-2 border-border">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map((channel) => (
                      <tr
                        key={channel.youtube_channel_id}
                        className="border-b border-border hover:bg-accent transition-colors cursor-pointer"
                        onClick={() => navigate(`/youtube/channels/${channel.youtube_channel_id}/watch-later`)}
                      >
                        <td className="p-2 md:p-3">
                          {channel.thumbnail_url ? (
                            <img
                              src={channel.thumbnail_url}
                              alt={channel.channel_title || 'Channel'}
                              className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-muted-foreground text-lg md:text-xl">
                                {channel.channel_title?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-2 md:p-3 max-w-[300px] md:max-w-[400px]">
                          <div className="font-semibold text-sm md:text-base text-foreground truncate">
                            {channel.channel_title || 'Untitled Channel'}
                          </div>
                          {channel.description && (
                            <div className="text-xs md:text-sm text-muted-foreground line-clamp-2 mt-1 hidden md:block overflow-hidden">
                              {channel.description}
                            </div>
                          )}
                        </td>
                        <td className="p-2 md:p-3 text-muted-foreground text-xs md:text-sm hidden md:table-cell">
                          {channel.subscriber_count !== null ? (
                            formatSubscriberCount(channel.subscriber_count)
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-2 md:p-3 text-muted-foreground text-xs md:text-sm">
                          {'watch_later_count' in channel ? (
                            <span>
                              {channel.watch_later_count} {channel.watch_later_count === 1 ? 'video' : 'videos'}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-2 md:p-3 text-muted-foreground text-xs md:text-sm hidden lg:table-cell">
                          {'last_video_date' in channel && channel.last_video_date ? (
                            formatDate(channel.last_video_date)
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-2 md:p-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {filterType === 'watch_later' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => handleArchive(channel, !channel.is_archived)}
                                title={channel.is_archived ? 'Unarchive' : 'Archive'}
                              >
                                {channel.is_archived ? (
                                  <ArchiveRestore className="h-4 w-4" />
                                ) : (
                                  <Archive className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="add-to-list-button"
                              onClick={(e) => handleAddToListsClick(channel, e)}
                              title="Add to list"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {channels.map((channel) => (
                  <div
                    key={channel.youtube_channel_id}
                    className="bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden relative"
                  >
                    <Link
                      to={`/youtube/channels/${channel.youtube_channel_id}/watch-later`}
                      className="block p-6 hover:no-underline"
                    >
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
                    </Link>
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
            )}
            {filterType === 'subscribed' && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </main>

      <AddToChannelGroupModal
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

