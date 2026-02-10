import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { toast } from 'sonner'
import { tvShowsAPI } from '../services/api'
import type { DiscoveryTVShow } from '../types/tv-show'
import DiscoveryTVShowCard from '../components/DiscoveryTVShowCard'

function DiscoverySectionRow({
  title,
  shows,
  addedTmdbIds,
  addingId,
  onAdd,
}: {
  title: string
  shows: DiscoveryTVShow[]
  addedTmdbIds: Set<number>
  addingId: number | null
  onAdd: (tmdbId: number) => void
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScrollability = () => {
    if (!scrollContainerRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  useEffect(() => {
    checkScrollability()
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', checkScrollability)
      window.addEventListener('resize', checkScrollability)
      return () => {
        container.removeEventListener('scroll', checkScrollability)
        window.removeEventListener('resize', checkScrollability)
      }
    }
  }, [shows])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return
    const container = scrollContainerRef.current
    const scrollAmount = 300 * 2
    container.scrollTo({
      left: direction === 'left' ? container.scrollLeft - scrollAmount : container.scrollLeft + scrollAmount,
      behavior: 'smooth',
    })
  }

  if (shows.length === 0) return null

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">{title}</h2>
        <div className="hidden md:flex items-center gap-1">
          {canScrollLeft && (
            <Button variant="ghost" size="icon" onClick={() => scroll('left')} className="h-8 w-8" aria-label="Scroll left">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {canScrollRight && (
            <Button variant="ghost" size="icon" onClick={() => scroll('right')} className="h-8 w-8" aria-label="Scroll right">
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="relative">
        {canScrollLeft && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 bg-background/80 backdrop-blur-sm md:hidden"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth pb-4"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {shows.map((show) => (
            <div key={show.tmdb_id} className="shrink-0 w-[280px] md:w-[300px]" style={{ scrollSnapAlign: 'start' }}>
              <DiscoveryTVShowCard
                show={show}
                onAdd={onAdd}
                isAdding={addingId === show.tmdb_id}
                alreadyInList={addedTmdbIds.has(show.tmdb_id)}
              />
            </div>
          ))}
        </div>
        {canScrollRight && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 bg-background/80 backdrop-blur-sm md:hidden"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  )
}

function TVShowDiscovery() {
  const [trending, setTrending] = useState<DiscoveryTVShow[]>([])
  const [popular, setPopular] = useState<DiscoveryTVShow[]>([])
  const [onTheAir, setOnTheAir] = useState<DiscoveryTVShow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addedTmdbIds, setAddedTmdbIds] = useState<Set<number>>(new Set())
  const [addingId, setAddingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [discoverData, listResponse] = await Promise.all([
          tvShowsAPI.getDiscover(),
          tvShowsAPI.getAll(),
        ])
        if (cancelled) return
        setTrending(discoverData.trending ?? [])
        setPopular(discoverData.popular ?? [])
        setOnTheAir(discoverData.onTheAir ?? [])
        const list = listResponse?.tvShows ?? listResponse?.data ?? []
        const ids = new Set((Array.isArray(list) ? list : []).map((s: { tmdb_id?: number }) => s.tmdb_id).filter((id): id is number => id != null))
        setAddedTmdbIds(ids)
      } catch (e: unknown) {
        if (cancelled) return
        const message = e && typeof e === 'object' && 'response' in e && (e as { response?: { data?: { error?: string } } }).response?.data?.error
          ? (e as { response: { data: { error: string } } }).response.data.error
          : 'Failed to load discovery'
        setError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleAdd = async (tmdbId: number) => {
    setAddingId(tmdbId)
    try {
      await tvShowsAPI.create(tmdbId)
      setAddedTmdbIds((prev) => new Set(prev).add(tmdbId))
      toast.success('Added to your TV shows')
    } catch (e: unknown) {
      const status = e && typeof e === 'object' && 'response' in e ? (e as { response?: { status?: number } }).response?.status : 0
      if (status === 409) {
        setAddedTmdbIds((prev) => new Set(prev).add(tmdbId))
        toast.info('Already in your list')
      } else {
        const message = e && typeof e === 'object' && 'response' in e && (e as { response?: { data?: { error?: string } } }).response?.data?.error
          ? (e as { response: { data: { error: string } } }).response.data.error
          : 'Failed to add show'
        toast.error(message)
      }
    } finally {
      setAddingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16 bg-card rounded-lg">
        <div className="text-lg text-muted-foreground">Loading discovery...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16 bg-card rounded-lg">
        <p className="text-lg text-muted-foreground mb-4">{error}</p>
        <p className="text-sm text-muted-foreground">Make sure TMDB is configured (e.g. API key or read access token).</p>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Discover TV Shows</h1>
      <DiscoverySectionRow
        title="Trending this week"
        shows={trending}
        addedTmdbIds={addedTmdbIds}
        addingId={addingId}
        onAdd={handleAdd}
      />
      <DiscoverySectionRow
        title="Popular"
        shows={popular}
        addedTmdbIds={addedTmdbIds}
        addingId={addingId}
        onAdd={handleAdd}
      />
      <DiscoverySectionRow
        title="Airing this week"
        shows={onTheAir}
        addedTmdbIds={addedTmdbIds}
        addingId={addingId}
        onAdd={handleAdd}
      />
    </>
  )
}

export default TVShowDiscovery
