import { Link, useLocation } from 'react-router-dom'
import { Tv, ChevronDown, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function Navbar() {
  const location = useLocation()

  return (
    <nav className="bg-white border-b border-border px-6 py-4 shadow-sm">
      <div className="max-w-[1400px] mx-auto flex items-center gap-6">
        {/* Home Button with TV Icon */}
        <Link to="/dashboard">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Tv className="h-5 w-5" />
            <span className="sr-only">Home</span>
          </Button>
        </Link>

        {/* Views Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              Views
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem asChild>
              <Link to="/grouped" className="w-full">
                Grouped View
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Stats Link */}
        <Link to="/stats">
          <Button
            variant="ghost"
            className={`gap-2 ${location.pathname === '/stats' ? 'bg-accent' : ''}`}
          >
            Stats
          </Button>
        </Link>

        {/* Settings Link */}
        <Link to="/settings">
          <Button
            variant="ghost"
            className={`gap-2 ${location.pathname === '/settings' ? 'bg-accent' : ''}`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </Link>
      </div>
    </nav>
  )
}

