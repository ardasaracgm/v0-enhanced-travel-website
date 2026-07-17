import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getResend, FROM_FALLBACK } from './resend-client'
import { TRANSFER_REGIONS } from '@/lib/transfer-rates'
import type { TransferItemMetadata } from '@/lib/supabase'

/**
 * Race-safe, single-owner "yeni transfer rezervasyonu" notice to the transfer
 * operator (Sena Grup / Milas Transfer — TRANSFER_OPERATOR_EMAIL).
 *
 * Until now the chain ended at the customer: trip confirmed → customer email
 * (+ NOTIFY_ADDRESS BCC) → the firm that actually drives the transfer was never
 * told, so someone in the office had to read the BCC and phone them. This closes
 * that gap for both transfer sources (the standalone /transfer wizard and the
 * ferry-extras checkout — both persist a dated transfer trip_item).
 *
 * TR-only body: the operator is a Turkish firm. This deliberately does NOT reuse
 * sendOfficeNotification, which hardcodes `to = NOTIFY_ADDRESS` and forces a
 * TR+EN bilingual body — wrong recipient, wrong shape. Same mailer (getResend),
 * same env-gate + non-fatal contract.
 *
 * No pickup TIME is sent because none is collected: the wizard asks for the day
 * only, by design ("firma günü koordine eder"). The mail says so explicitly so
 * the firm knows to call the customer rather than wait for a time that is never
 * coming.
 *
 * Fully self-contained (looks up everything from tripId) and never throws — it
 * can never fail the confirm request.
 */
export type NotifyTransferOperatorResult =
  | { ok: true; skipped?: 'no_transfer' | 'no_operator_email' | 'no_mailer' | 'already_notified' }
  | { ok: false; error: string }

type TransferLegMeta = { route_id: string; vehicle_id: string; date?: string }

export async function claimAndNotifyTransferOperator(
  tripId: string,
): Promise<NotifyTransferOperatorResult> {
  const supabase = getSupabaseAdmin()

  // ---- gates BEFORE the claim ------------------------------------------------
  // Order matters: an unset env / missing mailer must NOT burn the claim, or the
  // trip would stay silently unnotified forever once the env is finally set.
  const operatorEmail = process.env.TRANSFER_OPERATOR_EMAIL?.trim()
  if (!operatorEmail) return { ok: true, skipped: 'no_operator_email' }

  const resend = getResend()
  if (!resend) return { ok: true, skipped: 'no_mailer' }

  // ---- self-gate: no transfer on this trip → no-op (ferry/car/insurance trips) -
  const { data: item, error: itemErr } = await supabase
    .from('trip_items')
    .select('metadata')
    .eq('trip_id', tripId)
    .eq('item_type', 'transfer')
    .maybeSingle()
  if (itemErr) return { ok: false, error: `transfer item lookup failed: ${itemErr.message}` }
  if (!item) return { ok: true, skipped: 'no_transfer' }

  const meta = (item.metadata ?? {}) as TransferItemMetadata & { passenger_count_info?: number }

  // ---- ATOMIC single-owner claim. 0 rows back = another path owns the notice. --
  const { data: claimed, error: claimErr } = await supabase
    .from('trips')
    .update({ transfer_operator_notified_at: new Date().toISOString() })
    .eq('id', tripId)
    .is('transfer_operator_notified_at', null)
    .select('reference, contact_email, contact_phone')
    .maybeSingle()
  if (claimErr) return { ok: false, error: `operator notice claim failed: ${claimErr.message}` }
  if (!claimed) return { ok: true, skipped: 'already_notified' }

  // ---- customer name — createTrip always writes a lead passenger row ----------
  const { data: lead } = await supabase
    .from('passengers')
    .select('first_name, last_name')
    .eq('trip_id', tripId)
    .eq('is_lead', true)
    .maybeSingle()
  const customerName =
    [lead?.first_name, lead?.last_name]
      .filter((s): s is string => !!s && s.trim().length > 0)
      .join(' ')
      .trim() || '—'

  const { subject, text } = composeOperatorEmail({
    reference: claimed.reference,
    customerName,
    contactPhone: claimed.contact_phone,
    contactEmail: claimed.contact_email,
    meta,
  })

  const from = process.env.RESEND_FROM_ADDRESS || FROM_FALLBACK
  // Replies land in the office inbox, not an unmonitored `from`. Env-gated like
  // every other NOTIFY_ADDRESS use — unset → no replyTo, mail still sends.
  const replyTo = process.env.NOTIFY_ADDRESS?.trim()

  try {
    const result = await resend.emails.send({
      from,
      to: [operatorEmail],
      ...(replyTo ? { replyTo } : {}),
      subject,
      text,
      tags: [{ name: 'category', value: 'transfer_operator_notification' }],
    })
    if (result.error) {
      return { ok: false, error: `operator mail send failed: ${result.error.message}` }
    }
  } catch (err) {
    return { ok: false, error: `operator mail threw: ${err instanceof Error ? err.message : String(err)}` }
  }

  return { ok: true }
}

