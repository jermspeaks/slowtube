import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { videosAPI } from '../services/api'
import DateRangeFilter from '@/shared/components/DateRangeFilter'

interface ChannelRanking {
  rank: number
  channel_title: string
  count: number
}

interface TimeStat {
  hour?: number
  day_of_week?: number
  day_name?: string
  month?: number
  month_name?: string
  count: number
}

interface StatsData {
  channelRankings: ChannelRanking[]
  timeStats: {
    byHour: TimeStat[]
    byDayOfWeek: TimeStat[]
    byMonth: TimeStat[]
  }
  channelList: string[]
  totalDuration: {
    seconds: number
    months: number
    days: number
    hours: number
    minutes: number
    seconds_remainder: number
    formatted: string
  }
}

function Stats() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateField, setDateField] = useState<'added_to_playlist_at' | 'published_at' | null>(null)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const statsData = await videosAPI.getStats(
        dateField || undefined,
        startDate || undefined,
        endDate || undefined
      )
      setStats(statsData)
    } catch (err: any) {
      console.error('Error loading stats:', err)
      setError(err.response?.data?.error || 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateField, startDate, endDate])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div>Loading stats...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="bg-destructive/20 border border-destructive/50 text-destructive px-4 py-3 rounded">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">No stats available</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-6 pb-6">
        <h2 className="text-2xl font-bold mb-6">Statistics</h2>

        {/* Date Range Filter */}
        <div className="bg-card rounded-lg p-4 border border-border shadow-sm mb-6">
          <DateRangeFilter
            dateField={dateField}
            onDateFieldChange={setDateField}
            startDate={startDate}
            onStartDateChange={setStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
          />
        </div>

        {/* Total Duration */}
        <div className="bg-card rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">Total Watch Time</h3>
          <div className="text-3xl font-bold text-primary">
            {stats.totalDuration.formatted}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Based on {stats.channelRankings.reduce((sum, r) => sum + r.count, 0)} videos with duration information
          </p>
        </div>

        {/* Channel Rankings */}
        <div className="bg-card rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">Top Channels</h3>
          {stats.channelRankings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="p-3 text-left">Rank</th>
                    <th className="p-3 text-left">Channel</th>
                    <th className="p-3 text-right">Videos</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.channelRankings.slice(0, 20).map((ranking) => (
                    <tr key={ranking.rank} className="border-b border-border hover:bg-accent transition-colors">
                      <td className="p-3 font-semibold">#{ranking.rank}</td>
                      <td className="p-3">{ranking.channel_title}</td>
                      <td className="p-3 text-right">{ranking.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {stats.channelRankings.length > 20 && (
                <p className="text-sm text-muted-foreground mt-4">
                  Showing top 20 of {stats.channelRankings.length} channels
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">No channel data available</p>
          )}
        </div>

        {/* Time Statistics - Hour */}
        <div className="bg-card rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">Videos Added by Hour of Day</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.timeStats.byHour}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="hour" 
                label={{ value: 'Hour (24-hour format)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis label={{ value: 'Number of Videos', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Videos" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-2 text-left">Hour</th>
                  <th className="p-2 text-right">Count</th>
                </tr>
              </thead>
              <tbody>
                {stats.timeStats.byHour.map((stat) => (
                  <tr key={stat.hour} className="border-b border-border hover:bg-accent transition-colors">
                    <td className="p-2">{stat.hour}:00</td>
                    <td className="p-2 text-right">{stat.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Time Statistics - Day of Week */}
        <div className="bg-card rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">Videos Added by Day of Week</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.timeStats.byDayOfWeek}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="day_name"
                label={{ value: 'Day of Week', position: 'insideBottom', offset: -5 }}
              />
              <YAxis label={{ value: 'Number of Videos', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#10b981" name="Videos" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-2 text-left">Day</th>
                  <th className="p-2 text-right">Count</th>
                </tr>
              </thead>
              <tbody>
                {stats.timeStats.byDayOfWeek.map((stat) => (
                  <tr key={stat.day_of_week} className="border-b border-border hover:bg-accent transition-colors">
                    <td className="p-2">{stat.day_name}</td>
                    <td className="p-2 text-right">{stat.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Time Statistics - Month */}
        <div className="bg-card rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">Videos Added by Month</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.timeStats.byMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month_name"
                label={{ value: 'Month', position: 'insideBottom', offset: -5 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis label={{ value: 'Number of Videos', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8b5cf6" name="Videos" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-2 text-left">Month</th>
                  <th className="p-2 text-right">Count</th>
                </tr>
              </thead>
              <tbody>
                {stats.timeStats.byMonth.map((stat) => (
                  <tr key={stat.month} className="border-b border-border hover:bg-accent transition-colors">
                    <td className="p-2">{stat.month_name}</td>
                    <td className="p-2 text-right">{stat.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* All Channels */}
        <div className="bg-card rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">All Channels ({stats.channelList.length})</h3>
          {stats.channelList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
              {stats.channelList.map((channel, index) => (
                <div key={index} className="p-2 bg-muted rounded hover:bg-accent transition-colors">
                  {channel}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No channels found</p>
          )}
        </div>
      </main>
    </div>
  )
}

export default Stats

