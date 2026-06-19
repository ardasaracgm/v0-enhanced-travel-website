import type { FerryTrip } from './provider'

/**
 * Per-passenger adult one-way fare for a single sailing (per-row display).
 * Mock has a single 'adult' fare row → preserves old FerryRoute.price.
 */
export function ferryUnitFare(trip: FerryTrip): number {
  const adult = trip.fares.find((f) => f.passengerType === 'adult') ?? trip.fares[0]
  return adult?.oneWay ?? 0
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
