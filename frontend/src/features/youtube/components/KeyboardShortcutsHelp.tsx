import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'

interface KeyboardShortcutsHelpProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const shortcuts = [
  { key: 'Space', description: 'Play/Pause' },
  { key: '←', description: 'Seek backward 10 seconds' },
  { key: '→', description: 'Seek forward 10 seconds' },
  { key: '↑', description: 'Volume up' },
  { key: '↓', description: 'Volume down' },
  { key: 'M', description: 'Mute/Unmute' },
  { key: 'F', description: 'Fullscreen' },
  { key: '[', description: 'Decrease playback speed' },
  { key: ']', description: 'Increase playback speed' },
  { key: 'N', description: 'Next video' },
  { key: 'P', description: 'Previous video' },
  { key: 'O', description: 'Toggle state (inbox/feed/archive)' },
  { key: 'Esc', description: 'Close player' },
  { key: '?', description: 'Show this help' },
]

function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default KeyboardShortcutsHelp
