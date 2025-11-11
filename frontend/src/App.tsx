import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Stats from './pages/Stats'
import GroupedView from './pages/GroupedView'
import Settings from './pages/Settings'
import ChannelsList from './pages/ChannelsList'
import ChannelDetail from './pages/ChannelDetail'
import Calendar from './pages/Calendar'
import MoviesList from './pages/MoviesList'
import TVShowsList from './pages/TVShowsList'
import { Navbar } from './components/Navbar'

function AppContent() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/grouped" element={<GroupedView />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/channels/subscribed" element={<ChannelsList />} />
        <Route path="/channels/watch-later" element={<ChannelsList />} />
        <Route path="/channels/:channelId" element={<ChannelDetail />} />
        <Route path="/movies" element={<MoviesList />} />
        <Route path="/tv-shows" element={<TVShowsList />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
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