// ============================================================
// Body — TR only (operatör Türk firması).
// ============================================================

/** 'YYYY-MM-DD' → 'DD.MM.YYYY'. Pure string split: the metadata date is already a
 *  local calendar day, so building a Date here would only risk a TZ shift. */
function trDate(d?: string): string {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return y && m && day ? `${day}.${m}.${y}` : d
}

function composeOperatorEmail(input: {
  reference: string
  customerName: string
  contactPhone: string | null
  contactEmail: string | null
  meta: TransferItemMetadata & { passenger_count_info?: number }
}): { subject: string; text: string } {
  const { reference, customerName, contactPhone, contactEmail, meta } = input
  const region = TRANSFER_REGIONS[meta.region_id as keyof typeof TRANSFER_REGIONS] as
    | (typeof TRANSFER_REGIONS)[keyof typeof TRANSFER_REGIONS]
    | undefined
  const pickup = meta.pickup_location || region?.pickupLabel || meta.region_id

  // Legs are independent — each carries its OWN route and vehicle (a customer may
  // fly out of BJV after arriving in Gümbet), so every leg is rendered from its
  // own ids rather than a single trip-level route.
  const renderLeg = (label: string, leg?: TransferLegMeta): string | null => {
    if (!leg) return null
    const routeLabel = region?.routes.find((r) => r.id === leg.route_id)?.label ?? leg.route_id
    const vehicle = region?.vehicles.find((v) => v.id === leg.vehicle_id)
    const vehicleLabel = vehicle ? `${vehicle.label} (${vehicle.capacity} kişilik)` : leg.vehicle_id
    const [from, to] = label === 'Gidiş' ? [pickup, routeLabel] : [routeLabel, pickup]
    return `${label}: ${trDate(leg.date)} · ${from} → ${to} · ${vehicleLabel}`
  }

  const legs = [renderLeg('Gidiş', meta.outbound), renderLeg('Dönüş', meta.return)].filter(
    (s): s is string => s !== null,
  )

  const lines = [
    'Yeni bir transfer rezervasyonu onaylandı ve ödemesi alındı.',
    '',
    `Referans: ${reference}`,
    `Müşteri: ${customerName}`,
    `Telefon: ${contactPhone || '—'}`,
    `E-posta: ${contactEmail || '—'}`,
    ...(meta.passenger_count_info ? [`Yolcu sayısı: ${meta.passenger_count_info}`] : []),
    '',
    ...legs,
    '',
    'NOT: Alım saati ve adres detayı bu rezervasyonda YOKTUR — lütfen saati ve alım',
    'noktasını müşteriyle doğrudan iletişime geçerek koordine ediniz.',
    '',
    'TravelBeez · FerryBee Travel IKE',
  ]

  return {
    subject: `Yeni Transfer Rezervasyonu — ${reference}`,
    text: lines.join('\n'),
  }
}
