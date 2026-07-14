import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getMyFerryReservations, buildFerryReservationsForTrip, type HubFerryReservation } from '@/lib/hub/get-my-ferry-reservations'
import type { TripState } from '@/lib/supabase'

export interface FerryVoucherData {
  reference: string
  reservations: HubFerryReservation[]
  ticketUrl: string | null   // https://www.travelbeez.gr/<locale>/ticket/<public_token> — bizim QR hedefi
  locale: string             // QR etiketi dili (tr/en/el)
}

/**
 * 🔐 getFerryVoucherData — ONE trip's ferry reservations, for the voucher PDF.
 *
 * getMyFerryReservations'ı (email-gated) yeniden kullanır, bu trip id'ye filtreler.
 * O helper feribot-voucher'ın İKİ kritik kuralının TEK kaynağı, canlıda doğrulanmış:
 *   • saat = HAM metadata.departure_time/arrival_time wall-clock (zoned instant
 *     DEĞİL → UTC kayması yok),
 *   • PNR→leg expeditionId ile eşleşir (ticketDirection DEĞİL).
 * Email-gate = Hub sayfasıyla AYNI IDOR bariyeri: contact_email != oturum email
 * olan trip listede HİÇ görünmez → filtre [] → null (varlık sızıntısı yok).
 */
export async function getFerryVoucherData(tripId: string, email: string): Promise<FerryVoucherData | null> {
  const reservations = (await getMyFerryReservations(email)).filter((r) => r.tripId === tripId)
  if (reservations.length === 0) return null
  // Ownership zaten email-gate ile doğrulandı (reservations dolu). public_token/locale çek.
  const supabase = getSupabaseAdmin()
  const { data: trip } = await supabase
    .from('trips')
    .select('public_token, locale')
    .eq('id', tripId)
    .maybeSingle()
  const locale = trip?.locale ?? 'tr'
  const ticketUrl = trip?.public_token
    ? `https://www.travelbeez.gr/${locale}/ticket/${trip.public_token}`
    : null
  return { reference: reservations[0].reference, reservations, ticketUrl, locale }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 🔐 getPublicFerryVoucherData — token ile PUBLIC (auth'suz) voucher verisi.
 *
 * [[getPublicTicket]] (lib/ticket/get-public-ticket.ts) ile BİREBİR aynı gate:
 * UUID guard → token→trip lookup → İPTAL negatif-gate → rezerve-feribot-yok → null.
 * Farkı yalnız çıktı tipi: PublicTicket yerine FerryVoucherData (voucher-pdf için).
 * Ortak saf mantık buildFerryReservationsForTrip (email + token yolunun tek kaynağı).
 *
 * ⚠️ SENKRON UYARISI: Bu gate getPublicTicket ile ELLE senkron tutulmalı — cancel/
 * expire mantığı değişirse (ör. yeni bir 'expired' state) İKİSİ DE güncellenir; biri
 * unutulursa güvenlik/tutarlılık açığı (sayfa açılır ama voucher iner ya da tersi).
 * Üçüncü bir token-consumer gelirse resolvePublicFerryTrip ortak helper'a çıkar (rule-of-three).
 *
 * Fiyat: FerryVoucherData/HubFerryReservation priceAmount TAŞIR ama buildFerryVoucherPdf
 * onu HİÇ basmaz → public çıktı güvenli (passport/DOB/email/telefon da PDF'e girmez;
 * tek PII passengerName, o da getPublicTicket public sayfasında zaten görünür).
 */
export async function getPublicFerryVoucherData(token: string): Promise<FerryVoucherData | null> {
  const clean = (token ?? '').trim()
  if (!UUID.test(clean)) return null // boş sorgu yapmadan düş

  const supabase = getSupabaseAdmin()
  const { data: trip, error } = await supabase
    .from('trips')
    .select('id, reference, state, currency, created_at, cancelled_at, public_token, locale')
    .eq('public_token', clean)
    .maybeSingle()
  if (error || !trip) return null
  // İPTAL negatif-gate — iptal bilet public'te voucher indiremez (getPublicTicket ile aynı).
  if (trip.state === 'cancelled' || trip.cancelled_at) return null

  const { data: items } = await supabase
    .from('trip_items')
    .select('id, scheduled_at, price_amount, price_currency, metadata')
    .eq('trip_id', trip.id)
    .eq('item_type', 'ferry')
    .order('sequence', { ascending: true })

  const reservations = buildFerryReservationsForTrip(
    { id: trip.id, reference: trip.reference, state: trip.state as TripState, created_at: trip.created_at, currency: trip.currency },
    items ?? [],
  )
  if (reservations.length === 0) return null // rezerve feribot yok → indirilecek voucher yok

  const locale = trip.locale ?? 'tr'
  const ticketUrl = `https://www.travelbeez.gr/${locale}/ticket/${trip.public_token}`
  return { reference: trip.reference, reservations, ticketUrl, locale }
}
