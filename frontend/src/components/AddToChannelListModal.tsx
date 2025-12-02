import { useState, useEffect } from 'react'
import { channelListsAPI } from '../services/api'
import { ChannelListWithCount } from '../types/channel-list'
import ChannelListForm from './ChannelListForm'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

interface AddToChannelListModalProps {
  isOpen: boolean
  onClose: () => void
  channelIds: string[]
  onSuccess?: () => void
}

function AddToChannelListModal({ isOpen, onClose, channelIds, onSuccess }: AddToChannelListModalProps) {
  const [lists, setLists] = useState<ChannelListWithCount[]>([])
  const [selectedListIds, setSelectedListIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadLists()
      setSelectedListIds(new Set())
      setShowCreateForm(false)
    }
  }, [isOpen])

  const loadLists = async () => {
    try {
      setLoading(true)
      const data = await channelListsAPI.getAll()
      setLists(data)
    } catch (error) {
      console.error('Error loading channel lists:', error)
      toast.error('Failed to load channel lists')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleList = (listId: number) => {
    const newSelected = new Set(selectedListIds)
    if (newSelected.has(listId)) {
      newSelected.delete(listId)
    } else {
      newSelected.add(listId)
    }
    setSelectedListIds(newSelected)
  }

  const handleCreateList = async (data: { name: string; description: string | null; color: string | null }) => {
    try {
      const newList = await channelListsAPI.create(data.name, data.description, data.color)
      toast.success('Channel list created successfully')
      setShowCreateForm(false)
      await loadLists()
      // Automatically select the newly created list
      setSelectedListIds(new Set([newList.id]))
    } catch (error: any) {
      console.error('Error creating channel list:', error)
      toast.error(error.response?.data?.error || 'Failed to create channel list')
    }
  }

  const handleAddToLists = async () => {
    if (selectedListIds.size === 0) {
      toast.error('Please select at least one list')
      return
    }

    try {
      setLoading(true)
      let successCount = 0
      let errorCount = 0

      for (const listId of selectedListIds) {
        try {
          await channelListsAPI.addChannels(listId, channelIds)
          successCount++
        } catch (error) {
          errorCount++
          console.error(`Error adding channels to list ${listId}:`, error)
        }
      }

      if (successCount > 0) {
        toast.success(`Added ${channelIds.length} channel(s) to ${successCount} list(s)`)
        onSuccess?.()
        onClose()
      } else {
        toast.error('Failed to add channels to lists')
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} list(s) failed to update`)
      }
    } catch (error) {
      console.error('Error adding channels to lists:', error)
      toast.error('Failed to add channels to lists')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add to Channel List</DialogTitle>
          <DialogDescription>
            Select one or more lists to add {channelIds.length} channel{channelIds.length !== 1 ? 's' : ''} to.
          </DialogDescription>
        </DialogHeader>

        {showCreateForm ? (
          <div className="space-y-4">
            <ChannelListForm
              onSubmit={handleCreateList}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {loading && lists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading lists...
              </div>
            ) : lists.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No channel lists found</p>
                <Button onClick={() => setShowCreateForm(true)} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create New List
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {lists.map(list => (
                  <label
                    key={list.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedListIds.has(list.id)}
                      onChange={() => handleToggleList(list.id)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {list.color && (
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: list.color }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{list.name}</div>
                        {list.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {list.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {list.channel_count} {list.channel_count === 1 ? 'channel' : 'channels'}
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
                Create New List
              </Button>
              <Button
                onClick={handleAddToLists}
                disabled={loading || selectedListIds.size === 0}
                className="flex-1"
              >
                {loading ? 'Adding...' : `Add to ${selectedListIds.size} List${selectedListIds.size !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default AddToChannelListModal

