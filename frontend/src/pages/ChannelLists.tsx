import { useState, useEffect } from 'react'
import { channelListsAPI } from '../services/api'
import { ChannelListWithCount } from '../types/channel-list'
import ChannelListCard from '../components/ChannelListCard'
import ChannelListTable from '../components/ChannelListTable'
import ChannelListForm from '../components/ChannelListForm'
import ViewToggle from '../components/ViewToggle'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Button } from '../components/ui/button'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

function ChannelLists() {
  const [lists, setLists] = useState<ChannelListWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingList, setEditingList] = useState<ChannelListWithCount | null>(null)
  const [deletingList, setDeletingList] = useState<ChannelListWithCount | null>(null)

  useEffect(() => {
    loadLists()
  }, [])

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

  const handleCreate = async (data: { name: string; description: string | null; color: string | null }) => {
    try {
      await channelListsAPI.create(data.name, data.description, data.color)
      toast.success('Channel list created successfully')
      setIsCreateModalOpen(false)
      loadLists()
    } catch (error: any) {
      console.error('Error creating channel list:', error)
      toast.error(error.response?.data?.error || 'Failed to create channel list')
    }
  }

  const handleEdit = (list: ChannelListWithCount) => {
    setEditingList(list)
    setIsEditModalOpen(true)
  }

  const handleUpdate = async (data: { name: string; description: string | null; color: string | null }) => {
    if (!editingList) return

    try {
      await channelListsAPI.update(editingList.id, data)
      toast.success('Channel list updated successfully')
      setIsEditModalOpen(false)
      setEditingList(null)
      loadLists()
    } catch (error: any) {
      console.error('Error updating channel list:', error)
      toast.error(error.response?.data?.error || 'Failed to update channel list')
    }
  }

  const handleDeleteClick = (list: ChannelListWithCount) => {
    setDeletingList(list)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingList) return

    try {
      await channelListsAPI.delete(deletingList.id)
      toast.success('Channel list deleted successfully')
      setIsDeleteDialogOpen(false)
      setDeletingList(null)
      loadLists()
    } catch (error: any) {
      console.error('Error deleting channel list:', error)
      toast.error(error.response?.data?.error || 'Failed to delete channel list')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
          <h1 className="text-3xl font-bold">Channel Lists</h1>
          <div className="flex items-center gap-4">
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create List
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
            <div className="text-lg text-muted-foreground">Loading channel lists...</div>
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-[60px] px-5 bg-card rounded-lg">
            <p className="text-lg text-muted-foreground mb-4">
              No channel lists found
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first channel list to organize your channels.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create List
            </Button>
          </div>
        ) : (
          <>
            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lists.map(list => (
                  <ChannelListCard
                    key={list.id}
                    list={list}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>
            ) : (
              <ChannelListTable
                lists={lists}
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
            <DialogTitle>Create Channel List</DialogTitle>
            <DialogDescription>
              Create a new channel list to organize your channels.
            </DialogDescription>
          </DialogHeader>
          <ChannelListForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Channel List</DialogTitle>
            <DialogDescription>
              Update channel list details.
            </DialogDescription>
          </DialogHeader>
          <ChannelListForm
            list={editingList}
            onSubmit={handleUpdate}
            onCancel={() => {
              setIsEditModalOpen(false)
              setEditingList(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Channel List</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingList?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeletingList(null)
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

export default ChannelLists

