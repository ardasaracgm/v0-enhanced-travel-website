import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getMyFerryReservations, type HubFerryReservation } from '@/lib/hub/get-my-ferry-reservations'

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
