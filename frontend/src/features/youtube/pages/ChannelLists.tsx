import { useState, useEffect, useMemo } from 'react'
import { channelGroupsAPI } from '../services/api'
import { ChannelGroupWithCount } from '../types/channel-list'
import ChannelGroupTable from '../components/ChannelListTable'
import ChannelGroupForm from '../components/ChannelListForm'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

function ChannelGroups() {
  const [groups, setGroups] = useState<ChannelGroupWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'name' | 'channel_count' | 'created_at'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ChannelGroupWithCount | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<ChannelGroupWithCount | null>(null)

  useEffect(() => {
    loadGroups()
  }, [])

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

  const handleCreate = async (data: { name: string; description: string | null; color: string | null }) => {
    try {
      await channelGroupsAPI.create(data.name, data.description, data.color)
      toast.success('Channel group created successfully')
      setIsCreateModalOpen(false)
      loadGroups()
    } catch (error: any) {
      console.error('Error creating channel group:', error)
      toast.error(error.response?.data?.error || 'Failed to create channel group')
    }
  }

  const handleEdit = (group: ChannelGroupWithCount) => {
    setEditingGroup(group)
    setIsEditModalOpen(true)
  }

  const handleUpdate = async (data: { name: string; description: string | null; color: string | null }) => {
    if (!editingGroup) return

    try {
      await channelGroupsAPI.update(editingGroup.id, data)
      toast.success('Channel group updated successfully')
      setIsEditModalOpen(false)
      setEditingGroup(null)
      loadGroups()
    } catch (error: any) {
      console.error('Error updating channel group:', error)
      toast.error(error.response?.data?.error || 'Failed to update channel group')
    }
  }

  const handleDeleteClick = (group: ChannelGroupWithCount) => {
    setDeletingGroup(group)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingGroup) return

    try {
      await channelGroupsAPI.delete(deletingGroup.id)
      toast.success('Channel group deleted successfully')
      setIsDeleteDialogOpen(false)
      setDeletingGroup(null)
      loadGroups()
    } catch (error: any) {
      console.error('Error deleting channel group:', error)
      toast.error(error.response?.data?.error || 'Failed to delete channel group')
    }
  }

  const handleSortChange = (value: string) => {
    const lastUnderscoreIndex = value.lastIndexOf('_')
    if (lastUnderscoreIndex !== -1) {
      const by = value.substring(0, lastUnderscoreIndex) as 'name' | 'channel_count' | 'created_at'
      const order = value.substring(lastUnderscoreIndex + 1) as 'asc' | 'desc'
      if ((by === 'name' || by === 'channel_count' || by === 'created_at') && (order === 'asc' || order === 'desc')) {
        setSortBy(by)
        setSortOrder(order)
      }
    }
  }

  const sortedGroups = useMemo(() => {
    const sorted = [...groups]
    sorted.sort((a, b) => {
      let comparison = 0
      
      if (sortBy === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '')
      } else if (sortBy === 'channel_count') {
        comparison = (a.channel_count || 0) - (b.channel_count || 0)
      } else if (sortBy === 'created_at') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        comparison = dateA - dateB
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    return sorted
  }, [groups, sortBy, sortOrder])

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="flex justify-between items-start mb-4 md:mb-6 flex-wrap gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">Channel Groups</h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Group</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </div>
        </div>

        {/* Sort Panel */}
        {!loading && groups.length > 0 && (
          <div className="bg-card rounded-lg p-4 border border-border shadow-sm mb-4 md:mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex gap-2 items-center w-full sm:w-auto">
                <label className="font-semibold text-sm text-foreground whitespace-nowrap">Sort:</label>
                <select
                  value={sortBy ? `${sortBy}_${sortOrder}` : 'name_asc'}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="px-3 py-2 border border-border rounded text-sm bg-background flex-1 sm:flex-initial"
                >
                  <option value="name_asc">Alphabetical (A-Z)</option>
                  <option value="name_desc">Alphabetical (Z-A)</option>
                  <option value="channel_count_desc">Number of Channels (Most)</option>
                  <option value="channel_count_asc">Number of Channels (Least)</option>
                  <option value="created_at_desc">Created Date (Newest)</option>
                  <option value="created_at_asc">Created Date (Oldest)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12 md:py-[60px] px-5 bg-card rounded-lg">
            <div className="text-base md:text-lg text-muted-foreground">Loading channel groups...</div>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 md:py-[60px] px-5 bg-card rounded-lg">
            <p className="text-base md:text-lg text-muted-foreground mb-4">
              No channel groups found
            </p>
            <p className="text-sm md:text-base text-muted-foreground mb-4">
              Create your first channel group to organize your channels.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </div>
        ) : (
          <ChannelGroupTable
            groups={sortedGroups}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
          />
        )}
      </main>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Channel Group</DialogTitle>
            <DialogDescription>
              Create a new channel group to organize your channels.
            </DialogDescription>
          </DialogHeader>
          <ChannelGroupForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Channel Group</DialogTitle>
            <DialogDescription>
              Update channel group details.
            </DialogDescription>
          </DialogHeader>
          <ChannelGroupForm
            group={editingGroup}
            onSubmit={handleUpdate}
            onCancel={() => {
              setIsEditModalOpen(false)
              setEditingGroup(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Channel Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingGroup?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeletingGroup(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ChannelGroups

