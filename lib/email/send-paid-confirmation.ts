import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { sendBookingConfirmation } from '@/lib/email/send-confirmation'
import { isPlaceholderEmail } from '@/lib/walk-in-email'
import { ferryVoucherSections } from '@/lib/ferry/voucher-split'
import type { FerryItemMetadata } from '@/lib/supabase'

/**
 * Race-safe, single-owner paid (confirmed) confirmation email.
 *
 * Multiple confirm paths can fire for one trip (the async Viva webhook, the
 * success-URL action, the 23505 heal path, the admin manual confirm). Each calls
 * this; the ATOMIC claim below — UPDATE … WHERE confirmation_email_sent_at IS
 * NULL — lets exactly ONE caller win (Postgres serialises the concurrent updates
 * via the row lock). The winner sends; everyone else no-ops. A send failure does
 * NOT roll back the claim: a duplicate email is worse than a rare missed one
 * (admin backstop recovers it), and this keeps a double-send impossible.
 *
 * Fully self-contained (looks up everything from tripId) and non-fatal — never
 * throws, so it can never fail the confirm request.
 */
export async function claimAndSendPaidEmail(tripId: string): Promise<void> {
  const supabase = getSupabaseAdmin()

  // Atomic single-owner claim. 0 rows back = someone else owns the email.
  const { data: claimed, error: claimErr } = await supabase
    .from('trips')
    .update({ confirmation_email_sent_at: new Date().toISOString() })
    .eq('id', tripId)
    .is('confirmation_email_sent_at', null)
    .select('reference, contact_email, contact_phone, total_amount, currency, locale')
    .maybeSingle()

  if (claimErr) {
    console.error('[paid-email] claim failed (non-fatal):', claimErr.message)
    return
  }
  if (!claimed) return // already claimed elsewhere → send nothing.

  // Walk-in placeholder (.local) addresses never receive mail (bounce guard).
  // The claim is already stamped, so this won't be retried — intended.
  if (isPlaceholderEmail(claimed.contact_email)) return

  try {
    const { data: lead } = await supabase
      .from('passengers')
      .select('first_name, last_name')
      .eq('trip_id', tripId)
      .eq('is_lead', true)
      .maybeSingle()

    const leadName = [lead?.first_name, lead?.last_name]
      .filter((s): s is string => !!s && s.trim().length > 0)
      .join(' ')
      .trim()
    const customerName = leadName || 'Traveler' // fallback — never blank/undefined

    const { data: items } = await supabase
      .from('trip_items')
      .select('id, item_type, title, scheduled_at, price_amount, metadata')
      .eq('trip_id', tripId)
      .order('sequence', { ascending: true })

    // Ferry vouchers (Dentur reservation refs) — Dentur-style per-leg sections
    // (Voucher No + PNRs, split by expeditionId). Shared with the trip-detail page.
    // reserveFerry ran in confirmTrip before this email, so a reserved leg has the
    // data; a failed/pending reserve simply yields no voucher block.
    const ferryLegs = (items ?? [])
      .filter((i) => i.item_type === 'ferry')
      .map((i, idx) => ({ id: String(i.id ?? idx), meta: (i.metadata ?? {}) as FerryItemMetadata }))
    const ferryVouchers = ferryVoucherSections(ferryLegs)

    await sendBookingConfirmation(claimed.contact_email, {
      paid:         true,
      reference:    claimed.reference,
      customerName,
      contactPhone: claimed.contact_phone,
      contactEmail: claimed.contact_email,
      totalAmount:  claimed.total_amount,
      currency:     claimed.currency,
      locale:       claimed.locale,
      items: (items ?? []).map((i) => {
        // Ferry: print raw wall-clock times verbatim (see formatFerryWhen — the
        // stored instant would otherwise render server-local/UTC on the voucher).
        const fm =
          i.item_type === 'ferry'
            ? (i.metadata as { departure_time?: string; arrival_time?: string } | null)
            : null
        // Transfer prints RAW leg dates (metadata); scheduled_at can be absent and
        // the midnight+03:00 instant would tz-shift — align with the trip-detail row.
        const tm =
          i.item_type === 'transfer'
            ? (i.metadata as { outbound?: { date?: string }; return?: { date?: string } } | null)
            : null
        return {
          type:          i.item_type,
          title:         i.title,
          scheduledAt:   i.scheduled_at,
          departureTime: fm?.departure_time ?? null,
          arrivalTime:   fm?.arrival_time ?? null,
          startDate:     tm ? tm.outbound?.date ?? tm.return?.date ?? null : null,
          endDate:       tm && tm.outbound?.date && tm.return?.date ? tm.return.date : null,
          price:         i.price_amount,
        }
      }),
      ferryVouchers,
      paymentWhatsAppUrl: '', // unused on the paid path (no WhatsApp CTA rendered)
    })
  } catch (emailErr) {
    const msg = emailErr instanceof Error ? emailErr.message : String(emailErr)
    console.error('[paid-email] send failed (non-fatal, claim kept):', msg)
  }
}
