import { ViewMode } from '../types/video'

interface ViewToggleProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="flex gap-2 p-2 bg-gray-200 rounded">
      <button
        onClick={() => onViewModeChange('card')}
        className={`px-4 py-2 border-none rounded cursor-pointer ${
          viewMode === 'card'
            ? 'bg-blue-500 text-white font-bold'
            : 'bg-transparent text-gray-800'
        }`}
      >
        Cards
      </button>
      <button
        onClick={() => onViewModeChange('table')}
        className={`px-4 py-2 border-none rounded cursor-pointer ${
          viewMode === 'table'
            ? 'bg-blue-500 text-white font-bold'
            : 'bg-transparent text-gray-800'
        }`}
      >
        Table
      </button>
    </div>
  )
}

export default ViewToggle

