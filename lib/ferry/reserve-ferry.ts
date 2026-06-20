import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getFerryProvider } from '@/lib/ferry'
import { buildFerryReservationRequest, type FerryLegInput } from '@/lib/ferry/reservation-request'
import type { FerryItemMetadata } from '@/lib/supabase'
import type { FerryReservationPassenger } from '@/lib/ferry/provider'

/**
 * reserveFerry — books the trip's ferry leg(s) with the provider (Dentur:
 * CreateReservation) and writes the PNR/reservation result back onto the
 * OUTBOUND ferry trip_item metadata (the anchor; a round trip is ONE reservation
 * covering both legs).
 *
 * Core orchestrator — the ferry twin of issuePolicy. Wired as a confirmTrip
 * side-effect (runs AFTER payment), so it must be:
 *   NON-FATAL    — returns { ok:false }, never throws, so a provider hiccup does
 *                  not break the payment/confirm flow.
 *   SELF-GATING  — no ferry item → skipped:'no_ferry' (no-op for car-only trips).
 *   IDEMPOTENT   — reserve_state==='reserved' → no-op. A FRESH reservation is
 *                  guarded by an atomic lease (ferry_reserve_lease_at) so two
 *                  concurrent confirm paths cannot both call CreateReservation —
 *                  Dentur has NO idempotency key, so a double call = a duplicate
 *                  booking. Exactly one caller claims the lease; the other skips.
 *
 * Lease is deliberately NOT reset on failure: a throw may be a timeout AFTER
 * Dentur created the booking, so an immediate retry would double-book. The
 * 5-minute lease expiry gates the retry (mirrors issuePolicy).
 */
export type ReserveFerryResult =
  | { ok: true; reservationId?: number; skipped?: 'no_ferry' | 'already_reserved' | 'reserving_in_progress' }
  | { ok: false; error: string }

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>

// ferry_id is "<provider>:<nativeId>" (e.g. "dentur:12345"). Strip the provider
// prefix back to the numeric expeditionID the reservation request needs.
function expeditionIdFromFerryId(ferryId: string | undefined): number {
  const n = Number(String(ferryId ?? '').replace(/^[a-z]+:/i, ''))
  if (!Number.isFinite(n)) throw new RangeError(`ferry item has no numeric expedition id (ferry_id=${ferryId})`)
  return n
}

