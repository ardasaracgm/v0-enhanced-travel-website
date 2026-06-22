/**
 * groupFerryLegs — splits a trip's ferry legs into reservation GROUPS, the pure
 * decision behind per-group reserve() in reserveFerry (Commit 4b). No I/O, no
 * server-only: unit-testable in isolation.
 *
 *   • round_trip — exactly an outbound + a return that is its geographic reverse
 *     on the SAME operator (isReversePair). This is the classic 2-leg booking and
 *     the ONLY case that becomes ONE Dentur reservation, so it must stay
 *     byte-identical to today: one group, outbound anchor, [outbound, return].
 *   • one_way — everything else: a plain one-way booking, OR an open-jaw return
 *     whose route is not the reverse (becomes two independent one-way
 *     reservations). Each leg is its own group, anchored on itself.
 *
 * Scoped to the current 1–2 leg model (≤1 outbound, ≤1 return). N-leg journeys
 * (Kademe 6) will need leg_index in metadata + a rework here — see booking-context
 * legIndex (cart-only today, not persisted).
 */
import type { FerryItemMetadata } from '@/lib/supabase'
import { isReversePair, type ReversePairLeg } from './reverse-pair'
import { expeditionIdFromFerryId } from './reconcile'

/** The subset of a ferry trip_item grouping reads. reserve-ferry's ReserveLeg
 *  ({ id, meta, priceCents }) satisfies this structurally. */
export interface GroupableLeg {
  id: string
  meta: FerryItemMetadata
}

export type GroupKind = 'round_trip' | 'one_way'

export interface ReserveGroup<T extends GroupableLeg = GroupableLeg> {
  kind: GroupKind
  /** round_trip → the outbound leg; one_way → the single leg. The row that
   *  carries reserve_state / reservation_id / vouchers for this reservation. */
  anchor: T
  /** round_trip → [outbound, return]; one_way → [leg]. */
  legs: T[]
}

const toReversePairLeg = (l: GroupableLeg): ReversePairLeg => ({
  operator: l.meta.operator,
  from: { id: l.meta.from_port },
  to: { id: l.meta.to_port },
})

export function groupFerryLegs<T extends GroupableLeg>(legs: T[]): ReserveGroup<T>[] {
  const outbound = legs.find((l) => l.meta.direction === 'outbound')
  const returnLeg = legs.find((l) => l.meta.direction === 'return')

  // Classic round-trip pair → ONE reservation. legs is explicitly [outbound,
  // return] so the request shape is stable regardless of input order.
  if (outbound && returnLeg && isReversePair(toReversePairLeg(outbound), toReversePairLeg(returnLeg))) {
    return [{ kind: 'round_trip', anchor: outbound, legs: [outbound, returnLeg] }]
  }

  // Otherwise each leg is its own one-way reservation (outbound first if present).
  const ordered = outbound ? [outbound, ...legs.filter((l) => l !== outbound)] : legs
  return ordered.map((l) => ({ kind: 'one_way' as const, anchor: l, legs: [l] }))
}

/**
 * groupPoNumber — the Dentur poNumber for ONE reservation group.
 *
 *   • classic single group (one-way OR round-trip reverse-pair, groupCount === 1)
 *     → bare trip.reference, BYTE-IDENTICAL to pre-4c.
 *   • open-jaw (groupCount > 1) → reference + a per-group suffix (the anchor leg's
 *     expeditionID). The COMBINED CreateReservation endpoint REJECTS a 2nd call
 *     carrying a duplicate poNumber (HTTP 400, proven live: R1 cut, R2 same
 *     poNumber → 400) — so each independent open-jaw reservation needs its own.
 *
 * The suffix is reference-PREFIXED (a future voucher→trip lookup groups by
 * startsWith(reference), not equality) and STABLE across retries (expeditionID is
 * fixed in metadata, independent of DB row order) — required for 4d retry idempotency.
 */
export function groupPoNumber<T extends GroupableLeg>(
  reference: string,
  group: ReserveGroup<T>,
  groupCount: number,
): string {
  if (groupCount === 1) return reference
  return `${reference}-${expeditionIdFromFerryId(group.anchor.meta.ferry_id)}`
}
