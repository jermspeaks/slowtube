import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
// YouTube pages
import YouTubeDashboard from './features/youtube/pages/Dashboard'
import WatchLater from './features/youtube/pages/WatchLater'
import Stats from './features/youtube/pages/Stats'
import GroupedView from './features/youtube/pages/GroupedView'
import ChannelsList from './features/youtube/pages/ChannelsList'
import ChannelWatchLater from './features/youtube/pages/ChannelWatchLater'
import ChannelLatest from './features/youtube/pages/ChannelLatest'
import ChannelLiked from './features/youtube/pages/ChannelLiked'
import ChannelLists from './features/youtube/pages/ChannelLists'
import ChannelListDetail from './features/youtube/pages/ChannelListDetail'
import YouTubeWatchNext from './features/youtube/pages/WatchNext'
import Archive from './features/youtube/pages/Archive'
import Tags from './features/youtube/pages/Tags'
// Media pages
import MediaDashboard from './features/media/pages/Dashboard'
import Calendar from './features/media/pages/Calendar'
import MoviesList from './features/media/pages/MoviesList'
import MovieDetail from './features/media/pages/MovieDetail'
import TVShowsList from './features/media/pages/TVShowsList'
import TVShowDetail from './features/media/pages/TVShowDetail'
import Upcoming from './features/media/pages/Upcoming'
import RecentlyAired from './features/media/pages/RecentlyAired'
import MediaWatchNext from './features/media/pages/WatchNext'
import MoviePlaylists from './features/media/pages/MoviePlaylists'
import MoviePlaylistDetail from './features/media/pages/MoviePlaylistDetail'
// Shared pages
import Settings from './shared/pages/Settings'
import Login from './shared/pages/Login'
// Components
import { DashboardLayout } from './components/DashboardLayout'
import { useTheme } from './shared/hooks/useTheme'
import { Toaster } from './shared/components/ui/sonner'

function AppRoutes() {
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'

  if (isLoginPage) {
    return <Login />
  }

  return (
    <DashboardLayout>
      <Routes>
        {/* YouTube routes */}
        <Route path="/youtube/dashboard" element={<YouTubeDashboard />} />
        <Route path="/youtube/watch-later" element={<WatchLater />} />
        <Route path="/youtube/stats" element={<Stats />} />
        <Route path="/youtube/grouped" element={<GroupedView />} />
        <Route path="/youtube/watch-next" element={<YouTubeWatchNext />} />
        <Route path="/youtube/archive" element={<Archive />} />
        <Route path="/youtube/tags" element={<Tags />} />
        <Route path="/youtube/channels/subscribed" element={<ChannelsList />} />
        <Route path="/youtube/channels/watch-later" element={<ChannelsList />} />
        <Route path="/youtube/channels/:channelId/watch-later" element={<ChannelWatchLater />} />
        <Route path="/youtube/channels/:channelId/latest" element={<ChannelLatest />} />
        <Route path="/youtube/channels/:channelId/liked" element={<ChannelLiked />} />
        <Route path="/youtube/channels/:channelId" element={<Navigate to="watch-later" replace />} />
        <Route path="/youtube/channel-lists" element={<ChannelLists />} />
        <Route path="/youtube/channel-lists/:id/watch-later" element={<ChannelListDetail />} />
        <Route path="/youtube/channel-lists/:id/latest" element={<ChannelListDetail />} />
        <Route path="/youtube/channel-lists/:id/liked" element={<ChannelListDetail />} />
        <Route path="/youtube/channel-lists/:id" element={<Navigate to="watch-later" replace />} />
        
        {/* Media routes */}
        <Route path="/media/dashboard" element={<MediaDashboard />} />
        <Route path="/media/calendar" element={<Calendar />} />
        <Route path="/media/movies" element={<MoviesList />} />
        <Route path="/media/movies/:id" element={<MovieDetail />} />
        <Route path="/media/tv-shows/upcoming" element={<Upcoming />} />
        <Route path="/media/tv-shows/list" element={<TVShowsList />} />
        <Route path="/media/tv-shows/recently-aired" element={<RecentlyAired />} />
        <Route path="/media/tv-shows/:id" element={<TVShowDetail />} />
        <Route path="/media/tv-shows" element={<Navigate to="/media/tv-shows/list" replace />} />
        <Route path="/media/watch-next" element={<MediaWatchNext />} />
        <Route path="/media/playlists" element={<MoviePlaylists />} />
        <Route path="/media/playlists/:id" element={<MoviePlaylistDetail />} />
        
        {/* Shared routes */}
        <Route path="/settings" element={<Settings />} />
        
        {/* Legacy redirects */}
        <Route path="/dashboard" element={<Navigate to="/youtube/dashboard" replace />} />
        <Route path="/watch-later" element={<Navigate to="/youtube/watch-later" replace />} />
        <Route path="/calendar" element={<Navigate to="/media/calendar" replace />} />
        <Route path="/stats" element={<Navigate to="/youtube/stats" replace />} />
        <Route path="/grouped" element={<Navigate to="/youtube/grouped" replace />} />
        <Route path="/channels/subscribed" element={<Navigate to="/youtube/channels/subscribed" replace />} />
        <Route path="/channels/watch-later" element={<Navigate to="/youtube/channels/watch-later" replace />} />
        <Route path="/channels/:channelId/*" element={<Navigate to="/youtube/channels/:channelId" replace />} />
        <Route path="/movies" element={<Navigate to="/media/movies" replace />} />
        <Route path="/movies/:id" element={<Navigate to="/media/movies/:id" replace />} />
        <Route path="/tv-shows/*" element={<Navigate to="/media/tv-shows" replace />} />
        <Route path="/upcoming" element={<Navigate to="/media/tv-shows/upcoming" replace />} />
        <Route path="/watch-next" element={<Navigate to="/youtube/watch-next" replace />} />
        <Route path="/tags" element={<Navigate to="/youtube/tags" replace />} />
        <Route path="/playlists" element={<Navigate to="/media/playlists" replace />} />
        <Route path="/playlists/:id" element={<Navigate to="/media/playlists/:id" replace />} />
        <Route path="/channel-lists" element={<Navigate to="/youtube/channel-lists" replace />} />
        <Route path="/channel-lists/:id/*" element={<Navigate to="/youtube/channel-lists/:id" replace />} />
        
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/youtube/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  )
}

function AppContent() {
  // Initialize theme on app load
  useTheme()
  const [toastPosition, setToastPosition] = useState<'top-center' | 'bottom-right'>('bottom-right')

  useEffect(() => {
    const updatePosition = () => {
      // Use md breakpoint (768px) - below is mobile, above is desktop
      setToastPosition(window.innerWidth >= 768 ? 'bottom-right' : 'top-center')
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [])

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<AppRoutes />} />
      </Routes>
      <Toaster position={toastPosition} />
    </>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
