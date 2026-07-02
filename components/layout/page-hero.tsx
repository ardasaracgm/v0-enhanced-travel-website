import Image from 'next/image'
import { cn } from '@/lib/utils'

interface PageHeroProps {
  /** Background image path (e.g. '/hero-greek-islands.webp') */
  bgImage: string
  /** Alt text for the background image */
  bgAlt?: string
  /**
   * Gradient overlay variant over the background image:
   * - 'light' = white left-fade (wizard/visa surfaces, e.g. transfer/insurance)
   * - 'dark'  = background-token left-fade (homepage)
   * - 'none'  = no overlay (car2 / bare image)
   */
  overlay?: 'none' | 'light' | 'dark'
  /** Vertical alignment of content within the hero */
  align?: 'start' | 'center'
  /** Extra classes for the inner container (rare escape hatch) */
  className?: string
  children: React.ReactNode
}

/**
 * PageHero — single source of truth for full-height hero sections.
 *
 * Guarantees the hero fits the viewport at every resolution (uses svh to
 * avoid mobile browser-chrome overflow) while still growing if content is
 * tall. All hero pages (home, car-rental, transfer, insurance, visa) should
 * use this instead of hand-rolling min-h-screen / py-* stacks.
 */
export function PageHero({
  bgImage,
  bgAlt = '',
  overlay = 'none',
  align = 'center',
  className,
  children,
}: PageHeroProps) {
  return (
    <section className="relative w-full min-h-[100svh] overflow-hidden">
      {/* Background layer */}
      <div className="absolute inset-0">
        <Image
          src={bgImage}
          alt={bgAlt}
          fill
          sizes="100vw"
          priority
          className="object-cover"
        />
        {overlay !== 'none' && (
          <div
            className={cn(
              'absolute inset-0',
              overlay === 'light'
                ? 'bg-gradient-to-r from-white/60 via-white/20 to-transparent'
                : 'bg-gradient-to-r from-background/10 via-background/30 to-transparent',
            )}
          />
        )}
      </div>

      {/* Content container — full-height flex, vertically aligned */}
      <div
        className={cn(
          'container relative z-10 mx-auto flex min-h-[100svh] flex-col px-4 py-16 md:px-6 md:py-20',
          align === 'center' ? 'justify-center' : 'justify-start',
          className,
        )}
      >
        {children}
      </div>
    </section>
  )
}
