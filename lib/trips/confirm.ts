import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { issuePolicy } from '@/lib/insurance/issue-policy'
import { reserveFerry } from '@/lib/ferry/reserve-ferry'
import { claimAndNotifyTransferOperator } from '@/lib/email/send-transfer-operator-email'

export type ConfirmTripResult =
  | { ok: true; alreadyConfirmed: boolean }
  | { ok: false; error: string }

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>

/**
 * A confirmed-side-effect: a server-side mutation that should run whenever a
 * trip becomes confirmed (Viva webhook today, manual admin confirm next). Each
 * MUST be NON-FATAL (log, never throw/return failure) and self-gating (a no-op
 * when the trip has no matching items). Add a new service by appending one fn.
 */
type ConfirmSideEffect = (supabase: SupabaseAdmin, tripId: string) => Promise<void>

// car_rental → promote this trip's held inventory holds to confirmed so the
// availability engine stops releasing them after HOLD_EXPIRY. No-op (0 rows)
// when the trip has no car. Mirrors submit-booking's non-fatal car_bookings insert.
const confirmCarBookings: ConfirmSideEffect = async (supabase, tripId) => {
  const { error } = await supabase
    .from('car_bookings')
    .update({ state: 'confirmed' })
    .eq('trip_id', tripId)
    .eq('state', 'held')
  if (error) {
    console.error(`[confirmTrip] car_bookings confirm failed for ${tripId} (non-fatal):`, error.message)
  }
}

// insurance → issue the Auras policy. issuePolicy is idempotent and returns
// skipped:'no_insurance' for trips without insurance (no-op). Logging matches
// the prior webhook tryIssuePolicy verbatim.
const issuePolicyEffect: ConfirmSideEffect = async (_supabase, tripId) => {
  try {
    const r = await issuePolicy(tripId)
    if (r.ok) {
      if (r.skipped === 'no_insurance') return
      if (r.skipped === 'already_issued') {
        console.info(`[confirmTrip] policy already issued for trip ${tripId} (idempotent)`)
      } else if (r.skipped === 'issuing_in_progress') {
        console.info(`[confirmTrip] policy issue in progress by concurrent run for trip ${tripId} — skipped`)
      } else {
        console.log(`[confirmTrip] policy issued for trip ${tripId} (police ${r.policeNum})`)
      }
    } else {
      console.error(`[confirmTrip] issuePolicy failed for trip ${tripId} — admin backstop needed: ${r.error}`)
    }
  } catch (err) {
    console.error(`[confirmTrip] issuePolicy threw for trip ${tripId}:`, err instanceof Error ? err.message : err)
  }
}

// ferry → reserve the leg(s) with the provider (Dentur CreateReservation) once
// the trip is paid. reserveFerry is idempotent (reserve_state machine) and returns
// skipped:'no_ferry' for trips without a ferry (no-op). Mirrors issuePolicyEffect.
const reserveFerryEffect: ConfirmSideEffect = async (_supabase, tripId) => {
  try {
    const r = await reserveFerry(tripId)
    if (r.ok) {
      if (r.skipped === 'no_ferry') return
      if (r.skipped === 'already_reserved') {
        console.info(`[confirmTrip] ferry already reserved for trip ${tripId} (idempotent)`)
      } else if (r.skipped === 'reserving_in_progress') {
        console.info(`[confirmTrip] ferry reserve in progress by concurrent run for trip ${tripId} — skipped`)
      } else {
        console.log(`[confirmTrip] ferry reserved for trip ${tripId} (reservation ${r.reservationId})`)
      }
    } else {
      console.error(`[confirmTrip] reserveFerry failed for trip ${tripId} — admin backstop needed: ${r.error}`)
    }
  } catch (err) {
    console.error(`[confirmTrip] reserveFerry threw for trip ${tripId}:`, err instanceof Error ? err.message : err)
  }
}

// transfer → e-mail the operator (Sena Grup / Milas Transfer) the paid booking.
// There is no operator API, so this mail IS the handoff. claimAndNotifyTransferOperator
// is idempotent (trips.transfer_operator_notified_at claim, migration 034) and returns
// skipped:'no_transfer' for trips without a transfer (no-op). Mirrors reserveFerryEffect.
const notifyTransferOperatorEffect: ConfirmSideEffect = async (_supabase, tripId) => {
  try {
    const r = await claimAndNotifyTransferOperator(tripId)
    if (r.ok) {
      if (r.skipped === 'no_transfer') return
      if (r.skipped === 'already_notified') {
        console.info(`[confirmTrip] transfer operator already notified for trip ${tripId} (idempotent)`)
      } else if (r.skipped === 'no_operator_email') {
        // Not an error in dev/preview; in prod it means a paid transfer nobody told
        // the firm about → the NULL stamp is the admin backstop signal.
        console.warn(`[confirmTrip] TRANSFER_OPERATOR_EMAIL unset — operator notice skipped for trip ${tripId}`)
      } else if (r.skipped === 'no_mailer') {
        console.warn(`[confirmTrip] RESEND_API_KEY unset — operator notice skipped for trip ${tripId}`)
      } else {
        console.log(`[confirmTrip] transfer operator notified for trip ${tripId}`)
      }
    } else {
      console.error(`[confirmTrip] notifyTransferOperator failed for trip ${tripId} — admin backstop needed: ${r.error}`)
    }
  } catch (err) {
    console.error(`[confirmTrip] notifyTransferOperator threw for trip ${tripId}:`, err instanceof Error ? err.message : err)
  }
}

const CONFIRM_SIDE_EFFECTS: ConfirmSideEffect[] = [
  confirmCarBookings,
  issuePolicyEffect,
  reserveFerryEffect,
  notifyTransferOperatorEffect,
]

/**
 * Idempotently confirm a trip. Flips trips→confirmed (FATAL: returns {ok:false}
 * so the caller can fail the request), then runs every confirmed-side-effect
 * (each NON-FATAL + self-gating). Does NOT send email — the caller decides
 * (webhook main path sends, heal path skips, admin will send). Already-confirmed
 * trips skip the flip but still run side-effects (all idempotent).
 */
export async function confirmTrip(tripId: string): Promise<ConfirmTripResult> {
  const supabase = getSupabaseAdmin()

  // Atomic flip: the conditional WHERE state='pending_payment' means exactly ONE
  // concurrent caller flips the row (1 row back = "I am the first confirmer"); a
  // racing caller (or a webhook re-delivery) matches 0 rows. Replaces the old
  // read-then-write, so confirmed_at is never double-written and wonConfirm is a
  // reliable first-confirmer signal.
  const { data: flipped, error: updErr } = await supabase
    .from('trips')
    .update({ state: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', tripId)
    .eq('state', 'pending_payment')
    .select('id')
    .maybeSingle()
  if (updErr) return { ok: false, error: updErr.message }

  const wonConfirm = flipped !== null

  // Side-effects ALWAYS run (NOT gated on wonConfirm): each is idempotent +
  // self-gating, and running them on every call is the resumable backstop for a
  // prior confirm whose side-effect failed. (C-2 closes the issuePolicy double-
  // order window with its own lease — this loop deliberately does not dedupe.)
  for (const effect of CONFIRM_SIDE_EFFECTS) {
    await effect(supabase, tripId)
  }

  // alreadyConfirmed kept in the contract (no caller reads it today). Meaning is
  // now "the flip was not mine" — covers already-confirmed AND any non-pending
  // state (cancelled/expired); a caller needing that split would re-SELECT.
  return { ok: true, alreadyConfirmed: !wonConfirm }
}
