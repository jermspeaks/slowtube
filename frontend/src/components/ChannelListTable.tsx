import { useNavigate } from 'react-router-dom'
import { ChannelListWithCount } from '../types/channel-list'
import { format } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { MoreVertical, Edit, Trash2, List } from 'lucide-react'

interface ChannelListTableProps {
  lists: ChannelListWithCount[]
  onEdit: (list: ChannelListWithCount) => void
  onDelete: (list: ChannelListWithCount) => void
}

function ChannelListTable({ lists, onEdit, onDelete }: ChannelListTableProps) {
  const navigate = useNavigate()

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse bg-card rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-muted">
            <th className="p-3 text-left border-b-2 border-border">Color</th>
            <th className="p-3 text-left border-b-2 border-border">Name</th>
            <th className="p-3 text-left border-b-2 border-border">Description</th>
            <th className="p-3 text-left border-b-2 border-border">Channels</th>
            <th className="p-3 text-left border-b-2 border-border">Created</th>
            <th className="p-3 text-left border-b-2 border-border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {lists.map(list => (
            <tr
              key={list.id}
              className="border-b border-border hover:bg-accent transition-colors"
            >
              <td className="p-3">
                {list.color ? (
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: list.color }}
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-muted" />
                )}
              </td>
              <td className="p-3">
                <div
                  className="font-bold cursor-pointer hover:text-primary transition-colors"
                  onClick={() => navigate(`/channel-lists/${list.id}`)}
                >
                  {list.name}
                </div>
              </td>
              <td className="p-3 max-w-[400px]">
                {list.description ? (
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {list.description}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </td>
              <td className="p-3 text-muted-foreground text-sm">
                {list.channel_count} {list.channel_count === 1 ? 'channel' : 'channels'}
              </td>
              <td className="p-3 text-muted-foreground text-sm">
                {list.created_at ? (
                  format(new Date(list.created_at), 'MMM d, yyyy')
                ) : (
                  '-'
                )}
              </td>
              <td className="p-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 hover:bg-accent rounded transition-colors">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ChannelListTable

