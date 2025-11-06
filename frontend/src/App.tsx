import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Stats from './pages/Stats'
import GroupedView from './pages/GroupedView'
import Settings from './pages/Settings'
import ChannelsList from './pages/ChannelsList'
import ChannelDetail from './pages/ChannelDetail'
import { Navbar } from './components/Navbar'

function AppContent() {
  const location = useLocation()
  const showNavbar = location.pathname !== '/login'

  return (
    <>
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/grouped" element={<GroupedView />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/channels/subscribed" element={<ChannelsList />} />
        <Route path="/channels/watch-later" element={<ChannelsList />} />
        <Route path="/channels/:channelId" element={<ChannelDetail />} />
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

