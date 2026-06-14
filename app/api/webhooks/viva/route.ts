/**
 * Viva Wallet webhook handler.
 * ============================
 * Sprint 5 Part B. Flips a trip pending_payment → confirmed when Viva reports a
 * successful Transaction Payment Created (EventTypeId 1796, StatusId 'F').
 *
 * GET  — Viva's webhook verification handshake. Not a stored secret: we fetch a
 *        key live from Viva (Basic auth) and echo it as { "Key": "<value>" }.
 * POST — the payment event. Idempotent: Viva retries up to 24×/hr.
 *
 * Node runtime is required: service-role Supabase client + Buffer base64.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { fetchWebhookVerificationKey } from '@/lib/viva/client'
import { processVivaTransaction } from '@/lib/viva/process-transaction'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET — webhook URL verification.
 * Viva calls this on registration (and periodically) expecting { "Key": ... }.
 * fetchWebhookVerificationKey() throws if VIVA_MERCHANT_ID / VIVA_API_KEY are
 * unset or Viva rejects the Basic-auth call — we surface that as 500 with a
 * clear log, never an empty/invalid key.
 */
export async function GET(): Promise<Response> {
  try {
    const key = await fetchWebhookVerificationKey()
    return NextResponse.json({ Key: key })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[viva-webhook] GET verification failed:', msg)
    return NextResponse.json({ error: 'verification_failed' }, { status: 500 })
  }
}

/** Viva webhook event envelope — only the fields we consume. */
interface VivaWebhookBody {
  EventTypeId?: number
  EventData?: {
    OrderCode?: number | string
    StatusId?: string
    Amount?: number
    TransactionId?: number | string
  }
}

// Transaction Payment Created — the only event Part B acts on.
const VIVA_EVENT_TRANSACTION_PAYMENT_CREATED = 1796

/**
 * POST — the payment event. Idempotent (Viva retries up to 24×/hr).
 * Every non-confirm exit returns 200 so Viva stops retrying a permanently
 * un-actionable event; only genuine unexpected DB failures return 500.
 */
export async function POST(req: NextRequest): Promise<Response> {
  // (a) parse JSON — malformed body is not retryable, ack with 200.
  let body: VivaWebhookBody
  try {
    body = (await req.json()) as VivaWebhookBody
  } catch {
    console.error('[viva-webhook] POST body was not valid JSON')
    return NextResponse.json({ ok: true, ignored: 'invalid_json' })
  }

  const eventTypeId = body.EventTypeId
  const ev = body.EventData ?? {}

  // (b) only EventTypeId 1796 is in scope; everything else is a no-op 200.
  if (eventTypeId !== VIVA_EVENT_TRANSACTION_PAYMENT_CREATED) {
    return NextResponse.json({ ok: true, ignored: 'event_type', eventTypeId })
  }

  const orderCode = ev.OrderCode != null ? String(ev.OrderCode) : null
  if (!orderCode) {
    console.warn('[viva-webhook] 1796 event missing OrderCode')
    return NextResponse.json({ ok: true, ignored: 'missing_order_code' })
  }

  const supabase = getSupabaseAdmin()

  // (c) look up trip by viva_order_code — string compare (Part A stored a string).
  const { data: trip, error: tripErr } = await supabase
    .from('trips')
    .select('id, state, total_amount, currency, contact_email, contact_phone, reference, locale')
    .eq('viva_order_code', orderCode)
    .maybeSingle()

  // NOTE 1: two DISTINCT branches — a genuine DB error is retryable (500); a
  // simply-absent trip is not (200 + warn).
  if (tripErr) {
    console.error('[viva-webhook] trip lookup failed:', tripErr.message)
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
  }
  if (!trip) {
    console.warn(`[viva-webhook] no trip for OrderCode ${orderCode}`)
    return NextResponse.json({ ok: true, ignored: 'trip_not_found' })
  }

  // (d) idempotency guard #1 — already confirmed: write nothing, send no email.
  if (trip.state === 'confirmed') {
    console.info(`[viva-webhook] trip ${trip.reference} already confirmed — no-op`)
    return NextResponse.json({ ok: true, idempotent: 'already_confirmed' })
  }

  // (e) confirm only on StatusId 'F'.
  if (ev.StatusId !== 'F') {
    console.info(`[viva-webhook] trip ${trip.reference} StatusId=${ev.StatusId ?? 'none'} — not confirming`)
    return NextResponse.json({ ok: true, ignored: 'status_not_final' })
  }

  // (f) amount cross-check. Viva's EventData.Amount is the MAJOR currency unit
  //     (EUR), NOT cents — round BOTH sides to cents for an integer equality
  //     check (dodges float equality). Mismatch = high-priority alert, NO state
  //     change, but 200 — a wrong amount will not fix on retry.
  const expectedCents = Math.round(trip.total_amount * 100)
  if (Math.round((ev.Amount ?? 0) * 100) !== expectedCents) {
    console.error('[viva-webhook] amount_mismatch', {
      reference: trip.reference,
      expected: trip.total_amount,
      received: ev.Amount,
      orderCode,
    })
    return NextResponse.json({ ok: true, ignored: 'amount_mismatch' })
  }

  // NOTE 2: a 1796/'F' event MUST carry a TransactionId (it keys the payment row
  // and the idempotency key). On a successful payment its absence is anomalous —
  // 500 + retry, never a 200 no-op that would silently swallow a real payment.
  const transactionId = ev.TransactionId != null ? String(ev.TransactionId) : null
  if (!transactionId) {
    console.error(`[viva-webhook] ALERT 1796/'F' for trip ${trip.reference} missing TransactionId`)
    return NextResponse.json({ error: 'missing_transaction_id' }, { status: 500 })
  }

  // (g0..i) shared confirm pipeline — reverify + payment + confirmTrip + email.
  //         Extracted to processVivaTransaction so the success-URL action can
  //         share the SAME path. The EventData-based pre-filters (a..f) above
  //         STAY here; the function starts at server-side re-verification and
  //         returns the exact { httpStatus, body } this route used to emit.
  const result = await processVivaTransaction({
    transactionId,
    orderCode,
    sendEmail: true,
    paymentMetadata: {
      event_type_id: eventTypeId,
      status_id:     ev.StatusId,
      raw_amount:    ev.Amount,
    },
  })
  return NextResponse.json(
    result.body,
    result.httpStatus === 200 ? undefined : { status: result.httpStatus },
  )
}
