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
      <h3 style={{ marginBottom: '16px', fontWeight: 'bold' }}>Comments</h3>
      
      <div style={{ marginBottom: '16px' }}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
            marginBottom: '8px'
          }}
        />
        <button
          onClick={handleAddComment}
          disabled={!newComment.trim()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: newComment.trim() ? 'pointer' : 'not-allowed',
            opacity: newComment.trim() ? 1 : 0.5
          }}
        >
          Add Comment
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {comments.length === 0 ? (
          <p style={{ color: '#6c757d', fontStyle: 'italic' }}>No comments yet</p>
        ) : (
          comments.map(comment => (
            <div
              key={comment.id}
              style={{
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                border: '1px solid #e9ecef'
              }}
            >
              {editingId === comment.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      marginBottom: '8px'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleSaveEdit(comment.id)}
                      disabled={!editContent.trim()}
                      style={{
                        padding: '4px 12px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: editContent.trim() ? 'pointer' : 'not-allowed',
                        opacity: editContent.trim() ? 1 : 0.5,
                        fontSize: '12px'
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setEditContent('')
                      }}
                      style={{
                        padding: '4px 12px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ marginBottom: '8px', whiteSpace: 'pre-wrap' }}>{comment.content}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#6c757d' }}>
                      {format(new Date(comment.created_at), 'MMM d, yyyy HH:mm')}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleStartEdit(comment)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: 'transparent',
                          color: '#007bff',
                          border: '1px solid #007bff',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(comment.id)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: 'transparent',
                          color: '#dc3545',
                          border: '1px solid #dc3545',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
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