export async function reserveFerry(tripId: string): Promise<ReserveFerryResult> {
  const supabase = getSupabaseAdmin()

  // 1. ferry items (1 = one-way, 2 = round-trip). Anchor = the outbound row.
  const { data: rows, error: itemErr } = await supabase
    .from('trip_items')
    .select('id, metadata, price_amount')
    .eq('trip_id', tripId)
    .eq('item_type', 'ferry')
  if (itemErr) return { ok: false, error: `ferry item lookup failed: ${itemErr.message}` }
  if (!rows || rows.length === 0) return { ok: true, skipped: 'no_ferry' }

  const items = rows.map((r) => ({
    id: r.id as string,
    meta: (r.metadata ?? {}) as FerryItemMetadata,
    priceCents: Math.round(Number(r.price_amount ?? 0) * 100), // cents = float-safe compare unit
  }))
  const outbound = items.find((r) => r.meta.direction === 'outbound')
  if (!outbound) return { ok: false, error: 'ferry booking has no outbound leg' }

  // Done already? reserve_state on the anchor is the source of truth.
  if (outbound.meta.reserve_state === 'reserved') return { ok: true, skipped: 'already_reserved' }

  try {
    // ---- ATOMIC LEASE on the outbound anchor — concurrency guard around reserve()
    // The conditional UPDATE is claimable only when the lease is NULL or older than
    // 5 min (self-heals a crash-stranded lease). Postgres row-lock serialises
    // concurrent claims: exactly ONE gets a row (proceeds), the other gets 0 rows
    // and skips reserve() entirely → a duplicate Dentur booking is impossible.
    const leaseExpiry = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: leased, error: leaseErr } = await supabase
      .from('trip_items')
      .update({ ferry_reserve_lease_at: new Date().toISOString() })
      .eq('id', outbound.id)
      .eq('item_type', 'ferry')
      .or(`ferry_reserve_lease_at.is.null,ferry_reserve_lease_at.lt.${leaseExpiry}`)
      .select('id')
      .maybeSingle()
    if (leaseErr) return { ok: false, error: `reserve lease claim failed: ${leaseErr.message}` }
    if (!leased) {
      console.info(`[reserveFerry] reserve lease held by concurrent run for trip ${tripId} — skipping reserve()`)
      return { ok: true, skipped: 'reserving_in_progress' }
    }

    // ---- gather the reservation inputs (trip contact + reference, passengers) ----
    const { data: trip, error: tripErr } = await supabase
      .from('trips')
      .select('reference, contact_email, contact_phone')
      .eq('id', tripId)
      .maybeSingle()
    if (tripErr || !trip) return { ok: false, error: `Trip not found: ${tripId}` }

    const { data: pax } = await supabase
      .from('passengers')
      .select('first_name, last_name, passport_number, passport_expiry, birth_date, nationality, gender, is_lead')
      .eq('trip_id', tripId)
    if (!pax || pax.length === 0) return { ok: false, error: 'no passengers for ferry reservation' }

    // Fail fast on incomplete identity. reserve() runs AFTER payment, so sending a
    // passenger with an empty passport/nationality/DOB would earn a confusing Dentur
    // reject and leave us "paid, no reservation". Zod normally guarantees these on
    // the ferry passenger schema, but this side-effect must not trust that: bail
    // with a clear admin-backstop message instead (mirrors issuePolicy's defensiveness).
    const incomplete = pax.find((p) => !p.passport_number?.trim() || !p.nationality?.trim() || !p.birth_date?.trim())
    if (incomplete) {
      return { ok: false, error: `passenger ${incomplete.first_name} ${incomplete.last_name} missing passport/nationality/DOB — manual reservation needed` }
    }

    const lead = pax.find((p) => p.is_lead) ?? pax[0]
    const passengers: FerryReservationPassenger[] = pax.map((p) => ({
      firstName: p.first_name,
      lastName: p.last_name,
      passportNumber: p.passport_number ?? '',
      gender: (p.gender as FerryReservationPassenger['gender']) ?? 'unspecified',
      passportExpiryDate: p.passport_expiry ?? undefined,
      dateOfBirth: p.birth_date ?? '',
      nationality: p.nationality ?? '',
    }))

    const legs: FerryLegInput[] = items.map((r) => ({
      expeditionId: expeditionIdFromFerryId(r.meta.ferry_id),
      direction: r.meta.direction === 'return' ? 'return' : 'outbound',
    }))

    // buildFerryReservationRequest locks the one-way vs round-trip mapping
    // (one-way ⇒ no returnTripId ⇒ adapter sends arrivalExpeditionID:0).
    const req = buildFerryReservationRequest({
      legs,
      passengers,
      contact: {
        name: `${lead.first_name} ${lead.last_name}`.trim(),
        email: trip.contact_email,
        telephone: trip.contact_phone,
      },
      poNumber: trip.reference, // server-authoritative, trip-stable PNR↔trip key
    })

    const result = await (await getFerryProvider()).reserve(req)
    if (!result.ok) {
      // CLEAN provider rejection (no booking created) — mark failed, KEEP the lease
      // (5-min window) so a retry is gated, then surface for the admin backstop.
      await writeItem(supabase, outbound.id, { metadata: { ...outbound.meta, reserve_state: 'failed' } })
      const msg = (result.errors ?? []).join('; ') || 'provider rejected reservation'
      return { ok: false, error: `ferry reservation rejected: ${msg}` }
    }

    // ---- Real per-leg split from the voucher amounts (round-trip reconcile) ----
    // Each voucher is per-passenger-per-leg; summing amount by expeditionID gives
    // the REAL per-leg fare, correcting our provisional EQUAL split. This must
    // NEVER move money: the charge already happened against trips.total_amount
    // (= the provisional total). We only REDISTRIBUTE the same total; if the
    // voucher total disagrees with what we charged, we touch no price and flag it.
    // All equality is INTEGER CENTS — float === on EUR (17.50+17.50 → 35.0000001)
    // would spuriously trip the mismatch guard. Same discipline as the pricing split.
    const isRoundTrip = items.length >= 2 // one-way's single leg is already exact
    const vouchers = result.vouchers ?? []
    const haveSplit =
      vouchers.length > 0 &&
      vouchers.every((v) => typeof v.amount === 'number' && typeof v.expeditionId === 'number')

    // expeditionID → summed voucher cents
    const realCentsByExp = new Map<number, number>()
    for (const v of vouchers) {
      if (typeof v.amount !== 'number' || typeof v.expeditionId !== 'number') continue
      realCentsByExp.set(v.expeditionId, (realCentsByExp.get(v.expeditionId) ?? 0) + Math.round(v.amount * 100))
    }
    const centsForLeg = (it: (typeof items)[number]) =>
      realCentsByExp.get(expeditionIdFromFerryId(it.meta.ferry_id))
    const provisionalCents = items.reduce((s, it) => s + it.priceCents, 0)
    const realCents = items.reduce((s, it) => s + (centsForLeg(it) ?? 0), 0)
    const everyLegMatched = items.every((it) => centsForLeg(it) !== undefined)

    // Total-preservation guard: apply the split ONLY when we have a complete,
    // cent-exact voucher breakdown whose total equals what we charged.
    const totalsMatch = isRoundTrip && haveSplit && everyLegMatched && realCents === provisionalCents
    if (isRoundTrip && haveSplit && !totalsMatch) {
      console.error(
        `[reserveFerry] voucher split unusable for trip ${tripId} ` +
        `(real=${realCents}¢ charged=${provisionalCents}¢ everyLegMatched=${everyLegMatched}) ` +
        `— keeping provisional split, flagging for reconcile`,
      )
    }

    // RETURN leg first (best-effort). If its write fails we DON'T correct outbound
    // either → both stay provisional-equal and the sum is preserved.
    let splitApplied = totalsMatch
    if (totalsMatch) {
      for (const ret of items.filter((it) => it.id !== outbound.id)) {
        const ok = await writeItem(supabase, ret.id, { price_amount: centsForLeg(ret)! / 100 })
        if (!ok) splitApplied = false // writeItem logged; leave both legs provisional
      }
    }

    // OUTBOUND anchor — CRITICAL idempotency commit barrier (flips reserve_state →
    // 'reserved'). If it fails the booking EXISTS at the provider but we lost the
    // PNR → manual reconcile. Its price is corrected ONLY when the return write(s)
    // landed, so the pair can never end up half-corrected. The real per-voucher
    // amounts persist on vouchers[] regardless → reconcile data survives even when
    // the split stays provisional.
    const persisted: FerryItemMetadata = {
      ...outbound.meta,
      reserve_state: 'reserved',
      reservation_id: result.providerReservationId,
      reservation_guid: result.providerReservationGuid,
      vouchers: result.vouchers,
      ...(isRoundTrip && haveSplit && !totalsMatch
        ? { amount_mismatch: { charged_cents: provisionalCents, dentur_cents: realCents } }
        : {}),
    }
    const outboundCents = splitApplied ? centsForLeg(outbound)! : undefined
    const ok = await writeItem(supabase, outbound.id, {
      metadata: persisted,
      ...(outboundCents !== undefined ? { price_amount: outboundCents / 100 } : {}),
    })
    if (!ok) {
      console.error('[reserveFerry] CRITICAL: reservation created but persist failed', tripId, 'reservationId=', result.providerReservationId)
      return { ok: false, error: `reservation ${result.providerReservationId} created but persist failed — manual reconcile` }
    }
    return { ok: true, reservationId: result.providerReservationId }
  } catch (err) {
    // NON-FATAL. Lease KEPT (not reset): the throw may be a timeout post-creation;
    // the 5-min expiry gates the retry so an in-flight booking is not duplicated.
    console.error('[reserveFerry] failed for trip', tripId, err)
    return { ok: false, error: err instanceof Error ? err.message : 'reserveFerry failed' }
  }
}

// One row update for metadata and/or price_amount (jsonb written whole — Supabase
// does not partial-merge). Mirrors issuePolicy's writer, plus the leg price.
async function writeItem(
  supabase: SupabaseAdmin,
  itemId: string,
  fields: { metadata?: FerryItemMetadata; price_amount?: number },
): Promise<boolean> {
  const { error } = await supabase
    .from('trip_items')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', itemId)
  if (error) {
    console.error('[reserveFerry] item write failed for item', itemId, error.message)
    return false
  }
  return true
}
