import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { videosAPI } from '../services/api'
import { Tag } from 'lucide-react'

function Tags() {
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = async () => {
    try {
      setLoading(true)
      const allTags = await videosAPI.getAllTags()
      setTags(allTags)
    } catch (error) {
      console.error('Error loading tags:', error)
      alert('Failed to load tags')
    } finally {
      setLoading(false)
    }
  }

  const filteredTags = tags.filter(tag =>
    tag.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h1 className="text-2xl font-bold">Tags</h1>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-[60px] px-5 bg-white rounded-lg">
            <div className="text-lg text-gray-500">Loading tags...</div>
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="text-center py-[60px] px-5 bg-white rounded-lg">
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-500 mb-2">
              {searchQuery ? 'No tags found' : 'No tags yet'}
            </p>
            <p className="text-sm text-gray-500">
              {searchQuery
                ? 'Try a different search term'
                : 'Add tags to videos to organize your content'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                {filteredTags.length} {filteredTags.length === 1 ? 'tag' : 'tags'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {filteredTags.map((tag, index) => (
                <Link
                  key={index}
                  to={`/dashboard?tag=${encodeURIComponent(tag)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Tags

