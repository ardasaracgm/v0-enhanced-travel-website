import 'server-only'
import type { getSupabaseAdmin } from '@/lib/supabase-server'

/**
 * Lazy payment expiry — pending_payment trip'ler için.
 *
 * Cron YOK: süresi geçmiş trip, bir ödeme yolunda (create-payment-order) bir
 * sonraki okunuşunda soft-cancel edilir. DELETE EDİLMEZ — kayıt cancelled +
 * cancellation_reason='payment_timeout' ile korunur (denetim izi).
 */

// pending_payment trip ödeme yapılmadan bu süreyi aşarsa expire sayılır.
export const PAYMENT_EXPIRY_MINUTES = 60

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>

export function isPaymentExpired(trip: { state: string; created_at: string }): boolean {
  if (trip.state !== 'pending_payment') return false
  const ageMs = Date.now() - new Date(trip.created_at).getTime()
  return ageMs > PAYMENT_EXPIRY_MINUTES * 60_000
}

/**
 * Süresi dolmuşsa trip'i soft-cancel eder ve true döner; değilse false.
 * Çağıran true alınca ödeme order'ı OLUŞTURMAMALI. DB update başarısız olsa
 * bile expired ise true döner — süresi geçmiş booking'e ödeme alınmamalı.
 */
export async function expireTripIfStale(
  trip: { id: string; state: string; created_at: string },
  supabase: SupabaseAdmin,
): Promise<boolean> {
  if (!isPaymentExpired(trip)) return false

  const { error } = await supabase
    .from('trips')
    .update({
      state: 'cancelled',
      cancellation_reason: 'payment_timeout',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', trip.id)
    .eq('state', 'pending_payment') // yarış koruması: yalnız hâlâ pending ise yaz

  if (error) {
    // Soft-cancel yazılamadı ama trip yine de süresi geçmiş → ödeme engellenir.
    console.error('[expireTripIfStale] soft-cancel failed for trip', trip.id, error.message)
  }
  return true
}
