'use server'

import { getFerryProvider } from '@/lib/ferry'
import { slug } from '@/lib/ferry/util'
import { nearestCandidateDates, MAX_NEAREST_PROBES } from '@/lib/ferry/nearest'
import { todayAthensISO } from '@/lib/validation/dates'
import type { FerryTrip } from '@/lib/ferry/provider'

export interface FerrySearchActionInput {
  from: string
  to: string
  date: string
  pax?: { adults: number; children: number; infants: number }
}

/**
 * Client → provider boundary. Client components call THIS, never
 * getFerryProvider() (which can pull the server-only Dentur module). from/to are
 * slugged with the shared slug() so they match the Dentur adapter's port lookup.
 */
export async function searchFerriesAction(input: FerrySearchActionInput): Promise<FerryTrip[]> {
  const provider = await getFerryProvider()
  return provider.search({
    from: slug(input.from),
    to: slug(input.to),
    date: input.date,
    pax: input.pax,
  })
}

export interface FerrySearchResult {
  trips: FerryTrip[]
  reason?: 'route_not_offered' | 'no_trips_on_date' | 'no_trips_in_window'
  nearest?: FerryTrip
}

/** resolveDeparture/resolveArrival throw for an unoffered route (Dentur). */
function isUnknownRouteError(e: unknown): boolean {
  return e instanceof Error && /unknown_arrival|unknown_departure/.test(e.message)
}

/**
 * Main path: exact-date search (fresh quota). When empty, nearest-date fallback:
 *   route_not_offered      → route not in Dentur (UI: "not available")
 *   no_trips_on_date + nearest → none on this date; nearest AVAILABLE sailing (fresh-verified)
 *   no_trips_in_window     → no fresh-available day within ±NEAREST_WINDOW_DAYS
 * The "nearest" business logic lives here; the provider returns raw data only.
 */
export async function searchFerriesWithNearestAction(
  input: FerrySearchActionInput,
): Promise<FerrySearchResult> {
  const provider = await getFerryProvider()
  const from = slug(input.from), to = slug(input.to)
  const date = input.date.slice(0, 10)

  // 1) Main path — exact date, fresh quota.
  let trips: FerryTrip[]
  try {
    trips = await provider.search({ from, to, date: input.date, pax: input.pax })
  } catch (e) {
    if (isUnknownRouteError(e)) return { trips: [], reason: 'route_not_offered' }
    throw e
  }
  if (trips.length > 0) return { trips }

  // 2) Empty day, route exists → season schedule for the fallback.
  let schedule: FerryTrip[]
  try {
    schedule = await provider.getRouteSchedule(from, to)
  } catch (e) {
    if (isUnknownRouteError(e)) return { trips: [], reason: 'route_not_offered' }
    throw e
  }
  const candidates = nearestCandidateDates(schedule, date, todayAthensISO())
    .slice(0, MAX_NEAREST_PROBES)

  // 3) Re-verify each candidate with a FRESH search (stale-cache guard); first available wins.
  for (const candidateDate of candidates) {
    const fresh = await provider.search({ from, to, date: `${candidateDate}T00:00:00`, pax: input.pax })
    const available = fresh.find((t) => t.passengerSeatsAvailable > 0)
    // Stamp the candidate date — mock search returns date-less trips; Dentur's is
    // already this date, so stamping is consistent across providers.
    if (available) return { trips: [], reason: 'no_trips_on_date', nearest: { ...available, date: candidateDate } }
  }

  // 4) No fresh-available candidate within the window (or all probes came back empty).
  console.warn(
    `[ferry] nearest fallback empty: ${from}→${to} @ ${date} — ` +
    `${candidates.length} candidate(s) probed, no fresh availability`,
  )
  return { trips: [], reason: 'no_trips_in_window' }
}
