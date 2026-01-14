import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Clock,
  Radio,
  List,
  BarChart,
  Tag,
  PlayCircle,
  Tv,
  Film,
  Calendar,
  TrendingUp,
  Archive,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  path: string
  badge?: number
}

interface NavGroup {
  label: string
  items: NavItem[]
}

export function SecondaryNavigation() {
  const location = useLocation()

  // Save scroll position before navigation
  // Save for both current route (for when returning) and destination route (for optimistic UI)
  const handleLinkClick = (destinationPath: string) => {
    const container = document.querySelector('main.flex-1.overflow-y-auto') as HTMLElement | null
    if (container) {
      const currentScrollKey = `scrollPos:${location.pathname}`
      const destinationScrollKey = `scrollPos:${destinationPath}`
      const scrollTop = container.scrollTop.toString()
      
      // Save for current route (so we can restore when coming back)
      sessionStorage.setItem(currentScrollKey, scrollTop)
      
      // Also save for destination route (optimistic UI - maintain scroll position)
      // This allows the destination page to restore to the same scroll position
      sessionStorage.setItem(destinationScrollKey, scrollTop)
    }
  }

  const getActiveSection = () => {
    if (location.pathname.startsWith('/youtube')) return 'youtube'
    if (location.pathname.startsWith('/media/tv-shows')) return 'tv-shows'
    if (location.pathname.startsWith('/media/movies')) return 'movies'
    // Handle other media routes
    if (location.pathname.startsWith('/media/calendar')) return 'tv-shows' // Calendar is for TV shows
    if (location.pathname.startsWith('/media/playlists')) return 'movies' // Playlists are for movies
    if (location.pathname.startsWith('/media/watch-next')) return 'movies' // Watch next is for movies
    if (location.pathname.startsWith('/media/dashboard')) return 'movies' // Dashboard shows both, default to movies
    return null
  }

  const isActive = (path: string) => {
    if (path.endsWith('/*')) {
      const basePath = path.replace('/*', '')
      return location.pathname.startsWith(basePath)
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  const youtubeNav: NavGroup[] = [
    {
      label: 'Main',
      items: [
        {
          label: 'Home',
          icon: Home,
          path: '/youtube/dashboard',
        },
        {
          label: 'Feed',
          icon: Clock,
          path: '/youtube/watch-later',
        },
        {
          label: 'Inbox',
          icon: PlayCircle,
          path: '/youtube/watch-next',
        },
        {
          label: 'Archive',
          icon: Archive,
          path: '/youtube/archive',
        },
      ],
    },
    {
      label: 'Channels',
      items: [
        {
          label: 'Subscribed',
          icon: Radio,
          path: '/youtube/channels/subscribed',
        },
        {
          label: 'Watch Later',
          icon: Clock,
          path: '/youtube/channels/watch-later',
        },
        {
          label: 'Channel Lists',
          icon: List,
          path: '/youtube/channel-lists',
        },
      ],
    },
    {
      label: 'Organize',
      items: [
        {
          label: 'Stats',
          icon: BarChart,
          path: '/youtube/stats',
        },
        {
          label: 'Tags',
          icon: Tag,
          path: '/youtube/tags',
        },
        {
          label: 'Grouped View',
          icon: List,
          path: '/youtube/grouped',
        },
      ],
    },
  ]

  const tvShowsNav: NavGroup[] = [
    {
      label: 'Main',
      items: [
        {
          label: 'Dashboard',
          icon: Home,
          path: '/media/dashboard',
        },
        {
          label: 'List',
          icon: List,
          path: '/media/tv-shows/list',
        },
        {
          label: 'Upcoming',
          icon: TrendingUp,
          path: '/media/tv-shows/upcoming',
        },
        {
          label: 'Recently Aired',
          icon: Clock,
          path: '/media/tv-shows/recently-aired',
        },
        {
          label: 'Calendar',
          icon: Calendar,
          path: '/media/calendar',
        },
      ],
    },
  ]

  const moviesNav: NavGroup[] = [
    {
      label: 'Main',
      items: [
        {
          label: 'Dashboard',
          icon: Home,
          path: '/media/dashboard',
        },
        {
          label: 'All Movies',
          icon: Film,
          path: '/media/movies',
        },
        {
          label: 'Playlists',
          icon: List,
          path: '/media/playlists',
        },
        {
          label: 'Watch Next',
          icon: PlayCircle,
          path: '/media/watch-next',
        },
      ],
    },
  ]

  const getNavigation = () => {
    const section = getActiveSection()
    switch (section) {
      case 'youtube':
        return youtubeNav
      case 'tv-shows':
        return tvShowsNav
      case 'movies':
        return moviesNav
      default:
        return []
    }
  }

  const navigation = getNavigation()

  if (navigation.length === 0) {
    return null
  }

  return (
    <aside className="w-64 bg-muted/30 border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          {getActiveSection() === 'youtube' && 'YouTube'}
          {getActiveSection() === 'tv-shows' && 'TV Shows'}
          {getActiveSection() === 'movies' && 'Movies'}
        </h3>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-6">
          {navigation.map((group) => (
            <div key={group.label}>
              <h4 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </h4>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.path)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => handleLinkClick(item.path)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                        'hover:bg-accent hover:text-accent-foreground',
                        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                        active
                          ? 'bg-accent text-accent-foreground shadow-sm'
                          : 'text-muted-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  )
}
