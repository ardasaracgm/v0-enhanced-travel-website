import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import type { LuggageItemMetadata, TripState } from '@/lib/supabase'

export interface HubLuggageReservation {
  tripId: string
  reference: string
  tripState: TripState
  createdAt: string
  counts: { small: number; medium: number; large: number }
  dropOffDate: string      // RAW "YYYY-MM-DD" from metadata
  pickupDate: string
  location: string         // slug ("kos_port") — humanized at render
  priceAmount: number
  priceCurrency: string
}

/**
 * 🔐 getMyLuggageReservations — a user's luggage-storage reservations.
 *
 * GÜVENLİK SÖZLEŞMESİ (İHLAL = IDOR): `email` YALNIZCA doğrulanmış oturumdan gelir.
 * trips/trip_items'ta SELECT RLS yok → service-role; email filtresi (ilike + JS
 * exact re-filter) TEK bariyer. (ferry / transfer / insurance ile aynı desen.)
 *
 * Dedicated: title İngilizce sabit + kart boyut kırılımı / location için metadata
 * gerekiyor. Düz item, grouping YOK. Tarih HAM metadata'dan (drop_off_date/
 * pickup_date) → tarih-kayması tuzağına girmez.
 */
export async function getMyLuggageReservations(email: string): Promise<HubLuggageReservation[]> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return []

  const supabase = getSupabaseAdmin()
  const { data: trips, error } = await supabase
    .from('trips')
    .select('id, reference, state, currency, created_at, contact_email')
    .ilike('contact_email', normalized)
    .order('created_at', { ascending: false })
  if (error || !trips) return []

  const mine = trips.filter((t) => (t.contact_email ?? '').toLowerCase() === normalized)
  if (mine.length === 0) return []

  const tripById = new Map(mine.map((t) => [t.id, t]))
  const tripIds = mine.map((t) => t.id)
  const { data: items } = await supabase
    .from('trip_items')
    .select('trip_id, price_amount, price_currency, metadata')
    .in('trip_id', tripIds)
    .eq('item_type', 'luggage')
    .order('sequence', { ascending: true })

  const out: HubLuggageReservation[] = []
  for (const it of items ?? []) {
    const t = tripById.get(it.trip_id)
    if (!t) continue
    const m = (it.metadata ?? {}) as LuggageItemMetadata
    out.push({
      tripId: t.id,
      reference: t.reference,
      tripState: t.state as TripState,
      createdAt: t.created_at,
      counts: {
        small: Number(m.count_small ?? 0),
        medium: Number(m.count_medium ?? 0),
        large: Number(m.count_large ?? 0),
      },
      dropOffDate: m.drop_off_date,
      pickupDate: m.pickup_date,
      location: m.location,
      priceAmount: Number(it.price_amount ?? 0),
      priceCurrency: (it.price_currency as string | null) ?? t.currency ?? 'EUR',
    })
  }
  return out
}
