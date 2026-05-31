/**
 * Shared date helpers for Zod validation across forms (booking, visa, …).
 * Calendar-correct, UTC-based, lexical YYYY-MM-DD comparable.
 *
 * Extracted from lib/validation/booking.ts so visa.ts can reuse the same
 * primitives without importing booking-specific schemas. booking.ts keeps
 * its own private copies for now (left untouched this phase); a later
 * cleanup can point it here to dedupe.
 */

/** Strict YYYY-MM-DD parse. Rejects rollovers like 2026-02-30. UTC-based. */
export function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const year = +m[1], month = +m[2], day = +m[3]
  const dt = new Date(Date.UTC(year, month - 1, day))
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null
  }
  return dt
}

/** Today as YYYY-MM-DD in the operator's timezone (Greece). */
export function todayAthensISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })
}

/** Calendar-correct age in whole years on `refDate`. NaN if unparseable. */
export function ageOn(birthDate: string, refDate: string): number {
  const b = parseISODate(birthDate)
  const r = parseISODate(refDate)
  if (!b || !r) return NaN
  let age = r.getUTCFullYear() - b.getUTCFullYear()
  const birthdayNotYetReached =
    r.getUTCMonth() < b.getUTCMonth() ||
    (r.getUTCMonth() === b.getUTCMonth() && r.getUTCDate() < b.getUTCDate())
  if (birthdayNotYetReached) age -= 1
  return age
}
