import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { videosAPI } from '../services/api'
import { Tag } from 'lucide-react'
import { toast } from 'sonner'

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
      toast.error('Failed to load tags')
    } finally {
      setLoading(false)
    }
  }

  const filteredTags = tags.filter(tag =>
    tag.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
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
            className="w-full md:w-96 px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background"
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
            <div className="text-lg text-muted-foreground">Loading tags...</div>
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="text-center py-[60px] px-5 bg-card rounded-lg">
            <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground mb-2">
              {searchQuery ? 'No tags found' : 'No tags yet'}
            </p>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? 'Try a different search term'
                : 'Add tags to videos to organize your content'}
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-lg p-6">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {filteredTags.length} {filteredTags.length === 1 ? 'tag' : 'tags'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {filteredTags.map((tag, index) => (
                <Link
                  key={index}
                  to={`/dashboard?tag=${encodeURIComponent(tag)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-accent rounded-full text-sm transition-colors"
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

