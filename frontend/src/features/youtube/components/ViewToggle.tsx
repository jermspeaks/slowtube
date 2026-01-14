import { ViewMode } from '../types/video'

interface ViewToggleProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="flex gap-2 p-2 bg-muted rounded">
      <button
        onClick={() => onViewModeChange('card')}
        className={`px-4 py-2 border-none rounded cursor-pointer transition-colors ${
          viewMode === 'card'
            ? 'bg-primary text-primary-foreground font-bold'
            : 'bg-transparent text-foreground hover:bg-accent'
        }`}
      >
        Cards
      </button>
      <button
        onClick={() => onViewModeChange('table')}
        className={`px-4 py-2 border-none rounded cursor-pointer transition-colors ${
          viewMode === 'table'
            ? 'bg-primary text-primary-foreground font-bold'
            : 'bg-transparent text-foreground hover:bg-accent'
        }`}
      >
        Table
      </button>
    </div>
  )
}

export default ViewToggle

