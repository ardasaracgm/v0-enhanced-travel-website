import { resolvePort } from '@/lib/ferry/ports'
import { portTimezone, zonedDate } from '@/lib/ferry/timezone'

/**
 * The agency's operating day. Resolvers bake a local midnight in as
 * `${d}T00:00:00+03:00` (resolvers.ts:104,132,174) → the stored instant is
 * 21:00Z the PREVIOUS day, so `.slice(0,10)` and a bare
 * `new Date(x).toLocaleDateString()` (Vercel's server TZ is UTC) both print the
 * day BEFORE the one the customer booked. Formatting in this zone recovers the
 * intended day, and does so for every shape we store:
 *   "2026-10-29T21:00:00Z"  +03-baked midnight (transfer/luggage/insurance) → 2026-10-30
 *   "2026-10-30T00:00:00Z"  UTC midnight (car_rental writes a date-only string) → 2026-10-30
 *   "2026-10-30"            raw metadata date (transfer legs)                  → 2026-10-30
 *   "2026-10-29T22:30:00Z"  a true instant (confirmed_at)                      → 2026-10-30
 */
export const LOCAL_TIMEZONE = 'Europe/Istanbul'

/** Instant (or raw "YYYY-MM-DD") → the calendar day it falls on for us. */
export function localDay(value: string | null | undefined): string | null {
  return value ? zonedDate(value, LOCAL_TIMEZONE) : null
}

/**
 * Ferry is the ONE exception: a sailing's scheduled_at is built as
 * zonedDateTime(date, departureTime, portTimezone(from)) (resolvers.ts:41), so
 * its calendar day belongs to the DEPARTURE PORT's zone, not ours. A 23:30
 * winter departure from a Greek port (+02) is 21:30Z — read in Istanbul that is
 * already the next day. Today every sailing is daytime so the two zones agree,
 * which is exactly why this would break silently. Never send a ferry instant
 * through localDay(); it has no port to reason about.
 */
export function ferryLocalDay(
  instant: string | null | undefined,
  portName: string | null | undefined,
): string | null {
  if (!instant) return null
  const port = resolvePort(portName ?? '')
  // Unknown port name → our zone rather than a wrong offset (portTimezone warns
  // on an unmapped slug; here we have no slug at all).
  if (!port) return zonedDate(instant, LOCAL_TIMEZONE)
  return zonedDate(instant, portTimezone({ id: port.slug, name: port.name.en }))
}

/** "2026-10-30" → "30/10/2026". Noon-UTC + explicit UTC keeps it server-TZ-proof. */
export function formatDay(day: string | null, locale = 'en-GB'): string {
  return day ? new Date(`${day}T12:00:00Z`).toLocaleDateString(locale, { timeZone: 'UTC' }) : '—'
}

export const formatLocalDay = (value: string | null | undefined, locale = 'en-GB'): string =>
  formatDay(localDay(value), locale)

export const formatFerryDay = (
  instant: string | null | undefined,
  portName: string | null | undefined,
  locale = 'en-GB',
): string => formatDay(ferryLocalDay(instant, portName), locale)
