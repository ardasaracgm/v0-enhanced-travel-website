import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import type { TripItemType, TripState } from '@/lib/supabase'

export interface HubReservationItem {
  type: TripItemType
  title: string
  scheduledAt: string | null
  endsAt: string | null
  priceAmount: number
  priceCurrency: string
}

export interface HubReservation {
  id: string
  reference: string
  state: TripState
  totalAmount: number
  currency: string
  createdAt: string
  items: HubReservationItem[]
}

/**
 * 🔐 getMyReservations — bir kullanıcının trip'lerini + TÜM trip_items'larını döner.
 *
 * GÜVENLİK SÖZLEŞMESİ (İHLAL = IDOR): `email` YALNIZCA doğrulanmış oturumdan gelir
 * (server-side `getUser().user.email`). ASLA searchParams / form / başka client-
 * kontrollü kaynaktan geçirilmez. trips/trip_items'ta SELECT RLS yok → service-role
 * okur; bu email filtresi kullanıcılar arası TEK bariyerdir.
 *
 * GENERIC: car_rental hardcode YOK — tüm item tipleri döner; çağıran (tab) filtreler.
 */
export async function getMyReservations(email: string): Promise<HubReservation[]> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return [] // boş email → ASLA geniş sorgu; boş dön

  const supabase = getSupabaseAdmin()
  const { data: trips, error } = await supabase
    .from('trips')
    .select('id, reference, state, total_amount, currency, created_at, contact_email')
    .ilike('contact_email', normalized) // case-insensitive (auth email lowercase, contact_email as-entered)
    .order('created_at', { ascending: false })
  if (error || !trips) return []

  // ilike `_`/`%`'i joker sayar → tam (case-insensitive) eşitlikle JS'te yeniden süz:
  // crafted email'in filtreyi genişletmesini engelle (filtre tek güvenlik bariyeri).
  const mine = trips.filter((t) => (t.contact_email ?? '').toLowerCase() === normalized)
  if (mine.length === 0) return []

  const tripIds = mine.map((t) => t.id)
  const { data: items } = await supabase
    .from('trip_items')
    .select('trip_id, item_type, title, scheduled_at, ends_at, price_amount, price_currency')
    .in('trip_id', tripIds)
    .order('sequence', { ascending: true })

  const itemsByTrip = new Map<string, HubReservationItem[]>()
  for (const it of items ?? []) {
    const list = itemsByTrip.get(it.trip_id) ?? []
    list.push({
      type: it.item_type as TripItemType,
      title: it.title,
      scheduledAt: it.scheduled_at,
      endsAt: it.ends_at,
      priceAmount: Number(it.price_amount ?? 0),
      priceCurrency: it.price_currency ?? 'EUR',
    })
    itemsByTrip.set(it.trip_id, list)
  }

  return mine.map((t) => ({
    id: t.id,
    reference: t.reference,
    state: t.state as TripState,
    totalAmount: Number(t.total_amount ?? 0),
    currency: t.currency,
    createdAt: t.created_at,
    items: itemsByTrip.get(t.id) ?? [],
  }))
}
