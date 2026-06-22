import type { FerryTrip, FerryFare } from './provider'
import type { PassengerType } from '@/lib/supabase'
import { isReversePair } from './reverse-pair'

/**
 * Per-passenger adult one-way fare for a single sailing (per-row display / the
 * "from" price). Mock has a single 'adult' fare row → preserves FerryRoute.price.
 */
export function ferryUnitFare(trip: FerryTrip): number {
  const adult = trip.fares.find((f) => f.passengerType === 'adult') ?? trip.fares[0]
  return adult?.oneWay ?? 0
}

/**
 * Resolve a passenger's own-type fare ROW. If the provider has no fare for this
 * type, fall back to the adult row (then the first row) so a child/infant is
 * NEVER priced at 0 (free) or NaN — a real Dentur trip returns adult/child/infant,
 * mock returns only adult, so the fallback is the mock path. The fallback is
 * warned (it's a money path; a missing real-Dentur fare should be visible).
 * Shared by the one-way (ferryFaresTotal) and round-trip (ferryRoundTripTotal) sums.
 */
function pickFare(trip: FerryTrip, type: PassengerType): FerryFare | undefined {
  const exact = trip.fares.find((f) => f.passengerType === type)
  if (exact) return exact
  const fallback = trip.fares.find((f) => f.passengerType === 'adult') ?? trip.fares[0]
  console.warn(
    `[ferry] no '${type}' fare for ${trip.id} — ${fallback ? `falling back to adult (${fallback.oneWay})` : 'NO fares at all → 0!'}`
  )
  return fallback
}

/** One passenger's own-type one-way fare (0 when the trip has no fares at all). */
function fareForType(trip: FerryTrip, type: PassengerType): number {
  return pickFare(trip, type)?.oneWay ?? 0
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
 * Authoritative ferry total for a ROUND TRIP charged as ONE booking (both legs).
 * Dentur prices a round trip as a SINGLE per-passenger fare — returnSameDay when
 * both legs sail the same date, returnDifferentDay otherwise — NOT 2× oneWay.
 * Verified live (Step1, 1 adult Bodrum⇄Kos): ow=25, same-day=35, different-day=40.
 * The mock provider has no round-trip fares (returnSameDay/returnDifferentDay
 * undefined) → falls back to 2× oneWay, preserving the prior two-leg mock total.
 */
export function ferryRoundTripTotal(
  trip: FerryTrip,
  passengerTypes: PassengerType[],
  sameDay: boolean,
): number {
  return passengerTypes.reduce((sum, t) => {
    const fare = pickFare(trip, t)
    if (!fare) return sum
    const roundTrip = sameDay ? fare.returnSameDay : fare.returnDifferentDay
    return sum + (roundTrip ?? fare.oneWay * 2)
  }, 0)
}

/**
 * Per-leg display/charge amounts for a ferry booking — THE single source both
 * the client cart (booking-context reprice) and the server money-path
 * (submit-booking §2b) use, so what the user sees equals what Viva is charged.
 *
 * - One-way (no return): outbound = each pax's own-type one-way fare; pair=false.
 * - Round-trip REVERSE PAIR (same operator + route flipped): one round-trip charge
 *   (returnSameDay/DifferentDay from the outbound company's table), split in INTEGER
 *   CENTS — floor each half, odd cent → outbound — so the two halves sum EXACTLY to
 *   the pair total (no rounding leak before Viva's Math.round(total*100)); pair=true.
 * - NOT a reverse pair — a DIFFERENT operator OR an OPEN-JAW return (Bodrum→Kos out,
 *   Kos→Turgutreis back): the round-trip discount is one company's reverse-route fare,
 *   so it does NOT apply — each leg is its own one-way; pair=false (NOT one Dentur
 *   reservation). groupFerryLegs uses the SAME isReversePair, so charge == reserve cost.
 *
 * `pair` mirrors the round_trip_pair tag: true only when the two legs are one
 * discounted round-trip reservation (same operator). Callers tag off this so the
 * forward-compat different-operator case is never mislabelled as a pair.
 */
export function ferryPairPrices(
  outbound: FerryTrip,
  returnTrip: FerryTrip | null,
  passengerTypes: PassengerType[],
  sameDay: boolean,
): { outbound: number; return: number | null; pair: boolean } {
  if (!returnTrip) {
    return { outbound: ferryFaresTotal(outbound, passengerTypes), return: null, pair: false }
  }
  // A discounted round-trip is ONE company's reverse route. Different operator OR
  // an open-jaw return (Kos→Turgutreis, not Kos→Bodrum) → two independent one-ways.
  if (!isReversePair(outbound, returnTrip)) {
    return {
      outbound: ferryFaresTotal(outbound, passengerTypes),
      return: ferryFaresTotal(returnTrip, passengerTypes),
      pair: false,
    }
  }
  const pairTotalCents = Math.round(ferryRoundTripTotal(outbound, passengerTypes, sameDay) * 100)
  const half = Math.floor(pairTotalCents / 2)
  return { outbound: (pairTotalCents - half) / 100, return: half / 100, pair: true } // odd cent → outbound
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
