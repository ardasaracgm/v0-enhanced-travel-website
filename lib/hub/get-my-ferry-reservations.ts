import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { groupFerryLegs } from '@/lib/ferry/group-legs'
import { expeditionIdFromFerryId } from '@/lib/ferry/reconcile'
import type { FerryItemMetadata, TripState } from '@/lib/supabase'

export interface HubFerryLeg {
  route: string                 // "Bodrum → Kos"
  date: string | null           // LOCAL calendar date "YYYY-MM-DD" (scheduled_at sliced)
  departureTime: string | null  // RAW provider wall-clock "HH:MM" — NEVER the instant
  arrivalTime: string | null
  pnrs: Array<{ pnr: number; passengerName?: string }>
}

export interface HubFerryReservation {
  tripId: string
  reference: string
  tripState: TripState
  createdAt: string
  voucherNo: string | null        // Dentur reservation_id (null until reserved)
  reserveState: 'pending' | 'reserved' | 'failed' | null
  priceAmount: number
  priceCurrency: string
  legs: HubFerryLeg[]             // round-trip → 2, one-way/open-jaw group → 1
}

/**
 * 🔐 getMyFerryReservations — a user's ferry reservations, grouped like the
 * Dentur voucher (round-trip → ONE reservation card with both legs; open-jaw →
 * one card per one-way reservation).
 *
 * GÜVENLİK SÖZLEŞMESİ (İHLAL = IDOR): `email` YALNIZCA doğrulanmış oturumdan gelir
 * (server-side `getUser().user.email`). ASLA searchParams / form / başka client-
 * kontrollü kaynaktan geçirilmez. trips/trip_items'ta SELECT RLS yok → service-role
 * okur; bu email filtresi (ilike + JS exact re-filter) kullanıcılar arası TEK bariyerdir.
 * (getMyReservations / getMyInsurancePolicies ile aynı desen.)
 *
 * Saat: kart HAM `metadata.departure_time`/`arrival_time`'ı gösterir; zoned
 * `scheduled_at` instant'ı Intl/Date'e verilmez (email'deki tz kaymasının aynısına
 * düşmemek için) — buradan yalnız YEREL tarih (slice) türetilir.
 *
 * PNR eşleme: round-trip'te tüm PNR'lar outbound anchor'da; expeditionId ile
 * (ticketDirection DEĞİL) bacağa bölünür — reconcile'ın kullandığı anahtar.
 * Temiz eşleşme olmazsa tüm PNR'lar ilk bacağa düşer (asla yanlış rotaya).
 */
export async function getMyFerryReservations(email: string): Promise<HubFerryReservation[]> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return [] // boş email → ASLA geniş sorgu; boş dön

  const supabase = getSupabaseAdmin()
  const { data: trips, error } = await supabase
    .from('trips')
    .select('id, reference, state, currency, created_at, contact_email')
    .ilike('contact_email', normalized) // case-insensitive
    .order('created_at', { ascending: false })
  if (error || !trips) return []

  // ilike `_`/`%`'i joker sayar → tam (case-insensitive) eşitlikle JS'te yeniden süz.
  const mine = trips.filter((t) => (t.contact_email ?? '').toLowerCase() === normalized)
  if (mine.length === 0) return []

  const tripIds = mine.map((t) => t.id)
  const { data: items } = await supabase
    .from('trip_items')
    .select('id, trip_id, scheduled_at, price_amount, price_currency, metadata')
    .in('trip_id', tripIds)
    .eq('item_type', 'ferry')
    .order('sequence', { ascending: true })

  const byTrip = new Map<string, NonNullable<typeof items>>()
  for (const it of items ?? []) {
    const list = byTrip.get(it.trip_id) ?? []
    list.push(it)
    byTrip.set(it.trip_id, list)
  }

  const safeExpId = (ferryId?: string): number | undefined => {
    try {
      return expeditionIdFromFerryId(ferryId)
    } catch {
      return undefined
    }
  }

  const out: HubFerryReservation[] = []
  for (const t of mine) {
    const tripItems = byTrip.get(t.id) ?? []
    if (tripItems.length === 0) continue

    // groupFerryLegs is generic over GroupableLeg — carry the extra display
    // fields (scheduledAt/price) so groups return them without a second lookup.
    const legs0 = tripItems.map((it, idx) => ({
      id: String(it.id ?? idx),
      meta: (it.metadata ?? {}) as FerryItemMetadata,
      scheduledAt: (it.scheduled_at as string | null) ?? null,
      priceAmount: Number(it.price_amount ?? 0),
      priceCurrency: (it.price_currency as string | null) ?? t.currency ?? 'EUR',
    }))

    for (const group of groupFerryLegs(legs0)) {
      const anchor = group.anchor.meta
      const all = anchor.vouchers ?? []
      const byLeg = group.legs.map((leg) => {
        const legExp = safeExpId(leg.meta.ferry_id)
        return all.filter((v) => v.expeditionId != null && v.expeditionId === legExp)
      })
      const matched = byLeg.reduce((n, l) => n + l.length, 0)
      const clean = all.length > 0 && matched === all.length

      const legs: HubFerryLeg[] = group.legs.map((leg, i) => ({
        route: `${leg.meta.from_port} → ${leg.meta.to_port}`,
        date: leg.scheduledAt ? leg.scheduledAt.slice(0, 10) : null,
        departureTime: leg.meta.departure_time ?? null,
        arrivalTime: leg.meta.arrival_time ?? null,
        pnrs: (clean ? byLeg[i] : i === 0 ? all : []).map((v) => ({
          pnr: v.pnr,
          passengerName: v.passengerName || undefined,
        })),
      }))

      out.push({
        tripId: t.id,
        reference: t.reference,
        tripState: t.state as TripState,
        createdAt: t.created_at,
        voucherNo: typeof anchor.reservation_id === 'number' ? String(anchor.reservation_id) : null,
        reserveState: anchor.reserve_state ?? null,
        priceAmount: group.legs.reduce((s, leg) => s + leg.priceAmount, 0),
        priceCurrency: group.legs[0]?.priceCurrency ?? t.currency ?? 'EUR',
        legs,
      })
    }
  }
  return out
}
