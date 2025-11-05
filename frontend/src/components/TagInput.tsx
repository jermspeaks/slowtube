import { useState, useEffect, useRef } from 'react'
import { videosAPI } from '../services/api'

interface TagInputProps {
  videoId: number
  existingTags: Array<{ id: number; name: string }>
  onTagAdded: (tag: { id: number; name: string }) => void
  onTagRemoved: (tagId: number) => void
}

function TagInput({ videoId, existingTags, onTagAdded, onTagRemoved }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [allTags, setAllTags] = useState<string[]>([])

  useEffect(() => {
    // Load all tags for autocomplete
    videosAPI.getAllTags().then(setAllTags).catch(console.error)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    if (value.trim()) {
      // Filter suggestions
      const filtered = allTags
        .filter(tag => 
          tag.toLowerCase().includes(value.toLowerCase()) &&
          !existingTags.some(et => et.name.toLowerCase() === tag.toLowerCase())
        )
        .slice(0, 5)
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  const handleAddTag = async (tagName: string) => {
    const trimmedName = tagName.trim()
    if (!trimmedName) return

    // Check if tag already exists
    if (existingTags.some(t => t.name.toLowerCase() === trimmedName.toLowerCase())) {
      setInputValue('')
      return
    }

    try {
      const newTag = await videosAPI.addTag(videoId, trimmedName)
      onTagAdded(newTag)
      setInputValue('')
      setShowSuggestions(false)
    } catch (error) {
      console.error('Error adding tag:', error)
      alert('Failed to add tag. It may already exist.')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag(inputValue)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const handleRemoveTag = async (tagId: number) => {
    try {
      await videosAPI.deleteTag(videoId, tagId)
      onTagRemoved(tagId)
    } catch (error) {
      console.error('Error removing tag:', error)
      alert('Failed to remove tag')
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Tags
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {existingTags.map(tag => (
            <span
              key={tag.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                backgroundColor: '#e9ecef',
                borderRadius: '16px',
                fontSize: '14px'
              }}
            >
              {tag.name}
              <button
                onClick={() => handleRemoveTag(tag.id)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '0',
                  marginLeft: '4px',
                  fontSize: '16px',
                  color: '#6c757d'
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true)
            }}
            placeholder="Add a tag..."
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              marginTop: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1000,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => {
                    handleAddTag(suggestion)
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: index < suggestions.length - 1 ? '1px solid #e9ecef' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TagInput

