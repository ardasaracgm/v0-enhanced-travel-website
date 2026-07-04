import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { TRANSFER_REGIONS, type TransferRegionId } from '@/lib/transfer-rates'
import type { TransferItemMetadata, TripState } from '@/lib/supabase'

export interface HubTransferLeg {
  direction: 'outbound' | 'return'
  date: string | null   // RAW local date "YYYY-MM-DD" from metadata (no instant)
  vehicle: string       // brand label ("Mercedes Vito (VIP)") — NOT i18n'd
}

export interface HubTransferReservation {
  tripId: string
  reference: string
  tripState: TripState
  createdAt: string
  route: string          // "pickup → dropoff" (labels already in metadata)
  legs: HubTransferLeg[] // 1 (one-way) or 2 (round-trip) — one item, legs inside
  priceAmount: number
  priceCurrency: string
}

/**
 * 🔐 getMyTransferReservations — a user's Bodrum-transfer reservations.
 *
 * GÜVENLİK SÖZLEŞMESİ (İHLAL = IDOR): `email` YALNIZCA doğrulanmış oturumdan gelir
 * (server-side `getUser().user.email`). ASLA client kanalından. trips/trip_items'ta
 * SELECT RLS yok → service-role; email filtresi (ilike + JS exact re-filter) TEK
 * bariyer. (getMyReservations / ferry / insurance ile aynı desen.)
 *
 * Dedicated (generic DEĞİL): title İngilizce sabit + kart araç tipi / per-leg tarih
 * için metadata gerekiyor. Grouping YOK — round-trip tek trip_item, iki leg içeride.
 * Tarih HAM metadata'dan (outbound.date/return.date) → scheduled_at midnight+03:00
 * tarih-kayması tuzağına girmez.
 */
export async function getMyTransferReservations(email: string): Promise<HubTransferReservation[]> {
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
    .eq('item_type', 'transfer')
    .order('sequence', { ascending: true })

  const out: HubTransferReservation[] = []
  for (const it of items ?? []) {
    const t = tripById.get(it.trip_id)
    if (!t) continue
    const m = (it.metadata ?? {}) as TransferItemMetadata
    const region = TRANSFER_REGIONS[m.region_id as TransferRegionId]
    const vehicleLabel = (id?: string) =>
      region?.vehicles.find((v) => v.id === id)?.label ?? id ?? ''

    const legs: HubTransferLeg[] = []
    if (m.outbound) legs.push({ direction: 'outbound', date: m.outbound.date ?? null, vehicle: vehicleLabel(m.outbound.vehicle_id) })
    if (m.return) legs.push({ direction: 'return', date: m.return.date ?? null, vehicle: vehicleLabel(m.return.vehicle_id) })

    out.push({
      tripId: t.id,
      reference: t.reference,
      tripState: t.state as TripState,
      createdAt: t.created_at,
      route: `${m.pickup_location} → ${m.dropoff_location}`,
      legs,
      priceAmount: Number(it.price_amount ?? 0),
      priceCurrency: (it.price_currency as string | null) ?? t.currency ?? 'EUR',
    })
  }
  return out
}
