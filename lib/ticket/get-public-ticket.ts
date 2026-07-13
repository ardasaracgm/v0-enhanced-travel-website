import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { buildFerryReservationsForTrip } from '@/lib/hub/get-my-ferry-reservations'
import type { TripState } from '@/lib/supabase'

export interface PublicTicketLeg {
  route: string
  date: string | null           // LOCAL "YYYY-MM-DD" (port TZ) — formatDay ile bas
  departureTime: string | null  // HAM wall-clock "HH:MM" — Intl'e VERME
  arrivalTime: string | null
  vessel: string | null
  operator: string | null
  passengers: string[]          // yalnız isim (Dentur public sınırı) — passport/DOB YOK
  pnrs: number[]
}
export interface PublicTicketReservation {
  voucherNo: string | null
  legs: PublicTicketLeg[]
}
export interface PublicTicket {
  reference: string
  state: TripState
  reservations: PublicTicketReservation[]
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 🔐 getPublicTicket — token ile PUBLIC (auth'suz) feribot bileti.
 * Tek bariyer: tahmin-edilemez public_token (gen_random_uuid). Bilinmeyen/bozuk
 * token → null → sayfa notFound() (varlık sızıntısı yok). Service-role okur (RLS bypass),
 * companion consent deseninin aynısı. FİYAT/İLETİŞİM/PASSPORT/DOB HİÇ okunmaz.
 *
 * İPTAL negatif-gate: cancelled state veya cancelled_at dolu trip → null → notFound.
 * İptal edilmiş bilet QR ile açılınca "geçerli bilet" gibi GÖRÜNMEMELİ.
 */
export async function getPublicTicket(token: string): Promise<PublicTicket | null> {
  const clean = (token ?? '').trim()
  if (!UUID.test(clean)) return null // boş sorgu yapmadan düş

  const supabase = getSupabaseAdmin()
  const { data: trip, error } = await supabase
    .from('trips')
    .select('id, reference, state, currency, created_at, cancelled_at') // contact_email/phone/total_amount YOK
    .eq('public_token', clean)
    .maybeSingle()
  if (error || !trip) return null

  // İptal negatif-gate — iptal bilet public'te asla "geçerli" görünmez.
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
  if (reservations.length === 0) return null // rezerve feribot yok → public'te gösterilecek şey yok

  return {
    reference: trip.reference,
    state: trip.state as TripState,
    reservations: reservations.map((r) => ({
      voucherNo: r.voucherNo,
      legs: r.legs.map((l) => ({
        route: l.route,
        date: l.date,
        departureTime: l.departureTime,
        arrivalTime: l.arrivalTime,
        vessel: l.vessel,
        operator: l.operator,
        passengers: l.pnrs.map((p) => p.passengerName).filter((n): n is string => !!n),
        pnrs: l.pnrs.map((p) => p.pnr),
      })),
    })),
  }
}
