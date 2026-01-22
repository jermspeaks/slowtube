import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router'
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
import ChannelGroups from './features/youtube/pages/ChannelLists'
import ChannelGroupDetail from './features/youtube/pages/ChannelListDetail'
import YouTubeWatchNext from './features/youtube/pages/WatchNext'
import Archive from './features/youtube/pages/Archive'
import Tags from './features/youtube/pages/Tags'
import Player from './features/youtube/pages/Player'
import LikedVideos from './features/youtube/pages/LikedVideos'
import LikedChannels from './features/youtube/pages/LikedChannels'
// Media pages
import MoviesDashboard from './features/media/pages/MoviesDashboard'
import TVShowsDashboard from './features/media/pages/TVShowsDashboard'
import Calendar from './features/media/pages/Calendar'
import MoviesList from './features/media/pages/MoviesList'
import MovieDetail from './features/media/pages/MovieDetail'
import TVShowsList from './features/media/pages/TVShowsList'
import TVShowDetail from './features/media/pages/TVShowDetail'
import Upcoming from './features/media/pages/Upcoming'
import RecentlyAired from './features/media/pages/RecentlyAired'
import MediaStarred from './features/media/pages/Starred'
import MoviePlaylists from './features/media/pages/MoviePlaylists'
import MoviePlaylistDetail from './features/media/pages/MoviePlaylistDetail'
// Shared pages
import Settings from './shared/pages/Settings'
import Login from './shared/pages/Login'
// Components
import { DashboardLayout } from './components/DashboardLayout'
import { useTheme } from './shared/hooks/useTheme'
import { Toaster } from './shared/components/ui/sonner'

// Redirect component for channel groups with ID parameter
function ChannelGroupRedirect() {
  const location = useLocation()
  // Replace /channel-lists with /youtube/channel-lists in the pathname
  const newPath = location.pathname.replace('/channel-lists', '/youtube/channel-lists')
  return <Navigate to={newPath} replace />
}

// Redirect component for playlists with ID parameter
function PlaylistRedirect() {
  const location = useLocation()
  // Replace /playlists with /media/playlists in the pathname
  const newPath = location.pathname.replace('/playlists', '/media/playlists')
  return <Navigate to={newPath} replace />
}

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
        <Route path="/youtube/player" element={<Player />} />
        <Route path="/youtube/review/liked" element={<LikedVideos />} />
        <Route path="/youtube/review/channels" element={<LikedChannels />} />
        <Route path="/youtube/channels/subscribed" element={<ChannelsList />} />
        <Route path="/youtube/channels/watch-later" element={<ChannelsList />} />
        <Route path="/youtube/channels/:channelId/watch-later" element={<ChannelWatchLater />} />
        <Route path="/youtube/channels/:channelId/latest" element={<ChannelLatest />} />
        <Route path="/youtube/channels/:channelId/liked" element={<ChannelLiked />} />
        <Route path="/youtube/channels/:channelId" element={<Navigate to="watch-later" replace />} />
        <Route path="/youtube/channel-lists" element={<ChannelGroups />} />
        <Route path="/youtube/channel-lists/:id/inbox" element={<ChannelGroupDetail />} />
        <Route path="/youtube/channel-lists/:id/feed" element={<ChannelGroupDetail />} />
        <Route path="/youtube/channel-lists/:id/archive" element={<ChannelGroupDetail />} />
        <Route path="/youtube/channel-lists/:id/latest" element={<ChannelGroupDetail />} />
        <Route path="/youtube/channel-lists/:id/liked" element={<ChannelGroupDetail />} />
        <Route path="/youtube/channel-lists/:id" element={<Navigate to="inbox" replace />} />
        
        {/* Media routes */}
        <Route path="/media/dashboard" element={<Navigate to="/media/movies/dashboard" replace />} />
        <Route path="/media/movies/dashboard" element={<MoviesDashboard />} />
        <Route path="/media/tv-shows/dashboard" element={<TVShowsDashboard />} />
        <Route path="/media/calendar" element={<Calendar />} />
        <Route path="/media/movies/all" element={<MoviesList />} />
        <Route path="/media/movies" element={<Navigate to="/media/movies/dashboard" replace />} />
        <Route path="/media/movies/:id" element={<MovieDetail />} />
        <Route path="/media/tv-shows/upcoming" element={<Upcoming />} />
        <Route path="/media/tv-shows/list" element={<TVShowsList />} />
        <Route path="/media/tv-shows/recently-aired" element={<RecentlyAired />} />
        <Route path="/media/tv-shows/:id" element={<TVShowDetail />} />
        <Route path="/media/tv-shows" element={<Navigate to="/media/tv-shows/dashboard" replace />} />
        <Route path="/media/starred" element={<MediaStarred />} />
        <Route path="/media/watch-next" element={<Navigate to="/media/starred" replace />} />
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
        <Route path="/movies" element={<Navigate to="/media/movies/dashboard" replace />} />
        <Route path="/movies/:id" element={<Navigate to="/media/movies/:id" replace />} />
        <Route path="/tv-shows/*" element={<Navigate to="/media/tv-shows" replace />} />
        <Route path="/upcoming" element={<Navigate to="/media/tv-shows/upcoming" replace />} />
        <Route path="/watch-next" element={<Navigate to="/youtube/watch-next" replace />} />
        <Route path="/tags" element={<Navigate to="/youtube/tags" replace />} />
        <Route path="/playlists" element={<Navigate to="/media/playlists" replace />} />
        <Route path="/playlists/:id" element={<PlaylistRedirect />} />
        <Route path="/channel-lists" element={<Navigate to="/youtube/channel-lists" replace />} />
        <Route path="/channel-lists/:id/*" element={<ChannelGroupRedirect />} />
        
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
