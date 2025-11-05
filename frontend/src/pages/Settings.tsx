import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI, videosAPI } from '../services/api'
import { Button } from '@/components/ui/button'
import { Upload, Trash2 } from 'lucide-react'

function Settings() {
  const navigate = useNavigate()
  const [uploading, setUploading] = useState(false)
  const [fetchingDetails, setFetchingDetails] = useState(false)
  const [fetchProgress, setFetchProgress] = useState<{ remaining: number; processed: number; unavailable: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Check authentication
    authAPI.checkSession().then((data) => {
      if (!data.authenticated) {
        navigate('/login')
      }
    }).catch(() => {
      navigate('/login')
    })
  }, [navigate])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const isJson = file.name.endsWith('.json') || file.type === 'application/json'
    const isCsv = file.name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/csv'
    
    if (!isJson && !isCsv) {
      alert('Please upload a JSON or CSV file (Google Takeout watch-history.json or watch-history.csv)')
      return
    }

    try {
      setUploading(true)
      const result = await videosAPI.import(file)
      console.log('Import result:', result)
      
      const message = result.imported > 0 || result.updated > 0
        ? `Videos imported successfully! ${result.imported} new, ${result.updated} updated.`
        : 'No new videos to import.'
      
      // Start fetching video details if there are videos queued
      if (result.fetchQueued > 0) {
        setFetchingDetails(true)
        setFetchProgress({ remaining: result.fetchQueued, processed: 0, unavailable: 0 })
        // Start fetching details in background
        fetchVideoDetailsInBackground()
      } else {
        alert(message)
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      console.error('Error importing videos:', error)
      const errorMessage = error.response?.data?.error || 'Failed to import videos'
      alert(errorMessage)
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } finally {
      setUploading(false)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const fetchVideoDetailsInBackground = async () => {
    try {
      let totalProcessed = 0
      let totalUnavailable = 0
      
      while (true) {
        const result = await videosAPI.fetchDetails()
        
        totalProcessed += result.processed || 0
        totalUnavailable += result.unavailable || 0
        
        setFetchProgress({
          remaining: result.remaining || 0,
          processed: totalProcessed,
          unavailable: totalUnavailable,
        })
        
        if (result.status === 'completed' || result.remaining === 0) {
          // All videos processed
          setFetchingDetails(false)
          alert(`Video details fetched successfully! ${totalProcessed} processed, ${totalUnavailable} unavailable.`)
          setFetchProgress(null)
          break
        }
        
        // Wait a bit before next batch
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (error: any) {
      console.error('Error fetching video details:', error)
      setFetchingDetails(false)
      const errorMessage = error.response?.data?.error || 'Failed to fetch video details'
      alert(errorMessage)
      setFetchProgress(null)
    }
  }

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete all videos? This action cannot be undone.')) {
      return
    }

    try {
      await videosAPI.deleteAll()
      alert('All videos have been deleted successfully.')
    } catch (error: any) {
      console.error('Error clearing videos:', error)
      const errorMessage = error.response?.data?.error || 'Failed to clear videos'
      alert(errorMessage)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold mb-6">Settings</h1>
          
          <div className="space-y-8">
            {/* Import Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Import Videos</h2>
              <p className="text-sm text-muted-foreground">
                Upload your watch-history.json or watch-history.csv file from Google Takeout to import your YouTube watch history.
              </p>
              
              {fetchingDetails && fetchProgress && (
                <div className="px-4 py-2 bg-blue-500 text-white rounded text-sm">
                  Fetching details... {fetchProgress.remaining} remaining ({fetchProgress.processed} processed, {fetchProgress.unavailable} unavailable)
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,application/json,text/csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <Button
                onClick={handleImportClick}
                disabled={uploading || fetchingDetails}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Import Google Takeout File'}
              </Button>
            </div>

            {/* Clear All Section */}
            <div className="space-y-4 border-t pt-6">
              <h2 className="text-xl font-semibold text-destructive">Danger Zone</h2>
              <p className="text-sm text-muted-foreground">
                Permanently delete all videos from your database. This action cannot be undone.
              </p>
              
              <Button
                onClick={handleClearAll}
                variant="destructive"
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear All Videos
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Settings

