import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { issuePolicy } from '@/lib/insurance/issue-policy'

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

const CONFIRM_SIDE_EFFECTS: ConfirmSideEffect[] = [confirmCarBookings, issuePolicyEffect]

/**
 * Idempotently confirm a trip. Flips trips→confirmed (FATAL: returns {ok:false}
 * so the caller can fail the request), then runs every confirmed-side-effect
 * (each NON-FATAL + self-gating). Does NOT send email — the caller decides
 * (webhook main path sends, heal path skips, admin will send). Already-confirmed
 * trips skip the flip but still run side-effects (all idempotent).
 */
export async function confirmTrip(tripId: string): Promise<ConfirmTripResult> {
  const supabase = getSupabaseAdmin()

  const { data: cur, error: readErr } = await supabase
    .from('trips')
    .select('state')
    .eq('id', tripId)
    .maybeSingle()
  if (readErr) return { ok: false, error: readErr.message }

  const alreadyConfirmed = cur?.state === 'confirmed'

  if (!alreadyConfirmed) {
    const { error: updErr } = await supabase
      .from('trips')
      .update({ state: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', tripId)
    if (updErr) return { ok: false, error: updErr.message }
  }

  for (const effect of CONFIRM_SIDE_EFFECTS) {
    await effect(supabase, tripId)
  }

  return { ok: true, alreadyConfirmed }
}
