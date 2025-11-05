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
    <div className="relative">
      <div className="mb-3">
        <label className="block mb-2 font-bold">
          Tags
        </label>
        <div className="flex gap-2 flex-wrap mb-2">
          {existingTags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 rounded-full text-sm"
            >
              {tag.name}
              <button
                onClick={() => handleRemoveTag(tag.id)}
                className="border-none bg-transparent cursor-pointer p-0 ml-1 text-base text-gray-500"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="relative">
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
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded mt-1 max-h-[200px] overflow-y-auto z-[1000] shadow-md">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => {
                    handleAddTag(suggestion)
                  }}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                    index < suggestions.length - 1 ? 'border-b border-gray-200' : ''
                  }`}
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

