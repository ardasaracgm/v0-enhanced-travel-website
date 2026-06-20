import type { FerryItemMetadata } from '@/lib/supabase'

/**
 * reconcileVoucherSplit — the pure cents math behind the round-trip per-leg
 * reconcile. Extracted from reserveFerry so it can be unit-tested in isolation
 * and exercised by probes against REAL Dentur voucherDetails[] without touching
 * the DB. No I/O here; reserveFerry binds the result to the trip_item writes.
 *
 * Each Dentur voucher is per-passenger-per-leg; summing `amount` by expeditionID
 * gives the REAL per-leg fare, correcting our provisional EQUAL split. The split
 * must NEVER move money: the charge already happened against the provisional
 * total, so we only REDISTRIBUTE that same total — and only when we have a
 * complete, cent-exact breakdown whose total equals what we charged. Otherwise
 * we keep the provisional split and flag a mismatch.
 *
 * All equality is INTEGER CENTS — float === on EUR (17.50 + 17.50 → 35.0000001)
 * would spuriously trip the mismatch guard. Same discipline as the pricing split.
 */

// ferry_id is "<provider>:<nativeId>" (e.g. "dentur:12345"). Strip the provider
// prefix back to the numeric expeditionID the reservation request / leg match needs.
export function expeditionIdFromFerryId(ferryId: string | undefined): number {
  const n = Number(String(ferryId ?? '').replace(/^[a-z]+:/i, ''))
  if (!Number.isFinite(n)) throw new RangeError(`ferry item has no numeric expedition id (ferry_id=${ferryId})`)
  return n
}

export interface ReconcileLeg {
  id: string
  meta: FerryItemMetadata
  priceCents: number
}

export interface ReconcileVoucher {
  amount?: number       // Dentur voucherDetails[].amount (EUR)
  expeditionId?: number // Dentur voucherDetails[].tripID (== expeditionID)
}

export interface ReconcileResult {
  isRoundTrip: boolean
  haveSplit: boolean
  everyLegMatched: boolean
  totalsMatch: boolean
  provisionalCents: number
  realCents: number
  /** corrected per-leg cents keyed by trip_item id; undefined for an unmatched leg. */
  correctedCentsByItemId: Map<string, number | undefined>
  /** present iff isRoundTrip && haveSplit && !totalsMatch — the reconcile flag. */
  mismatch?: { charged_cents: number; dentur_cents: number }
}

export function reconcileVoucherSplit(legs: ReconcileLeg[], vouchers: ReconcileVoucher[]): ReconcileResult {
  const isRoundTrip = legs.length >= 2 // one-way's single leg is already exact
  const haveSplit =
    vouchers.length > 0 &&
    vouchers.every((v) => typeof v.amount === 'number' && typeof v.expeditionId === 'number')

  // expeditionID → summed voucher cents
  const realCentsByExp = new Map<number, number>()
  for (const v of vouchers) {
    if (typeof v.amount !== 'number' || typeof v.expeditionId !== 'number') continue
    realCentsByExp.set(v.expeditionId, (realCentsByExp.get(v.expeditionId) ?? 0) + Math.round(v.amount * 100))
  }
  const centsForLeg = (it: ReconcileLeg) => realCentsByExp.get(expeditionIdFromFerryId(it.meta.ferry_id))

  const provisionalCents = legs.reduce((s, it) => s + it.priceCents, 0)
  const realCents = legs.reduce((s, it) => s + (centsForLeg(it) ?? 0), 0)
  const everyLegMatched = legs.every((it) => centsForLeg(it) !== undefined)

  // Total-preservation guard: apply the split ONLY when we have a complete,
  // cent-exact voucher breakdown whose total equals what we charged.
  const totalsMatch = isRoundTrip && haveSplit && everyLegMatched && realCents === provisionalCents

  const correctedCentsByItemId = new Map<string, number | undefined>()
  for (const it of legs) correctedCentsByItemId.set(it.id, centsForLeg(it))

  return {
    isRoundTrip,
    haveSplit,
    everyLegMatched,
    totalsMatch,
    provisionalCents,
    realCents,
    correctedCentsByItemId,
    ...(isRoundTrip && haveSplit && !totalsMatch
      ? { mismatch: { charged_cents: provisionalCents, dentur_cents: realCents } }
      : {}),
  }
}
