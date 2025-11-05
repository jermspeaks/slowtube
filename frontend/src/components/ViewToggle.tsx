import { ViewMode } from '../types/video'

interface ViewToggleProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      padding: '8px',
      backgroundColor: '#f0f0f0',
      borderRadius: '4px'
    }}>
      <button
        onClick={() => onViewModeChange('card')}
        style={{
          padding: '8px 16px',
          border: 'none',
          borderRadius: '4px',
          backgroundColor: viewMode === 'card' ? '#007bff' : 'transparent',
          color: viewMode === 'card' ? 'white' : '#333',
          cursor: 'pointer',
          fontWeight: viewMode === 'card' ? 'bold' : 'normal'
        }}
      >
        Cards
      </button>
      <button
        onClick={() => onViewModeChange('table')}
        style={{
          padding: '8px 16px',
          border: 'none',
          borderRadius: '4px',
          backgroundColor: viewMode === 'table' ? '#007bff' : 'transparent',
          color: viewMode === 'table' ? 'white' : '#333',
          cursor: 'pointer',
          fontWeight: viewMode === 'table' ? 'bold' : 'normal'
        }}
      >
        Table
      </button>
    </div>
  )
}

export default ViewToggle

