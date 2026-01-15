import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { channelGroupsAPI } from '../services/api'
import { ChannelGroupWithCount } from '../types/channel-list'
import { toast } from 'sonner'
import { GripVertical } from 'lucide-react'

interface ConfigureDashboardModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: () => void
}

function ConfigureDashboardModal({ isOpen, onClose, onSave }: ConfigureDashboardModalProps) {
  const [groups, setGroups] = useState<ChannelGroupWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [displayOnHomeMap, setDisplayOnHomeMap] = useState<Map<number, boolean>>(new Map())
  const [saving, setSaving] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadGroups()
    }
  }, [isOpen])

  const loadGroups = async () => {
    try {
      setLoading(true)
      const data = await channelGroupsAPI.getAll()
      setGroups(data)
      
      // Initialize display_on_home map
      const map = new Map<number, boolean>()
      data.forEach(group => {
        map.set(group.id, group.display_on_home === 1)
      })
      setDisplayOnHomeMap(map)
    } catch (error) {
      console.error('Error loading channel groups:', error)
      toast.error('Failed to load channel groups')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (groupId: number) => {
    const newMap = new Map(displayOnHomeMap)
    newMap.set(groupId, !newMap.get(groupId))
    setDisplayOnHomeMap(newMap)
  }

  const handleSelectAll = () => {
    const newMap = new Map<number, boolean>()
    groups.forEach(group => {
      newMap.set(group.id, true)
    })
    setDisplayOnHomeMap(newMap)
  }

  const handleDeselectAll = () => {
    const newMap = new Map<number, boolean>()
    groups.forEach(group => {
      newMap.set(group.id, false)
    })
    setDisplayOnHomeMap(newMap)
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newGroups = [...groups]
    const [draggedGroup] = newGroups.splice(draggedIndex, 1)
    newGroups.splice(dropIndex, 0, draggedGroup)

    setGroups(newGroups)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Update all groups that changed display_on_home
      const updates: Promise<any>[] = []
      for (const group of groups) {
        const currentValue = group.display_on_home === 1
        const newValue = displayOnHomeMap.get(group.id) ?? false
        
        if (currentValue !== newValue) {
          updates.push(channelGroupsAPI.toggleDisplayOnHome(group.id, newValue))
        }
      }
      
      // Save the new order
      const groupIds = groups.map(g => g.id)
      updates.push(channelGroupsAPI.reorderChannelGroups(groupIds))
      
      await Promise.all(updates)
      
      toast.success('Dashboard configuration updated')
      if (onSave) {
        onSave()
      }
      onClose()
    } catch (error: any) {
      console.error('Error saving dashboard configuration:', error)
      toast.error(error.response?.data?.error || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const displayedCount = Array.from(displayOnHomeMap.values()).filter(Boolean).length

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Display on Home</DialogTitle>
          <DialogDescription>
            Select which channel groups should appear on your dashboard. Drag and drop to reorder them.
          </DialogDescription>
        </DialogHeader>

        {!loading && groups.length > 0 && (
          <div className="flex gap-2 pb-2 border-b">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={saving}
              className="text-xs"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              disabled={saving}
              className="text-xs"
            >
              Deselect All
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading channel groups...
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No channel groups found. Create a group first.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {groups.map((group, index) => {
                const isDisplayed = displayOnHomeMap.get(group.id) ?? false
                const isDragging = draggedIndex === index
                const isDragOver = dragOverIndex === index
                return (
                  <div
                    key={group.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border border-border
                      transition-all cursor-move
                      ${isDragging ? 'opacity-50' : ''}
                      ${isDragOver ? 'border-primary border-2 bg-accent' : 'hover:bg-accent'}
                    `}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      {group.color && (
                        <div
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: group.color }}
                        />
                      )}
                      <label
                        htmlFor={`group-${group.id}`}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="font-medium text-sm text-foreground truncate">
                          {group.name}
                        </div>
                        {group.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {group.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {group.channel_count} {group.channel_count === 1 ? 'channel' : 'channels'}
                        </div>
                      </label>
                    </div>
                    <input
                      id={`group-${group.id}`}
                      type="checkbox"
                      checked={isDisplayed}
                      onChange={() => handleToggle(group.id)}
                      className="w-5 h-5 cursor-pointer shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t pt-4 mt-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-muted-foreground">
              {displayedCount} {displayedCount === 1 ? 'group' : 'groups'} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || loading}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConfigureDashboardModal
