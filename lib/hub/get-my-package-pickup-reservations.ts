import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import type { TripState } from '@/lib/supabase'

// resolvePackageBoxItem'ın yazdığı metadata; supabase.ts'te named type yok → dar arayüz.
interface PackageBoxItemMetadata {
  box_size?: string
  months?: number
  start_date?: string
  end_date?: string
  location?: string
}

export interface HubPackagePickupReservation {
  tripId: string
  reference: string
  tripState: TripState
  createdAt: string
  boxNumber: string | null   // KOS-{SIZE}-{n}; pending'de null (henüz atanmadı)
  size: string               // 'xs'..'xl' (render'da uppercase)
  months: number
  startDate: string          // RAW "YYYY-MM-DD" from metadata
  endDate: string
  location: string
  priceAmount: number
  priceCurrency: string
}

/**
 * 🔐 getMyPackagePickupReservations — a user's Kos package-box rentals.
 *
 * GÜVENLİK SÖZLEŞMESİ (İHLAL = IDOR): `email` YALNIZCA doğrulanmış oturumdan gelir
 * (server-side `getUser().user.email`). ASLA client kanalından. trips/trip_items'ta
 * SELECT RLS yok → service-role; email filtresi (ilike + JS exact re-filter) TEK
 * bariyer. (getMyReservations / ferry / luggage / transfer ile aynı desen.)
 *
 * Dedicated (getMyReservations DEĞİL): kutu no `trips.package_box_number`'da (item'da
 * değil) + boyut/süre metadata'da; generic helper ikisini de taşımıyor. Tarih HAM
 * metadata'dan (start_date/end_date) → midnight+03:00 tarih-kayması tuzağına girmez.
 */
export async function getMyPackagePickupReservations(email: string): Promise<HubPackagePickupReservation[]> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return []

  const supabase = getSupabaseAdmin()
  const { data: trips, error } = await supabase
    .from('trips')
    .select('id, reference, state, currency, created_at, contact_email, package_box_number')
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
    .eq('item_type', 'package_pickup')
    .order('sequence', { ascending: true })

  const out: HubPackagePickupReservation[] = []
  for (const it of items ?? []) {
    const t = tripById.get(it.trip_id)
    if (!t) continue
    const m = (it.metadata ?? {}) as PackageBoxItemMetadata
    out.push({
      tripId: t.id,
      reference: t.reference,
      tripState: t.state as TripState,
      createdAt: t.created_at,
      boxNumber: (t.package_box_number as string | null) ?? null,
      size: m.box_size ?? '',
      months: Number(m.months ?? 0),
      startDate: m.start_date ?? '',
      endDate: m.end_date ?? '',
      location: m.location ?? '',
      priceAmount: Number(it.price_amount ?? 0),
      priceCurrency: (it.price_currency as string | null) ?? t.currency ?? 'EUR',
    })
  }
  return out
}
