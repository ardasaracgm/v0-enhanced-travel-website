'use client'

import * as React from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { NormalizedCar } from '@/lib/normalize-car'

interface Car2HeroCarouselProps {
  cars: NormalizedCar[]
  onCardClick: (modelKey: string) => void
}

const AUTO_MS = 4000

// Visible card count tracks the Tailwind breakpoints (base 1 / sm 2 / lg 3) so
// the paged-window math matches what's actually rendered.
function useVisibleCount(): number {
  const [n, setN] = React.useState(1)
  React.useEffect(() => {
    const sm = window.matchMedia('(min-width: 640px)')
    const lg = window.matchMedia('(min-width: 1024px)')
    const update = () => setN(lg.matches ? 3 : sm.matches ? 2 : 1)
    update()
    sm.addEventListener('change', update)
    lg.addEventListener('change', update)
    return () => {
      sm.removeEventListener('change', update)
      lg.removeEventListener('change', update)
    }
  }, [])
  return n
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

export function Car2HeroCarousel({ cars, onCardClick }: Car2HeroCarouselProps) {
  const t = useTranslations('car2')
  const visible = useVisibleCount()
  const reduced = usePrefersReducedMotion()
  const [pageIndex, setPageIndex] = React.useState(0)

  const pageCount = Math.max(1, Math.ceil(cars.length / visible))

  // Breakpoint change can shrink pageCount below the current index → clamp.
  React.useEffect(() => {
    setPageIndex((i) => Math.min(i, pageCount - 1))
  }, [pageCount])

  // Auto-advance. Re-runs on every pageIndex change, so a manual prev/next/dot
  // also resets the timer (pause-then-resume). Disabled for reduced-motion and
  // when there's only one page.
  React.useEffect(() => {
    if (reduced || pageCount <= 1) return
    const id = setTimeout(() => setPageIndex((i) => (i + 1) % pageCount), AUTO_MS)
    return () => clearTimeout(id)
  }, [pageIndex, pageCount, reduced])

  if (cars.length === 0) return null

  const start = pageIndex * visible
  const shown = cars.slice(start, start + visible)
  const showControls = pageCount > 1
  const transition = reduced ? { duration: 0 } : { duration: 0.5, ease: 'easeInOut' as const }

  return (
    <div className="w-full">
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={pageIndex}
            initial={{ opacity: 0, x: reduced ? 0 : 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduced ? 0 : -24 }}
            transition={transition}
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}
          >
            {shown.map((car) => (
              <button
                key={car.id || car.model}
                type="button"
                onClick={() => onCardClick(car.id)}
                className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5 transition-transform hover:-translate-y-1"
              >
                <Image
                  src={car.image}
                  alt={car.model}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute left-2 top-2 z-10 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-blue-950">
                  2026
                </span>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-3 text-left text-sm font-semibold text-white">
                  {car.model}
                </span>
              </button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {showControls && (
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            aria-label={t('carouselPrev')}
            onClick={() => setPageIndex((i) => (i - 1 + pageCount) % pageCount)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-foreground shadow hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={t('carouselGoTo', { index: i + 1 })}
                onClick={() => setPageIndex(i)}
                className={`h-2 rounded-full transition-all ${i === pageIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label={t('carouselNext')}
            onClick={() => setPageIndex((i) => (i + 1) % pageCount)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-foreground shadow hover:bg-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}
