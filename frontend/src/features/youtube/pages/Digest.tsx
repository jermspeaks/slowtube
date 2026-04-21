import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { digestAPI, channelsAPI } from '../services/api'
import { Channel } from '../types/channel'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { RefreshCw, Plus, Trash2, Clock, BookmarkPlus, EyeOff } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DigestChannel {
  id: number
  youtube_channel_id: string
  channel_title: string | null
  thumbnail_url: string | null
  added_from: string | null
  created_at: string
  pending_count: number
}

interface DigestItem {
  id: number
  youtube_video_id: string
  youtube_channel_id: string
  channel_title: string | null
  title: string
  description: string | null
  thumbnail_url: string | null
  duration: string | null
  published_at: string | null
  fetched_at: string
  is_dismissed: number
}

type TabType = 'feed' | 'channels'
type BrowseFilter = 'subscribed' | 'watch_later'
type AddMode = 'browse' | 'manual'

// ─── Digest Video Card ────────────────────────────────────────────────────────

function DigestVideoCard({
  item,
  onAddToWatchLater,
  onDismiss,
}: {
  item: DigestItem
  onAddToWatchLater: (videoId: string) => Promise<void>
  onDismiss: (videoId: string) => Promise<void>
}) {
  const [loading, setLoading] = useState<'watchlater' | 'dismiss' | null>(null)

  const handleAddToWatchLater = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading('watchlater')
    try {
      await onAddToWatchLater(item.youtube_video_id)
    } finally {
      setLoading(null)
    }
  }

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading('dismiss')
    try {
      await onDismiss(item.youtube_video_id)
    } finally {
      setLoading(null)
    }
  }

  const thumbnailUrl = item.thumbnail_url || `https://img.youtube.com/vi/${item.youtube_video_id}/mqdefault.jpg`
  const youtubeUrl = `https://www.youtube.com/watch?v=${item.youtube_video_id}`

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden flex flex-col hover:border-primary/30 transition-colors">
      {/* Thumbnail */}
      <a
        href={youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-video bg-muted shrink-0"
        tabIndex={0}
      >
        <img
          src={thumbnailUrl}
          alt={item.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {item.duration && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
            {item.duration}
          </span>
        )}
      </a>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        <div className="flex-1">
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium leading-snug line-clamp-2 hover:text-primary transition-colors"
          >
            {item.title}
          </a>
          {item.channel_title && (
            <p className="text-xs text-muted-foreground mt-1">{item.channel_title}</p>
          )}
          {item.published_at && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(item.published_at), { addSuffix: true })}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          <Button
            size="sm"
            variant="default"
            className="flex-1 text-xs gap-1"
            disabled={loading !== null}
            onClick={handleAddToWatchLater}
          >
            {loading === 'watchlater' ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <BookmarkPlus className="h-3 w-3" />
            )}
            Watch Later
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1"
            disabled={loading !== null}
            onClick={handleDismiss}
            title="Dismiss"
          >
            {loading === 'dismiss' ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Channel Modal ────────────────────────────────────────────────────────

function AddChannelModal({
  open,
  onClose,
  onAdded,
  existingChannelIds,
}: {
  open: boolean
  onClose: () => void
  onAdded: () => void
  existingChannelIds: Set<string>
}) {
  const [mode, setMode] = useState<AddMode>('browse')
  const [browseFilter, setBrowseFilter] = useState<BrowseFilter>('subscribed')
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelsLoading, setChannelsLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Manual mode state
  const [manualUrl, setManualUrl] = useState('')
  const [resolving, setResolving] = useState(false)
  const [resolvedChannel, setResolvedChannel] = useState<{
    id: string
    title: string | null
    thumbnailUrl: string | null
    description: string | null
  } | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)

  useEffect(() => {
    if (open && mode === 'browse') {
      loadChannels()
    }
  }, [open, mode, browseFilter])

  const loadChannels = async () => {
    setChannelsLoading(true)
    try {
      const data = await channelsAPI.getAll(browseFilter, 1, 200, 'channel_title', 'asc')
      setChannels(data.channels || [])
    } catch (error) {
      console.error('Error loading channels:', error)
    } finally {
      setChannelsLoading(false)
    }
  }

  const handleToggleChannel = (channelId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(channelId)) {
        next.delete(channelId)
      } else {
        next.add(channelId)
      }
      return next
    })
  }

  const handleAddSelected = async () => {
    if (selectedIds.size === 0) return
    setAdding(true)
    try {
      await digestAPI.addChannels(Array.from(selectedIds), browseFilter)
      toast.success(`Added ${selectedIds.size} channel(s) to digest`)
      onAdded()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add channels')
    } finally {
      setAdding(false)
    }
  }

  const handleResolveUrl = async () => {
    if (!manualUrl.trim()) return
    setResolving(true)
    setResolvedChannel(null)
    setResolveError(null)
    try {
      const data = await digestAPI.resolveChannelUrl(manualUrl.trim())
      setResolvedChannel(data.channel)
      if (data.alreadyAdded) {
        setResolveError('This channel is already in your digest.')
      }
    } catch (error: any) {
      setResolveError(error.response?.data?.error || 'Could not find channel. Try a channel URL like youtube.com/@handle')
    } finally {
      setResolving(false)
    }
  }

  const handleAddResolved = async () => {
    if (!resolvedChannel) return
    setAdding(true)
    try {
      await digestAPI.addChannels([resolvedChannel.id], 'manual')
      toast.success(`Added ${resolvedChannel.title || resolvedChannel.id} to digest`)
      onAdded()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add channel')
    } finally {
      setAdding(false)
    }
  }

  const handleClose = () => {
    setSelectedIds(new Set())
    setManualUrl('')
    setResolvedChannel(null)
    setResolveError(null)
    setSearchQuery('')
    onClose()
  }

  const filteredChannels = channels.filter(c => {
    if (existingChannelIds.has(c.youtube_channel_id)) return false
    if (searchQuery) {
      return c.channel_title?.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Channels to Digest</DialogTitle>
          <DialogDescription>
            Choose channels to include in your daily digest feed.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex border border-border rounded-md overflow-hidden shrink-0">
          <button
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === 'browse'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent'
            }`}
            onClick={() => setMode('browse')}
          >
            Browse Channels
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === 'manual'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent'
            }`}
            onClick={() => setMode('manual')}
          >
            Add by URL
          </button>
        </div>

        {mode === 'browse' ? (
          <>
            {/* Browse filter */}
            <div className="flex gap-2 shrink-0">
              <button
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  browseFilter === 'subscribed'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
                onClick={() => setBrowseFilter('subscribed')}
              >
                Subscribed
              </button>
              <button
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  browseFilter === 'watch_later'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
                onClick={() => setBrowseFilter('watch_later')}
              >
                Watch Later
              </button>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background shrink-0"
            />

            {/* Channel list */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {channelsLoading ? (
                <div className="flex justify-center py-8 text-muted-foreground text-sm">Loading channels...</div>
              ) : filteredChannels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {existingChannelIds.size > 0 ? 'All channels already added, or none found.' : 'No channels found.'}
                </div>
              ) : (
                <div className="space-y-1 py-1">
                  {filteredChannels.map(channel => (
                    <label
                      key={channel.youtube_channel_id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(channel.youtube_channel_id)}
                        onChange={() => handleToggleChannel(channel.youtube_channel_id)}
                        className="shrink-0"
                      />
                      {channel.thumbnail_url && (
                        <img
                          src={channel.thumbnail_url}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                      )}
                      <span className="text-sm truncate">{channel.channel_title || channel.youtube_channel_id}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between shrink-0 pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <Button
                onClick={handleAddSelected}
                disabled={selectedIds.size === 0 || adding}
              >
                {adding ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Selected
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                YouTube channel URL or @handle
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. youtube.com/@mkbhd or @mkbhd"
                  value={manualUrl}
                  onChange={e => {
                    setManualUrl(e.target.value)
                    setResolvedChannel(null)
                    setResolveError(null)
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleResolveUrl()}
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background"
                />
                <Button
                  variant="outline"
                  onClick={handleResolveUrl}
                  disabled={!manualUrl.trim() || resolving}
                >
                  {resolving ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Look up'}
                </Button>
              </div>
            </div>

            {resolveError && (
              <p className="text-sm text-destructive">{resolveError}</p>
            )}

            {resolvedChannel && !resolveError && (
              <div className="flex items-center gap-3 p-3 border border-border rounded-md bg-muted/30">
                {resolvedChannel.thumbnailUrl && (
                  <img
                    src={resolvedChannel.thumbnailUrl}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{resolvedChannel.title || resolvedChannel.id}</p>
                  {resolvedChannel.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{resolvedChannel.description}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={handleAddResolved}
                  disabled={adding}
                >
                  {adding ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : null}
                  Add
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Digest Page ─────────────────────────────────────────────────────────

function Digest() {
  const navigate = useNavigate()

  // Tab state from URL hash or default to 'feed'
  const [activeTab, setActiveTab] = useState<TabType>('feed')

  const [digestChannels, setDigestChannels] = useState<DigestChannel[]>([])
  const [channelsLoading, setChannelsLoading] = useState(true)

  const [feedItems, setFeedItems] = useState<DigestItem[]>([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [feedPage, setFeedPage] = useState(1)
  const [feedTotal, setFeedTotal] = useState(0)
  const [feedTotalPages, setFeedTotalPages] = useState(1)
  const [filterChannelId, setFilterChannelId] = useState<string>('')

  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const existingChannelIds = new Set(digestChannels.map(c => c.youtube_channel_id))

  const loadChannels = useCallback(async () => {
    setChannelsLoading(true)
    try {
      const data = await digestAPI.getChannels()
      setDigestChannels(data.channels || [])
    } catch (error: any) {
      console.error('Error loading digest channels:', error)
      toast.error(error.response?.data?.error || 'Failed to load digest channels')
    } finally {
      setChannelsLoading(false)
    }
  }, [])

  const loadFeed = useCallback(async (page: number = 1, channelId?: string) => {
    setFeedLoading(true)
    try {
      const data = await digestAPI.getFeed({
        page,
        limit: 48,
        channelId: channelId || undefined,
      })
      setFeedItems(data.items || [])
      setFeedTotal(data.total || 0)
      setFeedTotalPages(data.totalPages || 1)
      setFeedPage(page)
    } catch (error: any) {
      console.error('Error loading digest feed:', error)
      toast.error(error.response?.data?.error || 'Failed to load digest feed')
    } finally {
      setFeedLoading(false)
    }
  }, [])

  useEffect(() => {
    loadChannels()
    loadFeed(1)
  }, [loadChannels, loadFeed])

  // Reload feed when filter changes
  useEffect(() => {
    loadFeed(1, filterChannelId || undefined)
  }, [filterChannelId])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const result = await digestAPI.refresh()
      setLastRefreshed(new Date())
      toast.success(result.message || 'Digest refreshed')
      await loadFeed(1, filterChannelId || undefined)
      await loadChannels()
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to refresh digest'
      if (error.response?.status === 401 || error.response?.data?.requiresAuth) {
        toast.error('YouTube authentication required. Please connect your YouTube account in Settings.', {
          action: {
            label: 'Go to Settings',
            onClick: () => navigate('/settings'),
          },
        })
      } else {
        toast.error(msg)
      }
    } finally {
      setRefreshing(false)
    }
  }

  const handleAddToWatchLater = async (videoId: string) => {
    try {
      await digestAPI.addToWatchLater(videoId)
      toast.success('Added to Watch Later')
      setFeedItems(prev => prev.filter(item => item.youtube_video_id !== videoId))
      setFeedTotal(prev => Math.max(0, prev - 1))
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add to Watch Later')
    }
  }

  const handleDismiss = async (videoId: string) => {
    try {
      await digestAPI.dismiss(videoId)
      setFeedItems(prev => prev.filter(item => item.youtube_video_id !== videoId))
      setFeedTotal(prev => Math.max(0, prev - 1))
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to dismiss video')
    }
  }

  const handleRemoveChannel = async (youtubeChannelId: string) => {
    try {
      await digestAPI.removeChannel(youtubeChannelId)
      toast.success('Channel removed from digest')
      setDigestChannels(prev => prev.filter(c => c.youtube_channel_id !== youtubeChannelId))
      // Also remove feed items for this channel
      setFeedItems(prev => prev.filter(item => item.youtube_channel_id !== youtubeChannelId))
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove channel')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Daily Digest</h1>
            <p className="text-muted-foreground text-sm mt-1">
              New videos from your curated channels
              {lastRefreshed && (
                <span className="ml-2 text-xs">
                  · Last refreshed {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-t border-border">
          <nav className="flex -mb-px">
            {(['feed', 'channels'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium border-b-2 transition-colors capitalize
                  ${activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
              >
                {tab === 'feed' ? `Feed${feedTotal > 0 ? ` (${feedTotal})` : ''}` : `Channels (${digestChannels.length})`}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Feed Tab */}
      {activeTab === 'feed' && (
        <div>
          {/* Filter bar */}
          {digestChannels.length > 0 && (
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-card rounded-lg p-3 border border-border shadow-sm flex items-center gap-2">
                <label className="text-sm font-semibold text-foreground whitespace-nowrap">Channel:</label>
                <select
                  value={filterChannelId}
                  onChange={e => setFilterChannelId(e.target.value)}
                  className="px-2 py-1.5 border border-border rounded text-sm bg-background"
                >
                  <option value="">All channels</option>
                  {digestChannels.map(c => (
                    <option key={c.youtube_channel_id} value={c.youtube_channel_id}>
                      {c.channel_title || c.youtube_channel_id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {feedLoading ? (
            <div className="flex justify-center items-center py-16 bg-card rounded-lg">
              <div className="text-muted-foreground">Loading digest...</div>
            </div>
          ) : digestChannels.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-lg">
              <Clock className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">No channels yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add channels to your digest to start seeing new videos here.
              </p>
              <Button onClick={() => setActiveTab('channels')} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Channels
              </Button>
            </div>
          ) : feedItems.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-lg">
              <p className="text-lg font-medium text-foreground mb-2">No videos yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Hit Refresh to fetch the latest videos from your digest channels.
              </p>
              <Button onClick={handleRefresh} disabled={refreshing} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh Now
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {feedItems.map(item => (
                  <DigestVideoCard
                    key={item.youtube_video_id}
                    item={item}
                    onAddToWatchLater={handleAddToWatchLater}
                    onDismiss={handleDismiss}
                  />
                ))}
              </div>

              {/* Pagination */}
              {feedTotalPages > 1 && (
                <div className="flex justify-center items-center gap-3 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadFeed(feedPage - 1, filterChannelId || undefined)}
                    disabled={feedPage <= 1 || feedLoading}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {feedPage} of {feedTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadFeed(feedPage + 1, filterChannelId || undefined)}
                    disabled={feedPage >= feedTotalPages || feedLoading}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Channels Tab */}
      {activeTab === 'channels' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <p className="text-sm text-muted-foreground">
              {digestChannels.length === 0
                ? 'No channels added yet.'
                : `${digestChannels.length} channel${digestChannels.length !== 1 ? 's' : ''} in digest`}
            </p>
            <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Channels
            </Button>
          </div>

          {channelsLoading ? (
            <div className="flex justify-center items-center py-16 bg-card rounded-lg">
              <div className="text-muted-foreground">Loading channels...</div>
            </div>
          ) : digestChannels.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-lg">
              <Plus className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">Add your first channel</p>
              <p className="text-sm text-muted-foreground mb-4">
                Choose from subscribed, watch later channels, or add any channel by URL.
              </p>
              <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Channels
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {digestChannels.map(channel => (
                <div
                  key={channel.youtube_channel_id}
                  className="bg-card border border-border rounded-lg p-4 flex items-center gap-3"
                >
                  {channel.thumbnail_url ? (
                    <img
                      src={channel.thumbnail_url}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted shrink-0 flex items-center justify-center text-muted-foreground text-xs font-bold uppercase">
                      {(channel.channel_title || 'C').charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{channel.channel_title || channel.youtube_channel_id}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {channel.added_from && (
                        <span className="text-xs text-muted-foreground capitalize bg-muted px-1.5 py-0.5 rounded">
                          {channel.added_from}
                        </span>
                      )}
                      {channel.pending_count > 0 && (
                        <span className="text-xs text-primary font-medium">
                          {channel.pending_count} new
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveChannel(channel.youtube_channel_id)}
                    title="Remove from digest"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Channel Modal */}
      <AddChannelModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdded={loadChannels}
        existingChannelIds={existingChannelIds}
      />
    </div>
  )
}

export default Digest
