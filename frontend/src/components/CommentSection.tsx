import { useState } from 'react'
import { Comment } from '../types/video'
import { videosAPI } from '../services/api'
import { format } from 'date-fns'

interface CommentSectionProps {
  videoId: number
  comments: Comment[]
  onCommentAdded: (comment: Comment) => void
  onCommentUpdated: (comment: Comment) => void
  onCommentRemoved: (commentId: number) => void
}

function CommentSection({
  videoId,
  comments,
  onCommentAdded,
  onCommentUpdated,
  onCommentRemoved
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')

  const handleAddComment = async () => {
    const trimmed = newComment.trim()
    if (!trimmed) return

    try {
      const comment = await videosAPI.addComment(videoId, trimmed)
      onCommentAdded(comment)
      setNewComment('')
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('Failed to add comment')
    }
  }

  const handleStartEdit = (comment: Comment) => {
    setEditingId(comment.id)
    setEditContent(comment.content)
  }

  const handleSaveEdit = async (commentId: number) => {
    const trimmed = editContent.trim()
    if (!trimmed) return

    try {
      const comment = await videosAPI.updateComment(videoId, commentId, trimmed)
      onCommentUpdated(comment)
      setEditingId(null)
      setEditContent('')
    } catch (error) {
      console.error('Error updating comment:', error)
      alert('Failed to update comment')
    }
  }

  const handleDelete = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      await videosAPI.deleteComment(videoId, commentId)
      onCommentRemoved(commentId)
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Failed to delete comment')
    }
  }

  return (
    <div>
      <h3 className="mb-4 font-bold">Comments</h3>
      
      <div className="mb-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-sans resize-y mb-2"
        />
        <button
          onClick={handleAddComment}
          disabled={!newComment.trim()}
          className="px-4 py-2 bg-blue-500 text-white border-none rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Comment
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {comments.length === 0 ? (
          <p className="text-gray-500 italic">No comments yet</p>
        ) : (
          comments.map(comment => (
            <div
              key={comment.id}
              className="p-3 bg-gray-100 rounded border border-gray-200"
            >
              {editingId === comment.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-sans resize-y mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(comment.id)}
                      disabled={!editContent.trim()}
                      className="px-3 py-1 bg-green-500 text-white border-none rounded disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setEditContent('')
                      }}
                      className="px-3 py-1 bg-gray-500 text-white border-none rounded cursor-pointer text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="mb-2 whitespace-pre-wrap">{comment.content}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {format(new Date(comment.created_at), 'MMM d, yyyy HH:mm')}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEdit(comment)}
                        className="px-2 py-1 bg-transparent text-blue-500 border border-blue-500 rounded cursor-pointer text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="px-2 py-1 bg-transparent text-red-500 border border-red-500 rounded cursor-pointer text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default CommentSection

