import { useState } from 'react'

interface FiltersAndSortProps {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  selectedChannels: string[]
  onSelectedChannelsChange: (channels: string[]) => void
  availableChannels: string[]
  sortBy: 'published_at' | 'added_to_playlist_at' | 'archived_at' | null
  onSortByChange: (value: 'published_at' | 'added_to_playlist_at' | 'archived_at' | null) => void
  sortOrder: 'asc' | 'desc'
  onSortOrderChange: (value: 'asc' | 'desc') => void
  dateField: 'added_to_playlist_at' | 'published_at' | null
  onDateFieldChange: (value: 'added_to_playlist_at' | 'published_at' | null) => void
  startDate: string | null
  onStartDateChange: (value: string | null) => void
  endDate: string | null
  onEndDateChange: (value: string | null) => void
  shortsFilter: 'all' | 'exclude' | 'only'
  onShortsFilterChange: (value: 'all' | 'exclude' | 'only') => void
  stateFilter?: 'feed' | 'inbox' | 'archive' | null
  onStateFilterChange?: (value: 'feed' | 'inbox' | 'archive' | null) => void
}

function FiltersAndSort({
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
  shortsFilter,
  onShortsFilterChange,
  stateFilter,
  onStateFilterChange,
}: FiltersAndSortProps) {
  const [showMore, setShowMore] = useState(false)

  const handleSortChange = (value: string) => {
    if (value === 'none') {
      onSortByChange(null)
      onSortOrderChange('asc')
    } else {
      const lastUnderscoreIndex = value.lastIndexOf('_')
      if (lastUnderscoreIndex !== -1) {
        const by = value.substring(0, lastUnderscoreIndex) as 'published_at' | 'added_to_playlist_at' | 'archived_at'
        const order = value.substring(lastUnderscoreIndex + 1) as 'asc' | 'desc'
        if ((by === 'published_at' || by === 'added_to_playlist_at' || by === 'archived_at') && (order === 'asc' || order === 'desc')) {
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
      </div>

      {/* Collapsible "Show more" section */}
      <div>

        {showMore && (
          <div className="mt-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Grid layout for filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Channels section - spans full width */}
              <div className="col-span-full">
                <div className="flex gap-2 items-start">
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

              {/* Date Field selector */}
              <div className="flex gap-2 items-center">
                <label className="font-semibold text-sm text-foreground whitespace-nowrap">Date Field:</label>
                <select
                  value={dateField || ''}
                  onChange={(e) => onDateFieldChange(
                    e.target.value === '' ? null : e.target.value as 'added_to_playlist_at' | 'published_at'
                  )}
                  className="px-3 py-2 border border-border rounded text-sm bg-background flex-1"
                >
                  <option value="">None</option>
                  <option value="added_to_playlist_at">Date Added</option>
                  <option value="published_at">Date Published</option>
                </select>
              </div>

              {/* State Filter - only show if onStateFilterChange is provided */}
              {onStateFilterChange && (
                <div className="flex gap-2 items-center">
                  <label className="font-semibold text-sm text-foreground whitespace-nowrap">Filter by State:</label>
                  <select
                    value={stateFilter || ''}
                    onChange={(e) => onStateFilterChange(e.target.value ? e.target.value as 'feed' | 'inbox' | 'archive' : null)}
                    className="px-3 py-2 border border-border rounded text-sm bg-background flex-1"
                  >
                    <option value="">All States</option>
                    <option value="feed">Feed</option>
                    <option value="inbox">Inbox</option>
                    <option value="archive">Archive</option>
                  </select>
                </div>
              )}

              {/* Shorts filter */}
              <div className="flex gap-2 items-center">
                <label className="font-semibold text-sm text-foreground whitespace-nowrap">Shorts:</label>
                <select
                  value={shortsFilter}
                  onChange={(e) => onShortsFilterChange(e.target.value as 'all' | 'exclude' | 'only')}
                  className="px-3 py-2 border border-border rounded text-sm bg-background flex-1"
                >
                  <option value="all">All</option>
                  <option value="exclude">Exclude Shorts</option>
                  <option value="only">Only Shorts</option>
                </select>
              </div>

              {/* Sort */}
              <div className="flex gap-2 items-center">
                <label className="font-semibold text-sm text-foreground whitespace-nowrap">Sort:</label>
                <select
                  value={sortBy ? `${sortBy}_${sortOrder}` : 'none'}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="px-3 py-2 border border-border rounded text-sm bg-background flex-1"
                >
                  <option value="none">None</option>
                  <option value="published_at_desc">Date Published (Newest)</option>
                  <option value="published_at_asc">Date Published (Oldest)</option>
                  <option value="added_to_playlist_at_desc">Date Added (Newest)</option>
                  <option value="added_to_playlist_at_asc">Date Added (Oldest)</option>
                  <option value="archived_at_desc">Date Archived (Newest)</option>
                  <option value="archived_at_asc">Date Archived (Oldest)</option>
                </select>
              </div>
            </div>

            {/* Date Range inputs and presets - shown when dateField is selected */}
            {dateField && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="flex gap-2 items-center">
                    <label className="font-semibold text-sm text-foreground whitespace-nowrap">Start Date:</label>
                    <input
                      type="date"
                      value={startDate || ''}
                      onChange={(e) => onStartDateChange(e.target.value || null)}
                      className="px-3 py-2 border border-border rounded text-sm bg-background flex-1"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="font-semibold text-sm text-foreground whitespace-nowrap">End Date:</label>
                    <input
                      type="date"
                      value={endDate || ''}
                      onChange={(e) => onEndDateChange(e.target.value || null)}
                      min={startDate || undefined}
                      className="px-3 py-2 border border-border rounded text-sm bg-background flex-1"
                    />
                  </div>
                </div>
                {/* Preset buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const today = new Date()
                      const todayStr = today.toISOString().split('T')[0]
                      const sevenDaysAgo = new Date(today)
                      sevenDaysAgo.setDate(today.getDate() - 7)
                      onStartDateChange(sevenDaysAgo.toISOString().split('T')[0])
                      onEndDateChange(todayStr)
                    }}
                    className="px-3 py-1.5 text-xs bg-muted text-foreground rounded hover:bg-accent transition-colors"
                  >
                    Last 7 days
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date()
                      const todayStr = today.toISOString().split('T')[0]
                      const thirtyDaysAgo = new Date(today)
                      thirtyDaysAgo.setDate(today.getDate() - 30)
                      onStartDateChange(thirtyDaysAgo.toISOString().split('T')[0])
                      onEndDateChange(todayStr)
                    }}
                    className="px-3 py-1.5 text-xs bg-muted text-foreground rounded hover:bg-accent transition-colors"
                  >
                    Last 30 days
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date()
                      const todayStr = today.toISOString().split('T')[0]
                      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
                      onStartDateChange(firstDayOfMonth.toISOString().split('T')[0])
                      onEndDateChange(todayStr)
                    }}
                    className="px-3 py-1.5 text-xs bg-muted text-foreground rounded hover:bg-accent transition-colors"
                  >
                    This month
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date()
                      const todayStr = today.toISOString().split('T')[0]
                      const firstDayOfYear = new Date(today.getFullYear(), 0, 1)
                      onStartDateChange(firstDayOfYear.toISOString().split('T')[0])
                      onEndDateChange(todayStr)
                    }}
                    className="px-3 py-1.5 text-xs bg-muted text-foreground rounded hover:bg-accent transition-colors"
                  >
                    This year
                  </button>
                  {(startDate || endDate) && (
                    <button
                      onClick={() => {
                        onStartDateChange(null)
                        onEndDateChange(null)
                      }}
                      className="px-3 py-1.5 text-xs bg-destructive/20 text-destructive rounded hover:bg-destructive/30 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
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

