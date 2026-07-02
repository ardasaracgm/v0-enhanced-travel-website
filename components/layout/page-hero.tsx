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
 * PageHero — single source of truth for full-bleed hero sections.
 *
 * Background image always fills the section (min 100svh). Content centers
 * vertically when short and flows naturally (page scrolls) when tall, so it
 * never gets clipped. Use align='start' for content that should hug the top.
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
    <section className="relative w-full min-h-[100svh] overflow-hidden flex flex-col">
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

      {/* Content container — grows with content; centers when short, scrolls when tall */}
      <div
        className={cn(
          'container relative z-10 mx-auto flex w-full flex-1 flex-col px-4 py-8 md:px-6 md:py-12',
          align === 'center' ? 'justify-center' : 'justify-start',
          className,
        )}
      >
        {children}
      </div>
    </section>
  )
}
