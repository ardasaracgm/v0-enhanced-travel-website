'use server'

/**
 * Server action: createPaymentOrder
 * ==================================
 * Creates a Viva Wallet Smart Checkout order for an existing trip.
 *
 * The authoritative amount comes from trips.total_amount in Supabase —
 * the client never sends a price. This mirrors the same principle as
 * the server-side price lookup in submitBooking.
 *
 * Idempotency: if the trip already has a viva_order_code (previous
 * call succeeded but the response was lost), we return the existing
 * checkout URL rather than creating a duplicate order.
 *
 * The action is intentionally called AFTER createTrip, so the trip is
 * already in pending_payment state before we touch Viva.
 */

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { vivaRequest, getVivaCheckoutUrl } from '@/lib/viva/client'
import type { Locale } from '@/lib/notifications/whatsapp-link'

const SOURCE_CODE = process.env.VIVA_SOURCE_CODE ?? ''
const SITE_URL    = process.env.NEXT_PUBLIC_SITE_URL ?? ''

export interface CreatePaymentOrderInput {
  tripId: string
  locale: Locale
}

export type CreatePaymentOrderResult =
  | { ok: true; orderCode: string; redirectUrl: string }
  | { ok: false; error: string }

interface VivaCreateOrderRequest {
  amount:          number
  customerTrns:    string
  merchantTrns:    string
  customer:        { email: string }
  paymentTimeout:  number
  preauth:         boolean
  allowRecurring:  boolean
  maxInstallments: number
  disableCash:     boolean
  sourceCode:      string
  successUrl:      string
  failUrl:         string
}

interface VivaCreateOrderResponse {
  orderCode: number
}

export async function createPaymentOrder(
  input: CreatePaymentOrderInput,
): Promise<CreatePaymentOrderResult> {
  const supabase = getSupabaseAdmin()

  // 1. Read authoritative amount + state from DB — price never from client
  const { data: trip, error: tripErr } = await supabase
    .from('trips')
    .select('id, reference, total_amount, contact_email, state, viva_order_code')
    .eq('id', input.tripId)
    .maybeSingle()

  if (tripErr || !trip) {
    return { ok: false, error: `Trip not found: ${input.tripId}` }
  }

  if (trip.state !== 'pending_payment') {
    return {
      ok: false,
      error: `Trip ${trip.reference} is in state '${trip.state}', expected 'pending_payment'`,
    }
  }

  // 2. Idempotency: reuse existing order if one was already created for this trip
  if (trip.viva_order_code) {
    return {
      ok: true,
      orderCode:   trip.viva_order_code as string,
      redirectUrl: getVivaCheckoutUrl(trip.viva_order_code as string),
    }
  }

  // 3. Per-locale return URLs — override the source defaults set in Viva panel,
  //    so users return to their active locale after payment or cancellation.
  const successUrl = `${SITE_URL}/${input.locale}/confirmation`
  const failUrl    = `${SITE_URL}/${input.locale}/checkout?status=failed`

  // 4. Create order — amount in smallest currency unit (cents for EUR)
  const amountCents = Math.round(Number(trip.total_amount) * 100)

  let orderCode: string
  try {
    const payload: VivaCreateOrderRequest = {
      amount:          amountCents,
      customerTrns:    trip.reference,   // shown on Viva's payment page
      merchantTrns:    trip.reference,   // cross-reference in Viva merchant panel
      customer:        { email: trip.contact_email },
      paymentTimeout:  3600,
      preauth:         false,
      allowRecurring:  false,
      maxInstallments: 0,
      disableCash:     true,
      sourceCode:      SOURCE_CODE,
      successUrl,
      failUrl,
    }

    const response = await vivaRequest<VivaCreateOrderResponse>(
      'POST',
      '/checkout/v2/orders',
      payload,
    )
    orderCode = String(response.orderCode)
  } catch (err) {
    console.error('[createPaymentOrder] Viva API error:', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Viva API request failed',
    }
  }

  // 5. Persist orderCode on the trip row so the webhook (Part B) can look it up.
  //    Non-fatal if this update fails: the trip is in DB, the Viva order exists,
  //    and we return the redirect URL. The cross-reference will be missing until
  //    the admin or a retry reconciles it.
  const { error: updateErr } = await supabase
    .from('trips')
    .update({ viva_order_code: orderCode })
    .eq('id', trip.id)

  if (updateErr) {
    console.error('[createPaymentOrder] Failed to persist viva_order_code on trip:', updateErr)
  }

  return {
    ok: true,
    orderCode,
    redirectUrl: getVivaCheckoutUrl(orderCode),
  }
}
