import { Episode } from '../types/episode'
import EpisodeCard from './EpisodeCard'
import { format, isSameDay, addDays, subDays } from 'date-fns'
import { useTimezone } from '../hooks/useTimezone'

interface DailyCalendarProps {
  episodes: Episode[]
  currentDate: Date
  onDateChange: (date: Date) => void
  onUpdate: () => void
}

function DailyCalendar({ episodes, currentDate, onDateChange, onUpdate }: DailyCalendarProps) {
  const { getDateKey } = useTimezone()
  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const dayEpisodes = episodes.filter(episode => {
    if (!episode.air_date) return false
    // Convert UTC air_date to timezone-aware date key
    const episodeDate = getDateKey(episode.air_date)
    return episodeDate === dateKey
  })

  const goToPreviousDay = () => {
    onDateChange(subDays(currentDate, 1))
  }

  const goToNextDay = () => {
    onDateChange(addDays(currentDate, 1))
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  const isToday = isSameDay(currentDate, new Date())

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={goToPreviousDay}
            className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors"
          >
            ← Previous
          </button>
          <h2 className={`text-lg font-semibold ${isToday ? 'text-primary' : ''}`}>
            {format(currentDate, 'EEEE, MMMM d, yyyy')}
            {isToday && ' (Today)'}
          </h2>
          <button
            onClick={goToNextDay}
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

      {dayEpisodes.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg">
          <p className="text-muted-foreground">No episodes airing on this day</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {dayEpisodes.map(episode => (
            <EpisodeCard
              key={episode.id}
              episode={episode}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default DailyCalendar

