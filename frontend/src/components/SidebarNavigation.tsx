import { Link, useLocation } from 'react-router'
import { Youtube, Tv, Film, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarNavigationProps {
  onNavigate?: () => void
}

export function SidebarNavigation({ onNavigate }: SidebarNavigationProps) {
  const location = useLocation()

  const getActiveSection = () => {
    if (location.pathname.startsWith('/youtube')) return 'youtube'
    if (location.pathname.startsWith('/media/tv-shows')) return 'tv-shows'
    if (location.pathname.startsWith('/media/movies')) return 'movies'
    // Handle other media routes
    if (location.pathname.startsWith('/media/calendar')) return 'tv-shows' // Calendar is for TV shows
    if (location.pathname.startsWith('/media/playlists')) return 'movies' // Playlists are for movies
    if (location.pathname.startsWith('/media/watch-next')) return 'movies' // Watch next is for movies
    return null
  }

  const isActive = (path: string) => {
    const activeSection = getActiveSection()
    if (path === '/youtube') {
      return activeSection === 'youtube'
    }
    if (path === '/media/tv-shows') {
      return activeSection === 'tv-shows'
    }
    if (path === '/media/movies') {
      return activeSection === 'movies'
    }
    return location.pathname === path
  }

  const navItems = [
    {
      label: 'YouTube',
      icon: Youtube,
      path: '/youtube/dashboard',
      activePath: '/youtube',
    },
    {
      label: 'TV Shows',
      icon: Tv,
      path: '/media/tv-shows/list',
      activePath: '/media/tv-shows',
    },
    {
      label: 'Movies',
      icon: Film,
      path: '/media/movies/all',
      activePath: '/media/movies',
    },
  ]

  return (
    <aside
      className={cn(
        'bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col h-full w-16'
      )}
    >
      {/* Navigation Items */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.activePath)
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                'flex items-center justify-center px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                'focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-2 focus:ring-offset-sidebar',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground'
              )}
              title={item.label}
            >
              <Icon className="h-5 w-5 shrink-0" />
            </Link>
          )
        })}
      </nav>

      {/* Settings Link */}
      <div className="border-t border-sidebar-border p-2">
        <Link
          to="/settings"
          onClick={onNavigate}
          className={cn(
            'flex items-center justify-center px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200',
            'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            'focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-2 focus:ring-offset-sidebar',
            location.pathname === '/settings'
              ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
              : 'text-sidebar-foreground'
          )}
          title="Settings"
        >
          <Settings className="h-5 w-5 shrink-0" />
        </Link>
      </div>
    </aside>
  )
}
