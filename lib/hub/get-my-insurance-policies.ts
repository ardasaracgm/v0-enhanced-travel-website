import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getDownloadUrl, getPolicyBucket } from '@/lib/r2'
import type { InsuranceItemMetadata, TripState } from '@/lib/supabase'

export interface HubInsurancePolicy {
  tripId: string
  reference: string
  tripState: TripState
  title: string
  startsAt: string | null
  endsAt: string | null
  coverageValue: number | null
  priceAmount: number
  priceCurrency: string
  createdAt: string
  policeNum: string | null
  policyState: 'pending' | 'issued' | 'failed' | null
  // Presigned R2 GET — YALNIZCA issued + key varsa, email kapısı GEÇTİKTEN sonra üretilir.
  downloadUrl: string | null
}

/**
 * 🔐 getMyInsurancePolicies — bir kullanıcının sigorta poliçelerini döner.
 *
 * GÜVENLİK SÖZLEŞMESİ (İHLAL = IDOR): `email` YALNIZCA doğrulanmış oturumdan gelir
 * (server-side `getUser().user.email`). ASLA searchParams / form / başka client-
 * kontrollü kaynaktan geçirilmez. trips/trip_items'ta SELECT RLS yok → service-role
 * okur; bu email filtresi kullanıcılar arası TEK bariyerdir (getMyReservations ile aynı).
 *
 * 🔐 PRESIGNED policy URL'i yalnızca email kapısı geçtikten + poliçe issued olduktan
 * sonra üretilir — başkasının trip'i için poliçe PDF'i alınamaz (downloadPolicyPdfAction
 * admin-gate'in müşteri tarafı karşılığı).
 */
export async function getMyInsurancePolicies(email: string): Promise<HubInsurancePolicy[]> {
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

  const tripById = new Map(mine.map((t) => [t.id, t]))
  const tripIds = mine.map((t) => t.id)

  const { data: items } = await supabase
    .from('trip_items')
    .select('trip_id, title, scheduled_at, ends_at, price_amount, price_currency, metadata, sequence')
    .in('trip_id', tripIds)
    .eq('item_type', 'insurance')
    .order('sequence', { ascending: true })

  // trip'leri created_at desc sırasında tut; her trip'in insurance item'larını grupla.
  const itemsByTrip = new Map<string, NonNullable<typeof items>>()
  for (const it of items ?? []) {
    const list = itemsByTrip.get(it.trip_id) ?? []
    list.push(it)
    itemsByTrip.set(it.trip_id, list)
  }

  const policies: HubInsurancePolicy[] = []
  for (const t of mine) {
    for (const it of itemsByTrip.get(t.id) ?? []) {
      const m = (it.metadata ?? {}) as InsuranceItemMetadata
      const issued = m.policy_state === 'issued' && !!m.policy_r2_key
      policies.push({
        tripId: t.id,
        reference: t.reference,
        tripState: t.state as TripState,
        title: it.title,
        startsAt: it.scheduled_at ?? m.starts_at ?? null,
        endsAt: it.ends_at ?? m.ends_at ?? null,
        coverageValue: m.coverage_value ?? m.coverage_amount ?? null,
        priceAmount: Number(it.price_amount ?? 0),
        priceCurrency: it.price_currency ?? t.currency ?? 'EUR',
        createdAt: t.created_at,
        policeNum: m.police_num ?? null,
        policyState: m.policy_state ?? null,
        downloadUrl: issued
          ? await getDownloadUrl(m.policy_r2_key!, `policy-${t.reference}.pdf`, getPolicyBucket())
          : null,
      })
    }
  }
  return policies
}
