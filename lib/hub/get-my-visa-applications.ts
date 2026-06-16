import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'

export interface HubVisaApplication {
  id: string
  createdAt: string
  firstName: string
  lastName: string
  state: string
  promoCode: string | null
  tripId: string | null
}

/**
 * 🔐 getMyVisaApplications — bir kullanıcının vize başvurularını döner.
 *
 * GÜVENLİK SÖZLEŞMESİ (İHLAL = IDOR): `email` YALNIZCA doğrulanmış oturumdan gelir
 * (server-side `getUser().user.email`). ASLA searchParams / form / başka client-
 * kontrollü kaynaktan geçirilmez. visa_applications'ta SELECT RLS yok (yalnız anon
 * INSERT) → service-role okur; bu email filtresi kullanıcılar arası TEK bariyerdir.
 *
 * association = email equality (user_id FK yok — visa_applications tasarımı).
 * Liste için yeterli alanlar; belge/ödeme/detay YOK (o Parça 2).
 */
export async function getMyVisaApplications(email: string): Promise<HubVisaApplication[]> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return [] // boş email → ASLA geniş sorgu; boş dön

  const supabase = getSupabaseAdmin()
  const { data: apps, error } = await supabase
    .from('visa_applications')
    .select('id, created_at, first_name, last_name, email, state, promo_code, trip_id')
    .ilike('email', normalized) // case-insensitive (auth email lowercase, stored as-entered)
    .order('created_at', { ascending: false })
  if (error || !apps) return []

  // ilike `_`/`%`'i joker sayar → tam (case-insensitive) eşitlikle JS'te yeniden süz:
  // crafted email'in filtreyi genişletmesini engelle (filtre tek güvenlik bariyeri).
  return apps
    .filter((a) => (a.email ?? '').toLowerCase() === normalized)
    .map((a) => ({
      id: a.id,
      createdAt: a.created_at,
      firstName: a.first_name,
      lastName: a.last_name,
      state: a.state,
      promoCode: a.promo_code,
      tripId: a.trip_id,
    }))
}
