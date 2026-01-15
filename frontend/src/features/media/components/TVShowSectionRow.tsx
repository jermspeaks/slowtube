import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { TVShow } from '../types/tv-show'
import TVShowCard from './TVShowCard'

interface TVShowSectionRowProps {
  title: string
  description: string
  tvShows: TVShow[]
  onTVShowClick?: (tvShow: TVShow) => void
}

function TVShowSectionRow({ title, description, tvShows, onTVShowClick }: TVShowSectionRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScrollability = () => {
    if (!scrollContainerRef.current) return
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10) // 10px threshold
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
  }, [tvShows])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return
    
    const container = scrollContainerRef.current
    const cardWidth = 300 // Approximate card width with gap
    const scrollAmount = cardWidth * 2 // Scroll 2 cards at a time
    
    const newScrollLeft = direction === 'left' 
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount
    
    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    })
  }

  if (tvShows.length === 0) {
    return null
  }

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {/* Pagination buttons - Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {canScrollLeft && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => scroll('left')}
                className="h-8 w-8"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            {canScrollRight && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => scroll('right')}
                className="h-8 w-8"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Link
            to="/media/tv-shows/list"
            className="text-sm md:text-base text-primary hover:underline whitespace-nowrap"
          >
            View All
          </Link>
        </div>
      </div>

      {/* Horizontal Scrollable TV Show Cards */}
      <div className="relative">
        {/* Left Arrow - Mobile */}
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

        {/* Scrollable Container */}
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
          {tvShows.map((tvShow) => (
            <div
              key={tvShow.id}
              className="shrink-0 w-[280px] md:w-[300px]"
              style={{ scrollSnapAlign: 'start' }}
            >
              <TVShowCard
                tvShow={tvShow}
                onClick={() => onTVShowClick?.(tvShow)}
              />
            </div>
          ))}
        </div>

        {/* Right Arrow - Mobile */}
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

export default TVShowSectionRow
