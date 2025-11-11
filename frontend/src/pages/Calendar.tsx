import { useState, useEffect } from 'react'
import { calendarAPI } from '../services/api'
import { Episode } from '../types/episode'
import { CalendarView } from '../types/calendar'
import WeeklyCalendar from '../components/WeeklyCalendar'
import MonthlyCalendar from '../components/MonthlyCalendar'
import DailyCalendar from '../components/DailyCalendar'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, format } from 'date-fns'

function Calendar() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<CalendarView>('weekly')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [hideArchived, setHideArchived] = useState(false)

  useEffect(() => {
    loadEpisodes()
  }, [currentDate, view, hideArchived])

  const loadEpisodes = async () => {
    try {
      setLoading(true)
      
      // Calculate date range based on view
      let startDate: Date
      let endDate: Date

      if (view === 'weekly') {
        startDate = startOfWeek(currentDate, { weekStartsOn: 0 })
        endDate = endOfWeek(currentDate, { weekStartsOn: 0 })
      } else if (view === 'monthly') {
        startDate = startOfMonth(currentDate)
        endDate = endOfMonth(currentDate)
      } else { // daily
        startDate = startOfDay(currentDate)
        endDate = endOfDay(currentDate)
      }

      // For monthly view, extend range to show full calendar grid
      if (view === 'monthly') {
        const weekStart = startOfWeek(startDate, { weekStartsOn: 0 })
        const weekEnd = endOfWeek(endDate, { weekStartsOn: 0 })
        startDate = weekStart
        endDate = weekEnd
      }

      const response = await calendarAPI.getEpisodes(
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd'),
        hideArchived
      )

      // Flatten episodes from grouped object
      const allEpisodes: Episode[] = []
      Object.values(response.episodes).forEach(dayEpisodes => {
        allEpisodes.push(...dayEpisodes)
      })

      setEpisodes(allEpisodes)
    } catch (error) {
      console.error('Error loading episodes:', error)
      alert('Failed to load episodes')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = () => {
    loadEpisodes()
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h1 className="text-2xl font-bold">TV Show Calendar</h1>
          
          <div className="flex items-center gap-4">
            {/* View toggle */}
            <div className="flex border border-gray-300 rounded overflow-hidden">
              <button
                onClick={() => setView('monthly')}
                className={`px-4 py-2 text-sm font-medium ${
                  view === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setView('weekly')}
                className={`px-4 py-2 text-sm font-medium border-l border-gray-300 ${
                  view === 'weekly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setView('daily')}
                className={`px-4 py-2 text-sm font-medium border-l border-gray-300 ${
                  view === 'daily'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Daily
              </button>
            </div>

            {/* Hide archived toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideArchived}
                onChange={(e) => setHideArchived(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Hide archived</span>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-[60px] px-5 bg-white rounded-lg">
            <div className="text-lg text-gray-500">Loading episodes...</div>
          </div>
        ) : (
          <>
            {view === 'weekly' && (
              <WeeklyCalendar
                episodes={episodes}
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                onUpdate={handleUpdate}
              />
            )}
            {view === 'monthly' && (
              <MonthlyCalendar
                episodes={episodes}
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                onUpdate={handleUpdate}
              />
            )}
            {view === 'daily' && (
              <DailyCalendar
                episodes={episodes}
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                onUpdate={handleUpdate}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default Calendar

