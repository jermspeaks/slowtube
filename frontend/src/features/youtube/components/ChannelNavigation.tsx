import { NavLink, useParams } from 'react-router-dom'

export default function ChannelNavigation() {
  const { channelId } = useParams<{ channelId: string }>()

  if (!channelId) return null

  const tabs = [
    { key: 'watch_later', label: 'Watch Later Videos', path: `/youtube/channels/${channelId}/watch-later` },
    { key: 'latest', label: 'Latest Videos', path: `/youtube/channels/${channelId}/latest` },
    { key: 'liked', label: 'Liked Videos', path: `/youtube/channels/${channelId}/liked` },
  ]

  return (
    <div className="bg-card rounded-lg shadow-sm mb-6">
      <div className="border-b border-border">
        <nav className="flex -mb-px">
          {tabs.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.path}
              className={({ isActive }) =>
                `px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}

