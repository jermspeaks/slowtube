import { useState, useEffect, useRef } from 'react'
import { videosAPI, importAPI, tvShowsAPI } from '../services/api'
import { Button } from '@/components/ui/button'
import { Upload, Trash2, Film } from 'lucide-react'
import { useTimezone } from '../hooks/useTimezone'
import { useTheme } from '../hooks/useTheme'
import { toast } from 'sonner'

function Settings() {
  const [uploading, setUploading] = useState(false)
  const [fetchingDetails, setFetchingDetails] = useState(false)
  const [fetchProgress, setFetchProgress] = useState<{ remaining: number; processed: number; unavailable: number } | null>(null)
  const [importingTMDB, setImportingTMDB] = useState(false)
  const [tmdbImportProgress, setTmdbImportProgress] = useState<string | null>(null)
  const [importingIMDB, setImportingIMDB] = useState(false)
  const [imdbImportProgress, setImdbImportProgress] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { timezone, loading: timezoneLoading, updateTimezone } = useTimezone()
  const [selectedTimezone, setSelectedTimezone] = useState<string>('')
  const [savingTimezone, setSavingTimezone] = useState(false)
  const { theme, loading: themeLoading, updateTheme } = useTheme()
  const [selectedTheme, setSelectedTheme] = useState<'system' | 'light' | 'dark'>('system')
  const [savingTheme, setSavingTheme] = useState(false)

  useEffect(() => {
    if (!timezoneLoading && timezone) {
      setSelectedTimezone(timezone)
    }
  }, [timezone, timezoneLoading])

  useEffect(() => {
    if (!themeLoading && theme) {
      setSelectedTheme(theme)
    }
  }, [theme, themeLoading])

  const handleTimezoneChange = async (newTimezone: string) => {
    setSelectedTimezone(newTimezone)
    try {
      setSavingTimezone(true)
      await updateTimezone(newTimezone)
      toast.success('Timezone preference saved successfully!')
    } catch (error: any) {
      console.error('Error saving timezone:', error)
      toast.error('Failed to save timezone preference')
      // Revert to previous timezone
      setSelectedTimezone(timezone)
    } finally {
      setSavingTimezone(false)
    }
  }

  const handleThemeChange = async (newTheme: 'system' | 'light' | 'dark') => {
    setSelectedTheme(newTheme)
    try {
      setSavingTheme(true)
      await updateTheme(newTheme)
      toast.success('Theme preference saved successfully!')
    } catch (error: any) {
      console.error('Error saving theme:', error)
      toast.error('Failed to save theme preference')
      // Revert to previous theme
      setSelectedTheme(theme)
    } finally {
      setSavingTheme(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const isJson = file.name.endsWith('.json') || file.type === 'application/json'
    const isCsv = file.name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/csv'
    
    if (!isJson && !isCsv) {
      toast.error('Please upload a JSON or CSV file (Google Takeout watch-history.json or watch-history.csv)')
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
        toast.success(message)
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      console.error('Error importing videos:', error)
      const errorMessage = error.response?.data?.error || 'Failed to import videos'
      toast.error(errorMessage)
      
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
          toast.success(`Video details fetched successfully! ${totalProcessed} processed, ${totalUnavailable} unavailable.`)
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
      toast.error(errorMessage)
      setFetchProgress(null)
    }
  }

  const handleImportTMDB = async () => {
    if (!window.confirm('This will import all TV shows and movies from data.json (TMDB IDs). This may take a while. Continue?')) {
      return
    }

    try {
      setImportingTMDB(true)
      setTmdbImportProgress('Starting import...')
      
      const result = await importAPI.importTMDB()
      
      setTmdbImportProgress(null)
      toast.success(
        `Import completed! Total: ${result.total}, Imported: ${result.imported} (${result.tvShows} TV shows, ${result.movies} movies), Skipped: ${result.skipped}, Errors: ${result.errors}`
      )
    } catch (error: any) {
      console.error('Error importing from TMDB:', error)
      const errorMessage = error.response?.data?.error || 'Failed to import from TMDB'
      toast.error(errorMessage)
      setTmdbImportProgress(null)
    } finally {
      setImportingTMDB(false)
    }
  }

  const handleImportIMDB = async () => {
    if (!window.confirm('This will import all TV shows and movies from data2.json (IMDb IDs). This may take a while. Continue?')) {
      return
    }

    try {
      setImportingIMDB(true)
      setImdbImportProgress('Starting import...')
      
      const result = await importAPI.importIMDB()
      
      setImdbImportProgress(null)
      toast.success(
        `Import completed! Total: ${result.total}, Imported: ${result.imported} (${result.tvShows} TV shows, ${result.movies} movies), Skipped: ${result.skipped}, Errors: ${result.errors}`
      )
    } catch (error: any) {
      console.error('Error importing from IMDb:', error)
      const errorMessage = error.response?.data?.error || 'Failed to import from IMDb'
      toast.error(errorMessage)
      setImdbImportProgress(null)
    } finally {
      setImportingIMDB(false)
    }
  }

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete all videos? This action cannot be undone.')) {
      return
    }

    try {
      await videosAPI.deleteAll()
      toast.success('All videos have been deleted successfully.')
    } catch (error: any) {
      console.error('Error clearing videos:', error)
      const errorMessage = error.response?.data?.error || 'Failed to clear videos'
      toast.error(errorMessage)
    }
  }

  const handleResetTVShows = async () => {
    if (!window.confirm('Are you sure you want to delete all TV shows, episodes, and movies? This action cannot be undone.')) {
      return
    }

    try {
      const result = await tvShowsAPI.deleteAll()
      toast.success(`All TV shows, episodes, and movies have been deleted successfully. TV Shows: ${result.tvShowsDeleted}, Movies: ${result.moviesDeleted}`)
    } catch (error: any) {
      console.error('Error resetting TV shows:', error)
      const errorMessage = error.response?.data?.error || 'Failed to reset TV shows'
      toast.error(errorMessage)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="bg-card rounded-lg shadow-sm p-6">
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

            {/* Import TMDB Section */}
            <div className="space-y-4 border-t pt-6">
              <h2 className="text-xl font-semibold">Import TV Shows & Movies</h2>
              <p className="text-sm text-muted-foreground">
                Import TV shows and movies from data files using TMDB API. This will fetch details for all entries and import episodes for TV shows.
              </p>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Import from data.json (TMDB IDs - numeric IDs)
                  </p>
                  {tmdbImportProgress && (
                    <div className="px-4 py-2 bg-blue-500 text-white rounded text-sm mb-2">
                      {tmdbImportProgress}
                    </div>
                  )}
                  <Button
                    onClick={handleImportTMDB}
                    disabled={importingTMDB || importingIMDB}
                    className="gap-2"
                  >
                    <Film className="h-4 w-4" />
                    {importingTMDB ? 'Importing...' : 'Import from TMDB (data.json)'}
                  </Button>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Import from data2.json (IMDb IDs - IDs starting with "tt")
                  </p>
                  {imdbImportProgress && (
                    <div className="px-4 py-2 bg-blue-500 text-white rounded text-sm mb-2">
                      {imdbImportProgress}
                    </div>
                  )}
                  <Button
                    onClick={handleImportIMDB}
                    disabled={importingTMDB || importingIMDB}
                    className="gap-2"
                  >
                    <Film className="h-4 w-4" />
                    {importingIMDB ? 'Importing...' : 'Import from IMDb (data2.json)'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Timezone Settings Section */}
            <div className="space-y-4 border-t pt-6">
              <h2 className="text-xl font-semibold">Timezone Settings</h2>
              <p className="text-sm text-muted-foreground">
                Set your preferred timezone for displaying dates in the calendar views. Dates in the database remain stored as UTC.
              </p>
              
              {timezoneLoading ? (
                <div className="text-sm text-muted-foreground">Loading timezone settings...</div>
              ) : (
                <div className="space-y-2">
                  <label htmlFor="timezone-select" className="block text-sm font-medium text-foreground">
                    Timezone
                  </label>
                  <select
                    id="timezone-select"
                    value={selectedTimezone}
                    onChange={(e) => handleTimezoneChange(e.target.value)}
                    disabled={savingTimezone}
                    className="px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-muted disabled:cursor-not-allowed bg-background"
                  >
                    <option value="America/Los_Angeles">Pacific Time (America/Los_Angeles)</option>
                    <option value="America/Denver">Mountain Time (America/Denver)</option>
                    <option value="America/Chicago">Central Time (America/Chicago)</option>
                    <option value="America/New_York">Eastern Time (America/New_York)</option>
                    <option value="America/Toronto">Toronto (America/Toronto)</option>
                    <option value="Europe/London">London (Europe/London)</option>
                    <option value="Europe/Paris">Paris (Europe/Paris)</option>
                    <option value="Europe/Berlin">Berlin (Europe/Berlin)</option>
                    <option value="Asia/Tokyo">Tokyo (Asia/Tokyo)</option>
                    <option value="Asia/Shanghai">Shanghai (Asia/Shanghai)</option>
                    <option value="Asia/Hong_Kong">Hong Kong (Asia/Hong_Kong)</option>
                    <option value="Australia/Sydney">Sydney (Australia/Sydney)</option>
                    <option value="Australia/Melbourne">Melbourne (Australia/Melbourne)</option>
                    <option value="Pacific/Auckland">Auckland (Pacific/Auckland)</option>
                  </select>
                  {savingTimezone && (
                    <div className="text-sm text-blue-500">Saving timezone preference...</div>
                  )}
                  {!savingTimezone && selectedTimezone && (
                    <div className="text-sm text-muted-foreground">
                      Current timezone: {selectedTimezone}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Theme Settings Section */}
            <div className="space-y-4 border-t pt-6">
              <h2 className="text-xl font-semibold">Theme Settings</h2>
              <p className="text-sm text-muted-foreground">
                Choose your preferred color theme. System will follow your device's theme preference.
              </p>
              
              {themeLoading ? (
                <div className="text-sm text-muted-foreground">Loading theme settings...</div>
              ) : (
                <div className="space-y-2">
                  <label htmlFor="theme-select" className="block text-sm font-medium text-foreground">
                    Theme
                  </label>
                  <select
                    id="theme-select"
                    value={selectedTheme}
                    onChange={(e) => handleThemeChange(e.target.value as 'system' | 'light' | 'dark')}
                    disabled={savingTheme}
                    className="px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-muted disabled:cursor-not-allowed bg-background"
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                  {savingTheme && (
                    <div className="text-sm text-blue-500">Saving theme preference...</div>
                  )}
                  {!savingTheme && selectedTheme && (
                    <div className="text-sm text-muted-foreground">
                      Current theme: {selectedTheme === 'system' ? 'System (follows device)' : selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Clear All Section */}
            <div className="space-y-4 border-t pt-6">
              <h2 className="text-xl font-semibold text-destructive">Danger Zone</h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
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
                
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Permanently delete all TV shows, episodes, and movies from your database. This action cannot be undone.
                  </p>
                  <Button
                    onClick={handleResetTVShows}
                    variant="destructive"
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Reset TV Shows & Movies
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Settings

