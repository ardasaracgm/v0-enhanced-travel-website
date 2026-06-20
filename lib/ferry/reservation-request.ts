/**
 * Pure builder: ferry leg(s) → FerryReservationRequest. NO I/O, no server-only.
 * Locks the one-way vs round-trip distinction so it is unit-testable WITHOUT
 * touching live Dentur. The wire-level "one-way ⇒ arrivalExpeditionID:0 /
 * openReturn:0" mapping stays in dentur-provider.reserve (the only place that
 * knows Dentur's shape); this helper only decides whether returnTripId exists.
 */
import type { FerryReservationRequest, FerryReservationPassenger } from './provider'

export interface FerryLegInput {
  expeditionId: number                 // FerryTrip.providerExpeditionId (metadata.provider_expedition_id)
  direction: 'outbound' | 'return'
}

export interface BuildReservationInput {
  legs: FerryLegInput[]                // 1 (one-way) or 2 (round-trip)
  passengers: FerryReservationPassenger[]
  contact: { name: string; email: string; telephone: string }
  poNumber: string
}

export function buildFerryReservationRequest(input: BuildReservationInput): FerryReservationRequest {
  const { legs, passengers, contact, poNumber } = input

  const outbound = legs.filter((l) => l.direction === 'outbound')
  const ret = legs.filter((l) => l.direction === 'return')

  if (legs.length < 1 || legs.length > 2) throw new RangeError(`expected 1-2 ferry legs, got ${legs.length}`)
  if (outbound.length !== 1) throw new RangeError(`expected exactly 1 outbound leg, got ${outbound.length}`)
  if (ret.length > 1) throw new RangeError(`expected at most 1 return leg, got ${ret.length}`)
  if (passengers.length === 0) throw new RangeError('at least one passenger required')

  return {
    outboundTripId: String(outbound[0].expeditionId),
    // one-way ⇒ undefined ⇒ adapter maps to arrivalExpeditionID:0 (the UNVERIFIED #2 path)
    returnTripId: ret.length === 1 ? String(ret[0].expeditionId) : undefined,
    // open-return is not a product option yet; a fixed return leg ⇒ openReturn:0
    openReturn: false,
    contact,
    passengers,
    poNumber,
  }
}
