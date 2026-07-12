import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import type { PaymentState } from '@/lib/supabase'

export interface HubPayment {
  id: string
  reference: string
  /** completed_at ?? created_at — para hareketinin gerçekleştiği an. */
  date: string
  amount: number
  currency: string
  state: PaymentState
}

// Kullanıcının "Ödemelerim" listesinde yalnızca tamamlanmış/iade edilmiş
// para hareketleri görünür. pending/failed/draft denemeleri gizlenir (kafa
// karıştırır). refunded/partially_refunded'ı şu an hiçbir kod yazmıyor ama
// ileride refund otomasyonu gelirse liste hazır olsun diye dahil.
const VISIBLE_STATES: PaymentState[] = ['completed', 'refunded', 'partially_refunded']

/**
 * 🔐 getMyPayments — bir kullanıcının tamamlanmış ödeme kayıtlarını döner.
 *
 * GÜVENLİK SÖZLEŞMESİ (İHLAL = IDOR): `email` YALNIZCA doğrulanmış oturumdan
 * gelir (server-side `getUser().user.email`). ASLA searchParams / form / başka
 * client-kontrollü kaynaktan geçirilmez. trips/payments'ta SELECT RLS yok →
 * service-role okur; bu email filtresi kullanıcılar arası TEK bariyerdir.
 * (Desen `getMyReservations`'tan miras.)
 *
 * payments tablosunda referans YOK → trips.reference join'i email-gate'li
 * trip'lerden türetilir; sonuç yalnızca kullanıcının kendi trip_id'lerine
 * bağlı ödemeleri içerir.
 */
export async function getMyPayments(email: string): Promise<HubPayment[]> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return [] // boş email → ASLA geniş sorgu; boş dön

  const supabase = getSupabaseAdmin()
  const { data: trips, error } = await supabase
    .from('trips')
    .select('id, reference, contact_email')
    .ilike('contact_email', normalized) // case-insensitive
  if (error || !trips) return []

  // ilike `_`/`%`'i joker sayar → tam (case-insensitive) eşitlikle JS'te yeniden
  // süz: crafted email'in filtreyi genişletmesini engelle (tek güvenlik bariyeri).
  const mine = trips.filter((t) => (t.contact_email ?? '').toLowerCase() === normalized)
  if (mine.length === 0) return []

  const refById = new Map<string, string>(mine.map((t) => [t.id, t.reference]))
  const tripIds = mine.map((t) => t.id)

  const { data: payments } = await supabase
    .from('payments')
    .select('id, trip_id, amount, currency, state, created_at, completed_at')
    .in('trip_id', tripIds)
    .in('state', VISIBLE_STATES)
  if (!payments) return []

  return payments
    // Fazladan bariyer: yalnızca kullanıcının trip'lerine bağlı ödemeler.
    .filter((p) => refById.has(p.trip_id))
    .map((p) => ({
      id: p.id,
      reference: refById.get(p.trip_id) ?? '',
      date: p.completed_at ?? p.created_at,
      amount: Number(p.amount ?? 0),
      currency: p.currency ?? 'EUR',
      state: p.state as PaymentState,
    }))
    // Yeni → eski.
    .sort((a, b) => b.date.localeCompare(a.date))
}
