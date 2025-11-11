import { Episode } from './episode'

export type CalendarView = 'monthly' | 'weekly' | 'daily'

export interface CalendarEpisodes {
  [date: string]: Episode[]
}

export interface CalendarResponse {
  episodes: CalendarEpisodes
  total: number
}

