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
    .select('id, metadata')
    .eq('trip_id', tripId)
    .eq('item_type', 'ferry')
  if (itemErr) return { ok: false, error: `ferry item lookup failed: ${itemErr.message}` }
  if (!rows || rows.length === 0) return { ok: true, skipped: 'no_ferry' }

  const items = rows.map((r) => ({ id: r.id as string, meta: (r.metadata ?? {}) as FerryItemMetadata }))
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
      await writeMeta(supabase, outbound.id, { ...outbound.meta, reserve_state: 'failed' })
      const msg = (result.errors ?? []).join('; ') || 'provider rejected reservation'
      return { ok: false, error: `ferry reservation rejected: ${msg}` }
    }

    // Persist the reservation onto the outbound anchor. CRITICAL: if this write
    // fails the booking EXISTS at the provider but we lost the PNR → manual reconcile.
    const persisted: FerryItemMetadata = {
      ...outbound.meta,
      reserve_state: 'reserved',
      reservation_id: result.providerReservationId,
      reservation_guid: result.providerReservationGuid,
      vouchers: result.vouchers,
    }
    const ok = await writeMeta(supabase, outbound.id, persisted)
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

// jsonb is written whole (Supabase does not partial-merge). Mirrors issuePolicy.
async function writeMeta(supabase: SupabaseAdmin, itemId: string, metadata: FerryItemMetadata): Promise<boolean> {
  const { error } = await supabase
    .from('trip_items')
    .update({ metadata, updated_at: new Date().toISOString() })
    .eq('id', itemId)
  if (error) {
    console.error('[reserveFerry] metadata write failed for item', itemId, error.message)
    return false
  }
  return true
}
