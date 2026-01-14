import { ReactNode } from 'react'
import { SidebarNavigation } from './SidebarNavigation'
import { SecondaryNavigation } from './SecondaryNavigation'
import { MobileMenu } from './MobileMenu'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile Menu - Only visible on mobile */}
      <div className="md:hidden">
        <MobileMenu />
      </div>

      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:block h-full">
        <SidebarNavigation />
      </div>

      {/* Secondary Navigation and Main Content */}
      <div className="flex flex-1 overflow-hidden h-full">
        {/* Secondary Navigation - Hidden on mobile */}
        <div className="hidden lg:block h-full">
          <SecondaryNavigation />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
