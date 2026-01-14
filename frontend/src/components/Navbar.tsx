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
  List,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/shared/components/ui/dropdown-menu'

export function Navbar() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path: string) => location.pathname === path
  
  const isYouTubeActive = () => {
    return location.pathname.startsWith('/youtube')
  }

  const isMediaActive = () => {
    return location.pathname.startsWith('/media')
  }

  const MobileNavLink = ({ to, icon: Icon, children, onClick }: { to: string; icon: any; children: React.ReactNode; onClick?: () => void }) => (
    <Link
      to={to}
      onClick={() => {
        setMobileMenuOpen(false)
        onClick?.()
      }}
      className={`flex items-center gap-3 px-4 py-3 text-sm rounded-md transition-colors ${
        location.pathname.startsWith(to) ? 'bg-accent' : 'hover:bg-accent'
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
                    isYouTubeActive() || isMediaActive()
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
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className={isYouTubeActive() ? 'bg-accent' : ''}>
                    <Radio className="h-4 w-4" />
                    YouTube
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem asChild>
                      <Link to="/youtube/dashboard" className="w-full flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Home
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/youtube/watch-later" className="w-full">
                        Feed
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/youtube/channels/subscribed" className="w-full">
                        Subscribed Channels
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/youtube/channels/watch-later" className="w-full">
                        Watch Later Channels
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/youtube/channel-lists" className="w-full flex items-center gap-2">
                        <List className="h-4 w-4" />
                        Channel Lists
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className={isMediaActive() ? 'bg-accent' : ''}>
                    <Film className="h-4 w-4" />
                    Media
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem asChild>
                      <Link to="/media/dashboard" className="w-full flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/media/movies" className="w-full flex items-center gap-2">
                        <Film className="h-4 w-4" />
                        Movies
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Tv className="h-4 w-4" />
                        TV Shows
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem asChild>
                          <Link to="/media/tv-shows/upcoming" className="w-full flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Upcoming
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/media/tv-shows/list" className="w-full">
                            List
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/media/tv-shows/recently-aired" className="w-full">
                            Recently Aired
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem asChild>
                      <Link to="/media/playlists" className="w-full flex items-center gap-2">
                        <List className="h-4 w-4" />
                        Playlists
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/media/calendar" className="w-full">
                        Calendar
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Organize Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`gap-2 ${
                    ['/youtube/grouped', '/youtube/stats', '/youtube/tags', '/media/playlists'].some(path => location.pathname.startsWith(path))
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
                  <Link to="/media/playlists" className="w-full flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Playlists
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/youtube/grouped" className="w-full flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Grouped View
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/youtube/stats" className="w-full flex items-center gap-2">
                    <BarChart className="h-4 w-4" />
                    Stats
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/youtube/tags" className="w-full flex items-center gap-2">
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
                    location.pathname.startsWith('/youtube/watch-next') || location.pathname.startsWith('/media/watch-next') ? 'bg-accent' : ''
                  }`}
                >
                  <PlayCircle className="h-4 w-4" />
                  Watch
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link to="/youtube/watch-next" className="w-full flex items-center gap-2">
                    <Radio className="h-4 w-4" />
                    YouTube Inbox
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/media/watch-next" className="w-full flex items-center gap-2">
                    <Film className="h-4 w-4" />
                    Media Watch Next
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
            <Link to="/youtube/dashboard">
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
                    <div className="px-4 py-2">
                      <div className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Radio className="h-4 w-4" />
                        YouTube
                      </div>
                      <div className="pl-6 space-y-1">
                        <MobileNavLink to="/youtube/dashboard" icon={Home}>
                          Home
                        </MobileNavLink>
                        <MobileNavLink to="/youtube/watch-later" icon={Radio}>
                          Feed
                        </MobileNavLink>
                        <MobileNavLink to="/youtube/channels/subscribed" icon={Radio}>
                          Subscribed Channels
                        </MobileNavLink>
                        <MobileNavLink to="/youtube/channels/watch-later" icon={Radio}>
                          Watch Later Channels
                        </MobileNavLink>
                        <MobileNavLink to="/youtube/channel-lists" icon={List}>
                          Channel Lists
                        </MobileNavLink>
                      </div>
                    </div>
                    <div className="px-4 py-2">
                      <div className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Film className="h-4 w-4" />
                        Media
                      </div>
                      <div className="pl-6 space-y-1">
                        <MobileNavLink to="/media/dashboard" icon={Home}>
                          Dashboard
                        </MobileNavLink>
                        <MobileNavLink to="/media/movies" icon={Film}>
                          Movies
                        </MobileNavLink>
                        <div className="pl-4 space-y-1">
                          <MobileNavLink to="/media/tv-shows/upcoming" icon={Clock}>
                            TV Shows - Upcoming
                          </MobileNavLink>
                          <MobileNavLink to="/media/tv-shows/list" icon={Tv}>
                            TV Shows - List
                          </MobileNavLink>
                          <MobileNavLink to="/media/tv-shows/recently-aired" icon={Clock}>
                            TV Shows - Recently Aired
                          </MobileNavLink>
                        </div>
                        <MobileNavLink to="/media/playlists" icon={List}>
                          Playlists
                        </MobileNavLink>
                        <MobileNavLink to="/media/calendar" icon={Clock}>
                          Calendar
                        </MobileNavLink>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
                    Organize
                  </h3>
                  <div className="space-y-1">
                    <MobileNavLink to="/media/playlists" icon={List}>
                      Playlists
                    </MobileNavLink>
                    <MobileNavLink to="/youtube/grouped" icon={Layers}>
                      Grouped View
                    </MobileNavLink>
                    <MobileNavLink to="/youtube/stats" icon={BarChart}>
                      Stats
                    </MobileNavLink>
                    <MobileNavLink to="/youtube/tags" icon={Tag}>
                      Tags
                    </MobileNavLink>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
                    Watch
                  </h3>
                  <div className="space-y-1">
                    <MobileNavLink to="/youtube/watch-next" icon={Radio}>
                      YouTube Inbox
                    </MobileNavLink>
                    <MobileNavLink to="/media/watch-next" icon={Film}>
                      Media Watch Next
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
