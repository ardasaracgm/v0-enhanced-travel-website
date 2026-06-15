import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getTransaction } from '@/lib/viva/client'
import { claimAndSendPaidEmail } from '@/lib/email/send-paid-confirmation'
import { confirmTrip } from '@/lib/trips/confirm'

export interface ProcessVivaTransactionInput {
  /** Viva transaction id — keys the payment row + drives re-verification. */
  transactionId: string
  /** Viva order code — matches the trip and guards (g0.3). */
  orderCode: string
  /** Provenance written verbatim into the payment row metadata. The webhook
   *  passes the EventData fields; other callers may omit them. */
  paymentMetadata?: {
    event_type_id?: number
    status_id?: string
    raw_amount?: number
  }
}

/** Mirrors the webhook's HTTP contract so the route can emit the same status+body. */
export interface ProcessVivaTransactionResult {
  httpStatus: 200 | 500
  body: Record<string, unknown>
}

/**
 * Shared Viva confirm pipeline: server-side re-verification → payment row
 * (idempotent) → confirmTrip → race-safe paid email (single-owner claim).
 * Extracted from the webhook POST handler (steps g0..i) so the webhook and the
 * success-URL action share ONE confirm path. Every 200/500 split and the NOTE-3
 * 23505 heal are preserved exactly; the paid email is now owned by the atomic
 * confirmation_email_sent_at claim (claimAndSendPaidEmail), so EVERY path may
 * attempt it and exactly one wins — no sendEmail flag needed.
 *
 * Self-contained: re-looks-up the trip by orderCode so callers need only the two
 * Viva identifiers. (The webhook also looks the trip up earlier for its
 * EventData-based pre-filters; that lookup is unchanged and stays in the route.)
 */
