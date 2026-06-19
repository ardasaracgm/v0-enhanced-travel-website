import type { FerryTrip } from './provider'
import type { PassengerType } from '@/lib/supabase'

/**
 * Per-passenger adult one-way fare for a single sailing (per-row display / the
 * "from" price). Mock has a single 'adult' fare row → preserves FerryRoute.price.
 */
export function ferryUnitFare(trip: FerryTrip): number {
  const adult = trip.fares.find((f) => f.passengerType === 'adult') ?? trip.fares[0]
  return adult?.oneWay ?? 0
}

/**
 * One passenger's own-type one-way fare. If the provider has no fare for this
 * type, fall back to the adult fare (then the first row) so a child/infant is
 * NEVER priced at 0 (free) or NaN — a real Dentur trip returns adult/child/infant,
 * mock returns only adult, so the fallback is the mock path. The fallback is
 * warned (it's a money path; a missing real-Dentur fare should be visible).
 */
function fareForType(trip: FerryTrip, type: PassengerType): number {
  const exact = trip.fares.find((f) => f.passengerType === type)
  if (exact) return exact.oneWay
  const fallback = trip.fares.find((f) => f.passengerType === 'adult') ?? trip.fares[0]
  console.warn(
    `[ferry] no '${type}' fare for ${trip.id} — ${fallback ? `falling back to adult (${fallback.oneWay})` : 'NO fares at all → 0!'}`
  )
  return fallback?.oneWay ?? 0
}

/**
 * Authoritative ferry total for ONE leg: sum each passenger's own-type one-way
 * fare. Dentur returns distinct adult/child/infant fares (e.g. 25/20/10 EUR), so
 * pricing everyone at the adult fare overcharges families. Passenger types are
 * derived server-side (derivePassengerType) at the outbound date.
 */
export function ferryFaresTotal(trip: FerryTrip, passengerTypes: PassengerType[]): number {
  return passengerTypes.reduce((sum, t) => sum + fareForType(trip, t), 0)
}

/**
 * Total ferry price = adult one-way fare × passengerCount. Preserves the old
 * confirmation behaviour (outbound.price * passengerCount) exactly under mock.
 *
 * TODO: per-pax-type pricing when Dentur fares wired — real Dentur returns
 * distinct child/infant fares (fares[]); totals must sum per passenger type
 * instead of adult-fare × count. Revisit confirmation totals then.
 */
export function ferryDisplayPrice(trip: FerryTrip, passengerCount: number): number {
  return ferryUnitFare(trip) * passengerCount
}

/** 90 → '1h 30m', 40 → '40m', 60 → '1h 00m'. Mirrors old mock duration strings. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h === 0 ? `${m}m` : `${h}h ${String(m).padStart(2, '0')}m`
}
