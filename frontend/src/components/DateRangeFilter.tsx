import { useState } from 'react'

interface DateRangeFilterProps {
  dateField: 'added_to_playlist_at' | 'published_at' | null
  onDateFieldChange: (value: 'added_to_playlist_at' | 'published_at' | null) => void
  startDate: string | null
  onStartDateChange: (value: string | null) => void
  endDate: string | null
  onEndDateChange: (value: string | null) => void
}

function DateRangeFilter({
  dateField,
  onDateFieldChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
}: DateRangeFilterProps) {
  const applyPreset = (preset: 'last7days' | 'last30days' | 'thisMonth' | 'thisYear') => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    let startDateStr: string
    let endDateStr = todayStr

    switch (preset) {
      case 'last7days':
        const sevenDaysAgo = new Date(today)
        sevenDaysAgo.setDate(today.getDate() - 7)
        startDateStr = sevenDaysAgo.toISOString().split('T')[0]
        break
      case 'last30days':
        const thirtyDaysAgo = new Date(today)
        thirtyDaysAgo.setDate(today.getDate() - 30)
        startDateStr = thirtyDaysAgo.toISOString().split('T')[0]
        break
      case 'thisMonth':
        startDateStr = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString().split('T')[0]
        break
      case 'thisYear':
        startDateStr = new Date(today.getFullYear(), 0, 1)
          .toISOString().split('T')[0]
        break
    }

    onStartDateChange(startDateStr)
    onEndDateChange(endDateStr)
  }

  const handleClear = () => {
    onStartDateChange(null)
    onEndDateChange(null)
  }

  return (
    <div className="space-y-4">
      {/* Date Field Selector */}
      <div className="flex gap-2 items-center">
        <label className="font-semibold text-sm text-gray-700 whitespace-nowrap">Date Field:</label>
        <select
          value={dateField || ''}
          onChange={(e) => onDateFieldChange(
            e.target.value === '' ? null : e.target.value as 'added_to_playlist_at' | 'published_at'
          )}
          className="px-3 py-2 border border-gray-300 rounded text-sm bg-white"
        >
          <option value="">None</option>
          <option value="added_to_playlist_at">Date Added</option>
          <option value="published_at">Date Published</option>
        </select>
      </div>

      {/* Date Pickers */}
      {dateField && (
        <>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex gap-2 items-center w-full sm:w-auto">
              <label className="font-semibold text-sm text-gray-700 whitespace-nowrap">Start Date:</label>
              <input
                type="date"
                value={startDate || ''}
                onChange={(e) => onStartDateChange(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded text-sm bg-white flex-1 sm:flex-initial"
              />
            </div>
            <div className="flex gap-2 items-center w-full sm:w-auto">
              <label className="font-semibold text-sm text-gray-700 whitespace-nowrap">End Date:</label>
              <input
                type="date"
                value={endDate || ''}
                onChange={(e) => onEndDateChange(e.target.value || null)}
                min={startDate || undefined}
                className="px-3 py-2 border border-gray-300 rounded text-sm bg-white flex-1 sm:flex-initial"
              />
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => applyPreset('last7days')}
              className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Last 7 days
            </button>
            <button
              onClick={() => applyPreset('last30days')}
              className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Last 30 days
            </button>
            <button
              onClick={() => applyPreset('thisMonth')}
              className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              This month
            </button>
            <button
              onClick={() => applyPreset('thisYear')}
              className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              This year
            </button>
            {(startDate || endDate) && (
              <button
                onClick={handleClear}
                className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default DateRangeFilter

