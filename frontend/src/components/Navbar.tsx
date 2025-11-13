import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Search,
  Folder,
  PlayCircle,
  Home,
  Film,
  Tv,
  Radio,
  Clock,
  Layers,
  BarChart,
  Tag,
  Settings,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'

export function Navbar() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path: string) => location.pathname === path

  const MobileNavLink = ({ to, icon: Icon, children, onClick }: { to: string; icon: any; children: React.ReactNode; onClick?: () => void }) => (
    <Link
      to={to}
      onClick={() => {
        setMobileMenuOpen(false)
        onClick?.()
      }}
      className={`flex items-center gap-3 px-4 py-3 text-sm rounded-md transition-colors ${
        isActive(to) ? 'bg-accent' : 'hover:bg-accent'
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  )

  return (
    <nav className="bg-background border-b border-border shadow-sm">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4">
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            {/* Discover Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`gap-2 ${
                    ['/dashboard', '/movies', '/tv-shows', '/channels', '/youtube', '/upcoming'].some(path =>
                      location.pathname.startsWith(path)
                    )
                      ? 'bg-accent'
                      : ''
                  }`}
                >
                  <Search className="h-4 w-4" />
                  Discover
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="w-full flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/movies" className="w-full flex items-center gap-2">
                    <Film className="h-4 w-4" />
                    Movies
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/tv-shows" className="w-full flex items-center gap-2">
                    <Tv className="h-4 w-4" />
                    TV Shows
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Radio className="h-4 w-4" />
                    YouTube
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem asChild>
                      <Link to="/youtube/watch-later" className="w-full">
                        Watch Later
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/channels/subscribed" className="w-full">
                        Subscribed Channels
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/channels/watch-later" className="w-full">
                        Watch Later Channels
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem asChild>
                  <Link to="/upcoming" className="w-full flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Upcoming
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Organize Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`gap-2 ${
                    ['/grouped', '/stats', '/tags'].some(path => location.pathname.startsWith(path))
                      ? 'bg-accent'
                      : ''
                  }`}
                >
                  <Folder className="h-4 w-4" />
                  Organize
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link to="/grouped" className="w-full flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Grouped View
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/stats" className="w-full flex items-center gap-2">
                    <BarChart className="h-4 w-4" />
                    Stats
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/tags" className="w-full flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Watch Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`gap-2 ${
                    location.pathname.startsWith('/watch-next') ? 'bg-accent' : ''
                  }`}
                >
                  <PlayCircle className="h-4 w-4" />
                  Watch
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link to="/watch-next" className="w-full flex items-center gap-2">
                    <PlayCircle className="h-4 w-4" />
                    Watch Next
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Settings Link */}
          <Link to="/settings">
            <Button
              variant="ghost"
              className={`gap-2 ${isActive('/settings') ? 'bg-accent' : ''}`}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Home className="h-5 w-5" />
                <span className="sr-only">Home</span>
              </Button>
            </Link>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-9 w-9"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="md:hidden fixed top-[73px] left-0 right-0 bottom-0 bg-background z-50 overflow-y-auto">
              <div className="p-4 space-y-2">
                <div className="mb-4">
                  <h3 className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
                    Discover
                  </h3>
                  <div className="space-y-1">
                    <MobileNavLink to="/dashboard" icon={Home}>
                      Dashboard
                    </MobileNavLink>
                    <MobileNavLink to="/movies" icon={Film}>
                      Movies
                    </MobileNavLink>
                    <MobileNavLink to="/tv-shows" icon={Tv}>
                      TV Shows
                    </MobileNavLink>
                    <MobileNavLink to="/youtube/watch-later" icon={Radio}>
                      Watch Later
                    </MobileNavLink>
                    <MobileNavLink to="/channels/subscribed" icon={Radio}>
                      Subscribed Channels
                    </MobileNavLink>
                    <MobileNavLink to="/channels/watch-later" icon={Radio}>
                      Watch Later Channels
                    </MobileNavLink>
                    <MobileNavLink to="/upcoming" icon={Clock}>
                      Upcoming
                    </MobileNavLink>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
                    Organize
                  </h3>
                  <div className="space-y-1">
                    <MobileNavLink to="/grouped" icon={Layers}>
                      Grouped View
                    </MobileNavLink>
                    <MobileNavLink to="/stats" icon={BarChart}>
                      Stats
                    </MobileNavLink>
                    <MobileNavLink to="/tags" icon={Tag}>
                      Tags
                    </MobileNavLink>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
                    Watch
                  </h3>
                  <div className="space-y-1">
                    <MobileNavLink to="/watch-next" icon={PlayCircle}>
                      Watch Next
                    </MobileNavLink>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <MobileNavLink to="/settings" icon={Settings}>
                    Settings
                  </MobileNavLink>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
  )
}

