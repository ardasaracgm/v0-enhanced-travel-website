import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

/**
 * Routing configuration for next-intl.
 *
 * - `locales`: the three supported UI languages
 * - `defaultLocale`: only used as a fallback after browser detection
 *    fails (which itself only triggers on first visit when no cookie
 *    is set). Detection logic lives in middleware.ts.
 * - `localePrefix: 'always'`: every URL is prefixed. /  →  /en, /tr, /el
 *    Cleanest pattern; SEO-friendly; matches how the user expressed
 *    the requirement ("user is sent to the right language").
 */
export const routing = defineRouting({
  locales: ['en', 'tr', 'el'],
  defaultLocale: 'en',
  localePrefix: 'always',
})

export type Locale = (typeof routing.locales)[number]

/**
 * Typed wrappers around Next's `Link`, `redirect`, `useRouter`, `usePathname`.
 *
 * Use these everywhere instead of the regular next/link / next/navigation
 * imports — they automatically include the active locale prefix.
 *
 *   import { Link } from '@/i18n/routing'
 *   <Link href="/ferry">...</Link>
 *
 * In Turkish locale this renders <a href="/tr/ferry">. No manual locale
 * juggling in components.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
