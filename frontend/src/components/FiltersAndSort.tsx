import { useState } from 'react'
import { VideoState } from '../types/video'
import DateRangeFilter from './DateRangeFilter'

interface FiltersAndSortProps {
  stateFilter: VideoState | 'all'
  onStateFilterChange: (value: VideoState | 'all') => void
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  selectedChannels: string[]
  onSelectedChannelsChange: (channels: string[]) => void
  availableChannels: string[]
  sortBy: 'published_at' | 'added_to_playlist_at' | null
  onSortByChange: (value: 'published_at' | 'added_to_playlist_at' | null) => void
  sortOrder: 'asc' | 'desc'
  onSortOrderChange: (value: 'asc' | 'desc') => void
  dateField: 'added_to_playlist_at' | 'published_at' | null
  onDateFieldChange: (value: 'added_to_playlist_at' | 'published_at' | null) => void
  startDate: string | null
  onStartDateChange: (value: string | null) => void
  endDate: string | null
  onEndDateChange: (value: string | null) => void
}

function FiltersAndSort({
  stateFilter,
  onStateFilterChange,
  searchQuery,
  onSearchQueryChange,
  selectedChannels,
  onSelectedChannelsChange,
  availableChannels,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  dateField,
  onDateFieldChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
}: FiltersAndSortProps) {
  const [showMore, setShowMore] = useState(false)

  const handleSortChange = (value: string) => {
    if (value === 'none') {
      onSortByChange(null)
      onSortOrderChange('asc')
    } else {
      const lastUnderscoreIndex = value.lastIndexOf('_')
      if (lastUnderscoreIndex !== -1) {
        const by = value.substring(0, lastUnderscoreIndex) as 'published_at' | 'added_to_playlist_at'
        const order = value.substring(lastUnderscoreIndex + 1) as 'asc' | 'desc'
        if ((by === 'published_at' || by === 'added_to_playlist_at') && (order === 'asc' || order === 'desc')) {
          onSortByChange(by)
          onSortOrderChange(order)
        }
      }
    }
  }

  const handleChannelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, option => option.value)
    onSelectedChannelsChange(selected)
  }

  return (
    <div className="bg-card rounded-lg p-4 border border-border shadow-sm">
      {/* Always visible section */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex gap-2 items-center w-full sm:w-auto">
          <label className="font-semibold text-sm text-foreground whitespace-nowrap">Filter:</label>
          <select
            value={stateFilter}
            onChange={(e) => onStateFilterChange(e.target.value as VideoState | 'all')}
            className="px-3 py-2 border border-border rounded text-sm bg-background flex-1 sm:flex-initial"
          >
            <option value="all">All</option>
            <option value="feed">Feed</option>
            <option value="inbox">Inbox</option>
            <option value="archive">Archive</option>
          </select>
        </div>
        
        <div className="flex gap-2 items-center w-full sm:w-auto sm:flex-1 sm:max-w-md">
          <label className="font-semibold text-sm text-foreground whitespace-nowrap">Search:</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search by title or description..."
            className="px-3 py-2 border border-border rounded text-sm bg-background flex-1"
          />
        </div>
      </div>

      {/* Collapsible "Show more" section */}
      <div className="mt-4">
        <button
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
          aria-expanded={showMore}
          aria-label={showMore ? 'Show less filters' : 'Show more filters'}
        >
          <span>{showMore ? 'Show less' : 'Show more'}</span>
          <svg
            className={`w-4 h-4 transition-transform ${showMore ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showMore && (
          <div className="mt-4 pt-4 border-t border-border space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Channels section */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex gap-2 items-start w-full sm:w-auto sm:flex-1">
                <label className="font-semibold text-sm text-foreground whitespace-nowrap pt-2">Channels:</label>
                <div className="flex-1 flex flex-col gap-2">
                  <select
                    multiple
                    value={selectedChannels}
                    onChange={handleChannelChange}
                    className="px-3 py-2 border border-border rounded text-sm bg-background min-h-[120px] max-h-[200px] overflow-y-auto"
                    size={Math.min(availableChannels.length, 8)}
                  >
                    {availableChannels.map(channel => (
                      <option key={channel} value={channel}>
                        {channel}
                      </option>
                    ))}
                  </select>
                  {selectedChannels.length > 0 && (
                    <button
                      onClick={() => onSelectedChannelsChange([])}
                      className="px-3 py-1.5 text-xs bg-muted text-foreground rounded hover:bg-accent transition-colors self-start"
                    >
                      Clear selected ({selectedChannels.length})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Date Range Filter section */}
            <DateRangeFilter
              dateField={dateField}
              onDateFieldChange={onDateFieldChange}
              startDate={startDate}
              onStartDateChange={onStartDateChange}
              endDate={endDate}
              onEndDateChange={onEndDateChange}
            />

            {/* Sort section */}
            <div className="flex gap-2 items-center">
              <label className="font-semibold text-sm text-foreground whitespace-nowrap">Sort:</label>
              <select
                value={sortBy ? `${sortBy}_${sortOrder}` : 'none'}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-3 py-2 border border-border rounded text-sm bg-background"
              >
                <option value="none">None</option>
                <option value="published_at_desc">Date Published (Newest)</option>
                <option value="published_at_asc">Date Published (Oldest)</option>
                <option value="added_to_playlist_at_desc">Date Added (Newest)</option>
                <option value="added_to_playlist_at_asc">Date Added (Oldest)</option>
              </select>
            </div>
          </div>
        )}

        {/* Show selected channels count when collapsed */}
        {!showMore && selectedChannels.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {selectedChannels.length} channel{selectedChannels.length !== 1 ? 's' : ''} selected
          </div>
        )}
      </div>
    </div>
  )
}

export default FiltersAndSort

