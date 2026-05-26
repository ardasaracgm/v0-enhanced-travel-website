import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

/**
 * Locale detection & redirect middleware.
 *
 * Behavior:
 *  1. If URL already has a valid locale prefix (/en/..., /tr/..., /el/...), pass through.
 *  2. If user has a `NEXT_LOCALE` cookie, use that.
 *  3. Otherwise inspect `Accept-Language` header:
 *       - Turkish browser → /tr
 *       - Greek browser   → /el
 *       - Anything else   → /en  (defaultLocale)
 *  4. Set the cookie so next visit skips detection.
 *
 * `localeDetection: true` is the default; spelled out here for clarity.
 */
export default createMiddleware({
  ...routing,
  localeDetection: true,
})

export const config = {
  /**
   * Match everything EXCEPT:
   *  - /api routes (server-side, no locale needed)
   *  - /_next (Next internals)
   *  - /_vercel (Vercel internals)
   *  - Static files with a file extension (favicon, .png, .css, etc.)
   *
   * Public files in /public are NOT in this matcher, so they bypass
   * the middleware entirely — no /en/favicon.ico nonsense.
   */
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