export async function processVivaTransaction(
  input: ProcessVivaTransactionInput,
): Promise<ProcessVivaTransactionResult> {
  const { transactionId, orderCode } = input
  const supabase = getSupabaseAdmin()

  // trip lookup by viva_order_code (mirrors webhook (c) + NOTE 1).
  const { data: trip, error: tripErr } = await supabase
    .from('trips')
    .select('id, state, total_amount, currency, contact_email, contact_phone, reference, locale')
    .eq('viva_order_code', orderCode)
    .maybeSingle()
  if (tripErr) {
    console.error('[viva-webhook] trip lookup failed:', tripErr.message)
    return { httpStatus: 500, body: { error: 'lookup_failed' } }
  }
  if (!trip) {
    console.warn(`[viva-webhook] no trip for OrderCode ${orderCode}`)
    return { httpStatus: 200, body: { ok: true, ignored: 'trip_not_found' } }
  }

  // (g0) server-side RE-VERIFICATION — never trust the unauthenticated webhook
  //      POST alone. Fetch the transaction from Viva (OAuth2) and confirm it
  //      against Viva's own record before flipping state.
  //      Error split: a Viva 404 means no such transaction (forged/unknown) →
  //      permanent, ack 200; any other fetch failure is transient → 500 retry.
  let tx: Awaited<ReturnType<typeof getTransaction>>
  try {
    tx = await getTransaction(transactionId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('HTTP 404')) {
      console.error(`[viva-webhook] reverify: Viva has no transaction ${transactionId} for trip ${trip.reference} — rejecting`)
      return { httpStatus: 200, body: { ok: true, ignored: 'reverify_not_found' } }
    }
    console.error(`[viva-webhook] reverify fetch failed for trip ${trip.reference}:`, msg)
    return { httpStatus: 500, body: { error: 'reverify_error' } }
  }

  // (g0.1) Viva's own status must be final/captured.
  if (tx.statusId !== 'F') {
    console.error('[viva-webhook] reverify_status', {
      reference:     trip.reference,
      transactionId,
      statusId:      tx.statusId,
      currencyCode:  tx.currencyCode,
    })
    return { httpStatus: 200, body: { ok: true, ignored: 'reverify_status' } }
  }

  // (g0.2) Viva's transaction amount is the MAJOR currency unit (EUR) — compare
  //        directly to trip.total_amount, NO ×100.
  if (tx.amount !== trip.total_amount) {
    console.error('[viva-webhook] reverify_amount', {
      reference:     trip.reference,
      transactionId,
      expected:      trip.total_amount,
      received:      tx.amount,
      statusId:      tx.statusId,
      currencyCode:  tx.currencyCode,
    })
    return { httpStatus: 200, body: { ok: true, ignored: 'reverify_amount' } }
  }

  // (g0.3) the transaction must belong to the order we matched the trip on.
  if (String(tx.orderCode) !== orderCode) {
    console.error('[viva-webhook] reverify_ordercode', {
      reference:     trip.reference,
      transactionId,
      expected:      orderCode,
      received:      String(tx.orderCode),
    })
    return { httpStatus: 200, body: { ok: true, ignored: 'reverify_ordercode' } }
  }

  // (g) idempotency guard #2 — write the payment row FIRST (before the state
  //     flip). idempotency_key is deterministic on the Viva transaction and the
  //     column is UNIQUE, so a duplicate delivery raises 23505.
  const { error: payErr } = await supabase.from('payments').insert({
    trip_id:         trip.id,
    amount:          trip.total_amount,
    currency:        trip.currency,
    provider:        'viva_wallet',
    provider_ref:    transactionId,
    state:           'completed',
    idempotency_key: `viva:${transactionId}`,
    metadata: {
      order_code:    orderCode,
      event_type_id: input.paymentMetadata?.event_type_id,
      status_id:     input.paymentMetadata?.status_id,
      raw_amount:    input.paymentMetadata?.raw_amount,
    },
    completed_at:    new Date().toISOString(),
  })

  if (payErr) {
    if (payErr.code === '23505') {
      // NOTE 3: duplicate delivery — payment already recorded on a prior attempt.
      // Idempotent success, BUT a prior delivery may have written the payment and
      // then failed the (h) flip, leaving the trip stuck in pending_payment. So
      // re-check the CURRENT state (not the stale read above) and heal it.
      // The heal path deliberately sends NO confirmation email: the original
      // attempt may already have sent it, and a duplicate email is worse than a
      // rare missed one (recoverable later via the admin panel).
      console.info(`[viva-webhook] payment for trip ${trip.reference} already processed (23505) — idempotent`)

      const { data: cur, error: curErr } = await supabase
        .from('trips')
        .select('state')
        .eq('id', trip.id)
        .maybeSingle()
      if (curErr) {
        console.error(`[viva-webhook] heal state re-check failed for trip ${trip.reference}:`, curErr.message)
        return { httpStatus: 500, body: { error: 'lookup_failed' } }
      }

      if (cur?.state === 'pending_payment') {
        const healRes = await confirmTrip(trip.id)
        if (!healRes.ok) {
          console.error(`[viva-webhook] heal state update failed for trip ${trip.reference}:`, healRes.error)
          return { httpStatus: 500, body: { error: 'state_update_failed' } }
        }
        console.info(`[viva-webhook] trip ${trip.reference} healed to confirmed`)
      }
      // Recover a possibly-missed paid email: a prior delivery may have written
      // the payment and died before sending. NULL-gated → no-op if already sent.
      await claimAndSendPaidEmail(trip.id)
      return { httpStatus: 200, body: { ok: true, idempotent: 'payment_exists' } }
    }
    console.error(`[viva-webhook] payment insert failed for trip ${trip.reference}:`, payErr.message)
    return { httpStatus: 500, body: { error: 'payment_insert_failed' } }
  }

  // (h) confirm the trip — flip state (fatal) + confirmed side-effects
  //     (car_bookings held→confirmed, policy issuance), all non-fatal.
  const confirmRes = await confirmTrip(trip.id)
  if (!confirmRes.ok) {
    console.error(`[viva-webhook] state update failed for trip ${trip.reference}:`, confirmRes.error)
    return { httpStatus: 500, body: { error: 'state_update_failed' } }
  }

  // (i) paid confirmation email — race-safe, single-owner. The claim decides the
  //     sole sender across the webhook, success-URL action and heal path; a
  //     non-winning caller sends nothing. Self-contained + non-fatal.
  await claimAndSendPaidEmail(trip.id)

  console.info(`[viva-webhook] trip ${trip.reference} confirmed`)
  return { httpStatus: 200, body: { ok: true, confirmed: trip.reference } }
}
