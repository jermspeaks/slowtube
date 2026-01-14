import { useState, useEffect } from 'react'
import { channelGroupsAPI } from '../services/api'
import { ChannelGroupWithCount } from '../types/channel-list'
import ChannelGroupCard from '../components/ChannelListCard'
import ChannelGroupTable from '../components/ChannelListTable'
import ChannelGroupForm from '../components/ChannelListForm'
import ViewToggle from '../components/ViewToggle'
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
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
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

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
          <h1 className="text-3xl font-bold">Channel Groups</h1>
          <div className="flex items-center gap-4">
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Group
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
            <div className="text-lg text-muted-foreground">Loading channel groups...</div>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-[60px] px-5 bg-card rounded-lg">
            <p className="text-lg text-muted-foreground mb-4">
              No channel groups found
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first channel group to organize your channels.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </div>
        ) : (
          <>
            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map(group => (
                  <ChannelGroupCard
                    key={group.id}
                    group={group}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>
            ) : (
              <ChannelGroupTable
                groups={groups}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            )}
          </>
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

