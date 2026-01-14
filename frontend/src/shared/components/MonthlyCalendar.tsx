import { Episode } from '../../features/media/types/episode'
import EpisodeCard from '../../features/media/components/EpisodeCard'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { useTimezone } from '../hooks/useTimezone'

interface MonthlyCalendarProps {
  episodes: Episode[]
  currentDate: Date
  onDateChange: (date: Date) => void
  onUpdate: () => void
}

function MonthlyCalendar({ episodes, currentDate, onDateChange, onUpdate }: MonthlyCalendarProps) {
  const { getDateKey } = useTimezone()
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const episodesByDate: Record<string, Episode[]> = {}
  episodes.forEach(episode => {
    if (episode.air_date) {
      // Convert UTC air_date to timezone-aware date key
      const dateKey = getDateKey(episode.air_date)
      if (!episodesByDate[dateKey]) {
        episodesByDate[dateKey] = []
      }
      episodesByDate[dateKey].push(episode)
    }
  })

  const goToPreviousMonth = () => {
    onDateChange(subMonths(currentDate, 1))
  }

  const goToNextMonth = () => {
    onDateChange(addMonths(currentDate, 1))
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={goToPreviousMonth}
            className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors"
          >
            ← Previous
          </button>
          <h2 className="text-lg font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button
            onClick={goToNextMonth}
            className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors"
          >
            Next →
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors"
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {/* Week day headers */}
        {weekDays.map(day => (
          <div key={day} className="text-center font-semibold text-foreground py-2">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayEpisodes = episodesByDate[dateKey] || []
          const isToday = isSameDay(day, new Date())
          const isCurrentMonth = isSameMonth(day, currentDate)

          return (
            <div
              key={dateKey}
              className={`min-h-[120px] border border-border rounded p-2 ${
                !isCurrentMonth ? 'bg-muted opacity-50' : 'bg-card'
              } ${isToday ? 'ring-2 ring-primary' : ''}`}
            >
              <div className={`text-sm font-semibold mb-1 ${
                isToday ? 'text-primary' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {dayEpisodes.slice(0, 3).map(episode => (
                  <div
                    key={episode.id}
                    className={`text-xs p-1 rounded truncate ${
                      episode.is_watched === 1 ? 'bg-muted text-muted-foreground' : 'bg-primary/20 text-primary'
                    }`}
                    title={`${episode.tv_show_title} - S${episode.season_number}E${episode.episode_number}`}
                  >
                    {episode.tv_show_title}
                  </div>
                ))}
                {dayEpisodes.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayEpisodes.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Episode details modal/list for clicked day */}
      <div className="mt-4">
        <h3 className="text-md font-semibold mb-2">Episodes this month</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {episodes.map(episode => (
            <EpisodeCard
              key={episode.id}
              episode={episode}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default MonthlyCalendar

