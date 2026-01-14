import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Radio, Tv, Film, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/lib/utils'

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

interface SidebarNavigationProps {
  onNavigate?: () => void
}

export function SidebarNavigation({ onNavigate }: SidebarNavigationProps) {
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(isCollapsed))
  }, [isCollapsed])

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  const isActive = (path: string) => {
    if (path === '/youtube') {
      return location.pathname.startsWith('/youtube')
    }
    if (path === '/media/tv-shows') {
      return location.pathname.startsWith('/media/tv-shows')
    }
    if (path === '/media/movies') {
      return location.pathname.startsWith('/media/movies')
    }
    return location.pathname === path
  }

  const navItems = [
    {
      label: 'YouTube',
      icon: Radio,
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
      path: '/media/movies',
      activePath: '/media/movies',
    },
  ]

  return (
    <aside
      className={cn(
        'bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col h-full',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-sidebar-foreground">
            Dashboard
          </h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapse}
          className="ml-auto h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

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
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                'focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-2 focus:ring-offset-sidebar',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground',
                isCollapsed && 'justify-center'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
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
            'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200',
            'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            'focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-2 focus:ring-offset-sidebar',
            location.pathname === '/settings'
              ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
              : 'text-sidebar-foreground',
            isCollapsed && 'justify-center'
          )}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  )
}
