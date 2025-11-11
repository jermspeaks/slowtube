import { Episode } from '../types/episode'
import EpisodeCard from './EpisodeCard'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from 'date-fns'

interface WeeklyCalendarProps {
  episodes: Episode[]
  currentDate: Date
  onDateChange: (date: Date) => void
  onUpdate: () => void
}

function WeeklyCalendar({ episodes, currentDate, onDateChange, onUpdate }: WeeklyCalendarProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }) // Sunday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const episodesByDate: Record<string, Episode[]> = {}
  episodes.forEach(episode => {
    if (episode.air_date) {
      const dateKey = episode.air_date.split('T')[0]
      if (!episodesByDate[dateKey]) {
        episodesByDate[dateKey] = []
      }
      episodesByDate[dateKey].push(episode)
    }
  })

  const goToPreviousWeek = () => {
    onDateChange(subWeeks(currentDate, 1))
  }

  const goToNextWeek = () => {
    onDateChange(addWeeks(currentDate, 1))
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={goToPreviousWeek}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            ← Previous
          </button>
          <h2 className="text-lg font-semibold">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </h2>
          <button
            onClick={goToNextWeek}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {weekDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayEpisodes = episodesByDate[dateKey] || []
          const isToday = isSameDay(day, new Date())

          return (
            <div key={dateKey} className="space-y-2">
              <div className={`text-center font-semibold pb-2 border-b ${
                isToday ? 'text-blue-600 border-blue-600' : 'text-gray-700 border-gray-300'
              }`}>
                <div className="text-xs text-gray-500">{format(day, 'EEE')}</div>
                <div className="text-lg">{format(day, 'd')}</div>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {dayEpisodes.map(episode => (
                  <EpisodeCard
                    key={episode.id}
                    episode={episode}
                    onUpdate={onUpdate}
                  />
                ))}
                {dayEpisodes.length === 0 && (
                  <div className="text-xs text-gray-400 text-center py-4">
                    No episodes
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default WeeklyCalendar

