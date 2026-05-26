import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { routing } from './routing'

/**
 * Server-side request config.
 *
 * For each incoming request, this:
 *  1. Validates the locale segment from the URL against our list
 *  2. Falls back to defaultLocale if it's something we don't support
 *  3. Loads the matching messages/{locale}.json
 *
 * Called automatically by next-intl middleware + server components.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: 'Europe/Athens',
    now: new Date(),
  }
})
