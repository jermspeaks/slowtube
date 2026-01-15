import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, Youtube, Tv, Film, Settings } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet'
import { cn } from '@/lib/utils'

export function MobileMenu() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

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
      path: '/media/movies',
      activePath: '/media/movies',
    },
  ]

  const handleNavigate = () => {
    setOpen(false)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 h-10 w-10"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="px-4 py-4 border-b">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>

          <nav className="flex-1 py-4 px-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.activePath)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleNavigate}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="border-t p-2">
            <Link
              to="/settings"
              onClick={handleNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200',
                'hover:bg-accent hover:text-accent-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                location.pathname === '/settings'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-foreground'
              )}
            >
              <Settings className="h-5 w-5 shrink-0" />
              <span>Settings</span>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
