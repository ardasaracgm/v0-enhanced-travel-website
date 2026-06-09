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
import { sendBookingConfirmation } from '@/lib/email/send-confirmation'
import { issuePolicy } from '@/lib/insurance/issue-policy'

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

  // (f) amount cross-check (minor-unit integer cents). Mismatch = high-priority
  //     alert, NO state change, but 200 — a wrong amount will not fix on retry.
  const expectedCents = Math.round(trip.total_amount * 100)
  if (expectedCents !== ev.Amount) {
    console.error('[viva-webhook] amount_mismatch', {
      reference: trip.reference,
      expected: expectedCents,
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
      event_type_id: eventTypeId,
      status_id:     ev.StatusId,
      raw_amount:    ev.Amount,
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
        return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
      }

      if (cur?.state === 'pending_payment') {
        const { error: healErr } = await supabase
          .from('trips')
          .update({ state: 'confirmed', confirmed_at: new Date().toISOString() })
          .eq('id', trip.id)
        if (healErr) {
          console.error(`[viva-webhook] heal state update failed for trip ${trip.reference}:`, healErr.message)
          return NextResponse.json({ error: 'state_update_failed' }, { status: 500 })
        }
        console.info(`[viva-webhook] trip ${trip.reference} healed to confirmed (no email)`)
        // Heal de confirmed'e geçirdi → poliçe oluştur (NON-FATAL, idempotent).
        await tryIssuePolicy(trip.id)
      }
      // already confirmed (or any other state) → nothing to do.
      return NextResponse.json({ ok: true, idempotent: 'payment_exists' })
    }
    console.error(`[viva-webhook] payment insert failed for trip ${trip.reference}:`, payErr.message)
    return NextResponse.json({ error: 'payment_insert_failed' }, { status: 500 })
  }

  // (h) flip trip state → confirmed.
  const { error: updErr } = await supabase
    .from('trips')
    .update({ state: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', trip.id)

  if (updErr) {
    console.error(`[viva-webhook] state update failed for trip ${trip.reference}:`, updErr.message)
    return NextResponse.json({ error: 'state_update_failed' }, { status: 500 })
  }

  // Ödeme onaylandı → Auras poliçesini oluştur (NON-FATAL: hata webhook'u 500'e
  // düşürmez; B4c admin backstop devreye girer). Mail'den bağımsız, sırası önemsiz.
  await tryIssuePolicy(trip.id)

  // (i) confirmation email (paid=true) — FIRST successful confirm only. Lead
  //     passenger drives the name with a safe fallback; an email failure must
  //     NEVER fail the webhook. (The NOTE-3 heal path above intentionally skips this.)
  try {
    const { data: lead } = await supabase
      .from('passengers')
      .select('first_name, last_name')
      .eq('trip_id', trip.id)
      .eq('is_lead', true)
      .maybeSingle()

    const leadName = [lead?.first_name, lead?.last_name]
      .filter((s): s is string => !!s && s.trim().length > 0)
      .join(' ')
      .trim()
    const customerName = leadName || 'Traveler' // fallback — never blank/undefined

    const { data: items } = await supabase
      .from('trip_items')
      .select('item_type, title, scheduled_at, price_amount')
      .eq('trip_id', trip.id)
      .order('sequence', { ascending: true })

    await sendBookingConfirmation(trip.contact_email, {
      paid:         true,
      reference:    trip.reference,
      customerName,
      contactPhone: trip.contact_phone,
      contactEmail: trip.contact_email,
      totalAmount:  trip.total_amount,
      currency:     trip.currency,
      locale:       trip.locale,
      items: (items ?? []).map((i) => ({
        type:        i.item_type,
        title:       i.title,
        scheduledAt: i.scheduled_at,
        price:       i.price_amount,
      })),
      paymentWhatsAppUrl: '', // unused on the paid path (no WhatsApp CTA rendered)
    })
  } catch (emailErr) {
    const msg = emailErr instanceof Error ? emailErr.message : String(emailErr)
    console.error('[viva-webhook] confirmation email failed (non-fatal):', msg)
  }

  console.info(`[viva-webhook] trip ${trip.reference} confirmed`)
  return NextResponse.json({ ok: true, confirmed: trip.reference })
}

/**
 * Poliçe oluşturmayı NON-FATAL sarar: webhook hiçbir koşulda 500'e düşmemeli
 * (500 → Viva retry → already-confirmed guard → poliçe BİR DAHA denenmez). Hata →
 * 200 + log; B4c admin "poliçe oluştur" backstop'u devreye girer. issuePolicy zaten
 * idempotent + {ok:false} döner; buradaki try/catch throw'a karşı ekstra savunma.
 */
async function tryIssuePolicy(tripId: string): Promise<void> {
  try {
    const r = await issuePolicy(tripId)
    if (r.ok) {
      if (r.skipped === 'no_insurance') return // sigortasız booking — normal, sessiz
      if (r.skipped === 'already_issued') {
        console.info(`[viva-webhook] policy already issued for trip ${tripId} (idempotent)`)
      } else {
        console.log(`[viva-webhook] policy issued for trip ${tripId} (police ${r.policeNum})`)
      }
    } else {
      console.error(`[viva-webhook] issuePolicy failed for trip ${tripId} — admin backstop needed: ${r.error}`)
    }
  } catch (err) {
    console.error(`[viva-webhook] issuePolicy threw for trip ${tripId}:`, err instanceof Error ? err.message : err)
  }
}
