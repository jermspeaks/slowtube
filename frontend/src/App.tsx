import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Dashboard from './pages/Dashboard'
import WatchLater from './pages/WatchLater'
import Stats from './pages/Stats'
import GroupedView from './pages/GroupedView'
import Settings from './pages/Settings'
import ChannelsList from './pages/ChannelsList'
import ChannelWatchLater from './pages/ChannelWatchLater'
import ChannelLatest from './pages/ChannelLatest'
import ChannelLiked from './pages/ChannelLiked'
import Calendar from './pages/Calendar'
import MoviesList from './pages/MoviesList'
import MovieDetail from './pages/MovieDetail'
import TVShowsList from './pages/TVShowsList'
import TVShowDetail from './pages/TVShowDetail'
import Upcoming from './pages/Upcoming'
import RecentlyAired from './pages/RecentlyAired'
import WatchNext from './pages/WatchNext'
import Tags from './pages/Tags'
import MoviePlaylists from './pages/MoviePlaylists'
import MoviePlaylistDetail from './pages/MoviePlaylistDetail'
import ChannelLists from './pages/ChannelLists'
import ChannelListDetail from './pages/ChannelListDetail'
import { Navbar } from './components/Navbar'
import { useTheme } from './hooks/useTheme'
import { Toaster } from './components/ui/sonner'

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
      <Navbar />
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/youtube/watch-later" element={<WatchLater />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/grouped" element={<GroupedView />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/channels/subscribed" element={<ChannelsList />} />
        <Route path="/channels/watch-later" element={<ChannelsList />} />
        <Route path="/channels/:channelId/watch-later" element={<ChannelWatchLater />} />
        <Route path="/channels/:channelId/latest" element={<ChannelLatest />} />
        <Route path="/channels/:channelId/liked" element={<ChannelLiked />} />
        <Route path="/channels/:channelId" element={<Navigate to="watch-later" replace />} />
        <Route path="/movies" element={<MoviesList />} />
        <Route path="/movies/:id" element={<MovieDetail />} />
        <Route path="/tv-shows/upcoming" element={<Upcoming />} />
        <Route path="/tv-shows/list" element={<TVShowsList />} />
        <Route path="/tv-shows/recently-aired" element={<RecentlyAired />} />
        <Route path="/tv-shows/:id" element={<TVShowDetail />} />
        <Route path="/tv-shows" element={<Navigate to="/tv-shows/list" replace />} />
        <Route path="/upcoming" element={<Navigate to="/tv-shows/upcoming" replace />} />
        <Route path="/watch-next" element={<WatchNext />} />
        <Route path="/tags" element={<Tags />} />
        <Route path="/playlists" element={<MoviePlaylists />} />
        <Route path="/playlists/:id" element={<MoviePlaylistDetail />} />
        <Route path="/channel-lists" element={<ChannelLists />} />
        <Route path="/channel-lists/:id" element={<ChannelListDetail />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
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

