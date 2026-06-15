import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { sendBookingConfirmation } from '@/lib/email/send-confirmation'
import { isPlaceholderEmail } from '@/lib/walk-in-email'

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
      .select('item_type, title, scheduled_at, price_amount')
      .eq('trip_id', tripId)
      .order('sequence', { ascending: true })

    await sendBookingConfirmation(claimed.contact_email, {
      paid:         true,
      reference:    claimed.reference,
      customerName,
      contactPhone: claimed.contact_phone,
      contactEmail: claimed.contact_email,
      totalAmount:  claimed.total_amount,
      currency:     claimed.currency,
      locale:       claimed.locale,
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
    console.error('[paid-email] send failed (non-fatal, claim kept):', msg)
  }
}
