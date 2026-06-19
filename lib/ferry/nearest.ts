import type { FerryTrip } from './provider'

export const NEAREST_WINDOW_DAYS = 14
export const MAX_NEAREST_PROBES = 5

const DAY_MS = 86_400_000
function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY_MS)
}

/**
 * Candidate dates (YYYY-MM-DD) for the fallback "nearest departure", nearest-first.
 * From a cached route schedule, keep dates that:
 *   - are NOT the target itself (its fresh search already came back empty),
 *   - are today-or-later (never suggest a past sailing),
 *   - lie within ±NEAREST_WINDOW_DAYS of the target,
 *   - have ≥1 sailing with passengerSeatsAvailable > 0 (per the cached schedule).
 * Sorted by absolute day-distance; ties resolved forward-first (later date wins).
 * Returns DATES only — the action re-verifies fresh quota via TripSearch per date,
 * so a stale cache can never make us suggest a sold-out day.
 */
export function nearestCandidateDates(
  schedule: FerryTrip[], targetDate: string, todayISO: string,
): string[] {
  const available = new Set<string>()
  for (const t of schedule) {
    if (t.passengerSeatsAvailable > 0) available.add(t.date.slice(0, 10))
  }
  return [...available]
    .filter((d) =>
      d !== targetDate &&
      dayDiff(d, todayISO) >= 0 &&
      Math.abs(dayDiff(d, targetDate)) <= NEAREST_WINDOW_DAYS,
    )
    .sort((a, b) => {
      const da = Math.abs(dayDiff(a, targetDate))
      const db = Math.abs(dayDiff(b, targetDate))
      if (da !== db) return da - db
      return dayDiff(b, targetDate) - dayDiff(a, targetDate)  // tie → forward first
    })
}
