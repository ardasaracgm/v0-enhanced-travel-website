import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { sendBookingConfirmation } from '@/lib/email/send-confirmation'
import { isPlaceholderEmail } from '@/lib/walk-in-email'
import { groupFerryLegs } from '@/lib/ferry/group-legs'
import { expeditionIdFromFerryId } from '@/lib/ferry/reconcile'
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

    // Ferry vouchers (Dentur reservation refs), ONE section per leg so each route
    // lists only its own passengers — mirrors the Dentur voucher. A round-trip is
    // ONE reservation: its reservation_id + EVERY PNR live on the outbound anchor,
    // so we split those PNRs back to each leg by expeditionId (the same leg-match
    // key reconcile uses — NOT ticketDirection). Open-jaw → each one-way group
    // carries its own reservation_id. reserveFerry ran in confirmTrip before this
    // email, so a reserved leg has the data; a failed/pending reserve yields no
    // block. If a PNR can't be matched to a leg (older/partial data) we fall back
    // to a single section with all the group's PNRs — never a PNR on the wrong route.
    const safeExpId = (ferryId?: string): number | undefined => {
      try {
        return expeditionIdFromFerryId(ferryId)
      } catch {
        return undefined
      }
    }
    const ferryLegs = (items ?? [])
      .filter((i) => i.item_type === 'ferry')
      .map((i, idx) => ({ id: String(i.id ?? idx), meta: (i.metadata ?? {}) as FerryItemMetadata }))
    const ferryVouchers = groupFerryLegs(ferryLegs).flatMap((group) => {
      const anchor = group.anchor.meta
      if (typeof anchor.reservation_id !== 'number') return []
      const voucherNo = String(anchor.reservation_id)
      const all = anchor.vouchers ?? []
      const line = (v: { pnr: number; passengerName?: string }) => ({
        pnr: v.pnr,
        passengerName: v.passengerName || undefined,
      })
      // Clean per-leg split by expeditionId (each PNR → exactly one leg).
      const perLeg = group.legs.map((leg) => {
        const legExp = safeExpId(leg.meta.ferry_id)
        return {
          route: `${leg.meta.from_port} → ${leg.meta.to_port}`,
          pnrs: all.filter((v) => v.expeditionId != null && v.expeditionId === legExp).map(line),
        }
      })
      const matched = perLeg.reduce((n, l) => n + l.pnrs.length, 0)
      if (all.length > 0 && matched === all.length) {
        return perLeg.map((l) => ({ voucherNo, route: l.route, pnrs: l.pnrs }))
      }
      // Fallback: one section, all PNRs under the anchor's route.
      return [
        {
          voucherNo,
          route: anchor.from_port && anchor.to_port ? `${anchor.from_port} → ${anchor.to_port}` : undefined,
          pnrs: all.map(line),
        },
      ]
    })

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
        return {
          type:          i.item_type,
          title:         i.title,
          scheduledAt:   i.scheduled_at,
          departureTime: fm?.departure_time ?? null,
          arrivalTime:   fm?.arrival_time ?? null,
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
