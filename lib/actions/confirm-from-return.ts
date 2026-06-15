'use server'

/**
 * Server action: confirmFromReturn
 * ================================
 * Client-side half of Viva's double-confirm. When a payer returns to the
 * success URL, we do NOT wait for the asynchronous webhook — we confirm the
 * trip immediately by re-verifying the transaction against Viva, through the
 * SAME pipeline the webhook uses (processVivaTransaction). Fully idempotent:
 * whichever of {webhook, this action} runs first wins; the other no-ops via the
 * UNIQUE payment idempotency key (viva:{transactionId}) + the NOTE-3 heal.
 *
 * Email is deliberately NOT sent here — the webhook main path owns the single
 * Email is owned by the atomic confirmation_email_sent_at claim inside the
 * pipeline — whichever confirmer wins the claim sends it, so this path no longer
 * needs a sendEmail flag and a duplicate is impossible.
 *
 * Identifiers come from Viva's success-URL query params: t={transactionId},
 * s={orderCode}.
 */

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { processVivaTransaction } from '@/lib/viva/process-transaction'

export interface ConfirmFromReturnInput {
  transactionId: string
  orderCode: string
}

export type ConfirmFromReturnResult = {
  state: 'confirmed' | 'pending' | 'not_found' | 'error'
}

export async function confirmFromReturn(
  input: ConfirmFromReturnInput,
): Promise<ConfirmFromReturnResult> {
  const transactionId = input.transactionId?.trim()
  const orderCode = input.orderCode?.trim()

  // 1. Both identifiers are required — reverify keys on transactionId, the trip
  //    is matched on orderCode. Missing either is unrecoverable here.
  if (!transactionId || !orderCode) {
    return { state: 'error' }
  }

  // 2. Shared confirm pipeline (idempotent). Paid email is claim-gated inside.
  let result: Awaited<ReturnType<typeof processVivaTransaction>>
  try {
    result = await processVivaTransaction({ transactionId, orderCode })
  } catch (err) {
    console.error('[confirmFromReturn] processVivaTransaction threw:', err)
    return { state: 'error' }
  }

  // 3. Map the pipeline's HTTP-shaped result to a UI state.
  if (result.httpStatus === 500) {
    return { state: 'error' }
  }
  const ignored = typeof result.body.ignored === 'string' ? result.body.ignored : null
  if (ignored === 'trip_not_found') {
    return { state: 'not_found' }
  }
  // Security rejects — the transaction will never legitimately confirm this trip.
  if (ignored === 'reverify_amount' || ignored === 'reverify_ordercode') {
    return { state: 'error' }
  }

  // 4. confirmed / idempotent payment_exists / reverify_status / reverify_not_found:
  //    read the AUTHORITATIVE current trip state (covers the heal path and a
  //    webhook that may have confirmed concurrently). Anything not yet confirmed
  //    is reported as pending so the client can poll a little longer.
  const supabase = getSupabaseAdmin()
  const { data: trip, error } = await supabase
    .from('trips')
    .select('state')
    .eq('viva_order_code', orderCode)
    .maybeSingle()
  if (error) {
    console.error('[confirmFromReturn] trip state re-read failed:', error.message)
    return { state: 'error' }
  }
  if (!trip) {
    return { state: 'not_found' }
  }
  return { state: trip.state === 'confirmed' ? 'confirmed' : 'pending' }
}
