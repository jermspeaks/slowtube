import { useNavigate } from 'react-router-dom'
import { ChannelListWithCount } from '../types/channel-list'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { MoreVertical, Edit, Trash2, List } from 'lucide-react'

interface ChannelListCardProps {
  list: ChannelListWithCount
  onEdit: (list: ChannelListWithCount) => void
  onDelete: (list: ChannelListWithCount) => void
}

function ChannelListCard({ list, onEdit, onDelete }: ChannelListCardProps) {
  const navigate = useNavigate()

  return (
    <div className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {list.color && (
            <div
              className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
              style={{ backgroundColor: list.color }}
            />
          )}
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-lg mb-1 cursor-pointer hover:text-primary transition-colors truncate"
              onClick={() => navigate(`/channel-lists/${list.id}`)}
            >
              {list.name}
            </h3>
            {list.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {list.description}
              </p>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 hover:bg-accent rounded transition-colors flex-shrink-0">
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => navigate(`/channel-lists/${list.id}`)}
              className="cursor-pointer"
            >
              <List className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEdit(list)}
              className="cursor-pointer"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(list)}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{list.channel_count} {list.channel_count === 1 ? 'channel' : 'channels'}</span>
        <span className="text-xs">
          {new Date(list.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}

export default ChannelListCard

