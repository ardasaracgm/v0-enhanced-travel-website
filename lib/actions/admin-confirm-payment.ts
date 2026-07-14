'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

import { requireFullAdmin } from '@/lib/auth/require-admin'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { confirmTrip } from '@/lib/trips/confirm'
import { claimAndSendPaidEmail } from '@/lib/email/send-paid-confirmation'
import { logAuditEvent } from '@/lib/audit/log'
import { clientIp } from '@/lib/auth/rate-limit'

// Admin'in manuel işaretleyebileceği sağlayıcılar (WhatsApp/banka ödemesi sonrası).
// viva_wallet webhook'a ait; internal admin-manuel değil → yalnız bu ikisi.
const ALLOWED_PROVIDERS = new Set(['cash', 'bank_transfer'])

/**
 * Manuel ödeme onayı (admin). WhatsApp/banka ödemesi gelince admin "ödendi"
 * işaretler → webhook ana yolunun Viva-doğrulamasız ikizi: payment satırı +
 * confirmTrip (trips flip + car_bookings + policy) + onay e-postası.
 *
 * GÜVENLİK: updateVisaState ile aynı zarf — action KENDİ auth + is_admin
 * doğrular (layout gate buraya geçmez), yazma service-role ile.
 */
export async function confirmPayment(formData: FormData): Promise<void> {
  const tripId = String(formData.get('tripId') ?? '')
  const provider = String(formData.get('provider') ?? '')
  const locale = String(formData.get('locale') ?? 'tr')

  if (!tripId || !ALLOWED_PROVIDERS.has(provider)) {
    throw new Error('invalid_request')
  }

  // 1) Gate — full-admin (is_admin && admin_role='full'). cars_only reddedilir.
  const gate = await requireFullAdmin()
  if (!gate.ok) throw new Error('forbidden')

  // 2) Trip — tutar/para birimi SUNUCUDAN okunur (client'a güvenme); email alanları.
  const admin = getSupabaseAdmin()
  const { data: trip, error: tripErr } = await admin
    .from('trips')
    .select('id, state, total_amount, currency, contact_email, contact_phone, reference, locale')
    .eq('id', tripId)
    .maybeSingle()
  if (tripErr) throw new Error(`lookup_failed: ${tripErr.message}`)
  if (!trip) throw new Error('trip_not_found')

  // 3) Ödeme satırını ÖNCE yaz (webhook route.ts:197-212 ile aynı şablon).
  //    idempotency_key trip'e deterministik + UNIQUE → çift tıklama 23505 verir.
  //    €0 / comp rezervasyon: payments_amount_check (amount > 0) bir €0 satırına izin
  //    vermez → payment satırı YAZILMAZ; trip yine confirmed olur (confirmTrip aşağıda
  //    koşulsuz). amount > 0 ise normal manuel ödeme insert'i.
  const amount = Number(trip.total_amount ?? 0)
  if (amount > 0) {
    const { error: payErr } = await admin.from('payments').insert({
      trip_id:         trip.id,
      amount,
      currency:        trip.currency,
      provider,
      state:           'completed',
      idempotency_key: `manual:${trip.id}`,
      metadata: { confirmed_by: gate.userId, channel: 'admin_manual' },
      completed_at:    new Date().toISOString(),
    })

    if (payErr) {
      // 23505 = mükerrer ödeme satırı → idempotent (webhook route.ts:215-223 semantiği).
      // Zaten ödenmiş → email ATMA. Diğer hata = gerçek başarısızlık. Heal'a gerek yok:
      // confirmTrip aşağıda koşulsuz çağrılır ve zaten idempotent.
      if (payErr.code === '23505') {
        console.info(`[admin-confirm] payment for trip ${trip.reference} already processed (23505) — idempotent`)
      } else {
        console.error(`[admin-confirm] payment insert failed for trip ${trip.reference}:`, payErr.message)
        throw new Error(`payment_insert_failed: ${payErr.message}`)
      }
    }
  } else {
    console.info(`[admin-confirm] trip ${trip.reference} is comp (€0) — no payment row, confirming directly`)
  }

  // 4) confirmTrip — trips flip (fatal) + car_bookings + policy (non-fatal). [confirm.ts:64]
  const confirmRes = await confirmTrip(trip.id)
  if (!confirmRes.ok) {
    console.error(`[admin-confirm] state update failed for trip ${trip.reference}:`, confirmRes.error)
    throw new Error(`state_update_failed: ${confirmRes.error}`)
  }

  // Audit izi — trip confirmed olduktan SONRA, e-posta/revalidate ÖNCE. Comp (€0)
  // dalını da kapsar: is_comp=amount<=0 → "kim bedava onayladı" /admin/audit'te.
  await logAuditEvent({
    actorId: gate.userId,
    actorEmail: gate.email,
    action: 'payment.confirm',
    targetType: 'trip',
    targetId: trip.id,
    details: { amount, currency: trip.currency, provider, is_comp: amount <= 0 },
    ip: clientIp(await headers()),
  })

  // 5) Onay e-postası — race-safe claim ile (placeholder/.local guard + çift-send
  //    koruması helper içinde). Aynı confirmation_email_sent_at kolonunu webhook
  //    ile paylaşır → admin + webhook aynı trip'e iki kez atamaz. Non-fatal.
  await claimAndSendPaidEmail(trip.id)

  console.info(`[admin-confirm] trip ${trip.reference} confirmed (provider=${provider})`)
  revalidatePath(`/${locale}/admin/trips/${trip.id}`)
  revalidatePath(`/${locale}/admin/trips`)
}
