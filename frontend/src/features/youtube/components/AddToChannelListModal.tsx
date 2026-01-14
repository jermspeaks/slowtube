import { useState, useEffect } from 'react'
import { channelGroupsAPI } from '../services/api'
import { ChannelGroupWithCount } from '../types/channel-list'
import ChannelGroupForm from './ChannelListForm'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

interface AddToChannelGroupModalProps {
  isOpen: boolean
  onClose: () => void
  channelIds: string[]
  onSuccess?: () => void
}

function AddToChannelGroupModal({ isOpen, onClose, channelIds, onSuccess }: AddToChannelGroupModalProps) {
  const [groups, setGroups] = useState<ChannelGroupWithCount[]>([])
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadGroups()
      setSelectedGroupIds(new Set())
      setShowCreateForm(false)
    }
  }, [isOpen])

  const loadGroups = async () => {
    try {
      setLoading(true)
      const data = await channelGroupsAPI.getAll()
      setGroups(data)
    } catch (error) {
      console.error('Error loading channel groups:', error)
      toast.error('Failed to load channel groups')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleGroup = (groupId: number) => {
    const newSelected = new Set(selectedGroupIds)
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId)
    } else {
      newSelected.add(groupId)
    }
    setSelectedGroupIds(newSelected)
  }

  const handleCreateGroup = async (data: { name: string; description: string | null; color: string | null }) => {
    try {
      const newGroup = await channelGroupsAPI.create(data.name, data.description, data.color)
      toast.success('Channel group created successfully')
      setShowCreateForm(false)
      await loadGroups()
      // Automatically select the newly created group
      setSelectedGroupIds(new Set([newGroup.id]))
    } catch (error: any) {
      console.error('Error creating channel group:', error)
      toast.error(error.response?.data?.error || 'Failed to create channel group')
    }
  }

  const handleAddToGroups = async () => {
    if (selectedGroupIds.size === 0) {
      toast.error('Please select at least one group')
      return
    }

    try {
      setLoading(true)
      let successCount = 0
      let errorCount = 0

      for (const groupId of selectedGroupIds) {
        try {
          await channelGroupsAPI.addChannels(groupId, channelIds)
          successCount++
        } catch (error) {
          errorCount++
          console.error(`Error adding channels to group ${groupId}:`, error)
        }
      }

      if (successCount > 0) {
        toast.success(`Added ${channelIds.length} channel(s) to ${successCount} group(s)`)
        onSuccess?.()
        onClose()
      } else {
        toast.error('Failed to add channels to groups')
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} group(s) failed to update`)
      }
    } catch (error) {
      console.error('Error adding channels to groups:', error)
      toast.error('Failed to add channels to groups')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add to Channel Group</DialogTitle>
          <DialogDescription>
            Select one or more groups to add {channelIds.length} channel{channelIds.length !== 1 ? 's' : ''} to.
          </DialogDescription>
        </DialogHeader>

        {showCreateForm ? (
          <div className="space-y-4">
            <ChannelGroupForm
              onSubmit={handleCreateGroup}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {loading && groups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading groups...
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No channel groups found</p>
                <Button onClick={() => setShowCreateForm(true)} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create New Group
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {groups.map(group => (
                  <label
                    key={group.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.has(group.id)}
                      onChange={() => handleToggleGroup(group.id)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {group.color && (
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: group.color }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{group.name}</div>
                        {group.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {group.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {group.channel_count} {group.channel_count === 1 ? 'channel' : 'channels'}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-border">
              <Button
                onClick={() => setShowCreateForm(true)}
                variant="outline"
                className="gap-2 flex-1"
              >
                <Plus className="h-4 w-4" />
                Create New Group
              </Button>
              <Button
                onClick={handleAddToGroups}
                disabled={loading || selectedGroupIds.size === 0}
                className="flex-1"
              >
                {loading ? 'Adding...' : `Add to ${selectedGroupIds.size} Group${selectedGroupIds.size !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default AddToChannelGroupModal

