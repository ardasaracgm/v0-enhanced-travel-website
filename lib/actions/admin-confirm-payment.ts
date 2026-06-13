'use server'

import { revalidatePath } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { confirmTrip } from '@/lib/trips/confirm'
import { sendBookingConfirmation } from '@/lib/email/send-confirmation'

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

  // 1) Gate — admin-update-visa-state.ts:31-42 ile birebir.
  const auth = await createSupabaseServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) throw new Error('unauthorized')

  const { data: profile } = await auth
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) throw new Error('forbidden')

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
  let freshPayment = true
  const { error: payErr } = await admin.from('payments').insert({
    trip_id:         trip.id,
    amount:          trip.total_amount,
    currency:        trip.currency,
    provider,
    state:           'completed',
    idempotency_key: `manual:${trip.id}`,
    metadata: { confirmed_by: user.id, channel: 'admin_manual' },
    completed_at:    new Date().toISOString(),
  })

  if (payErr) {
    // 23505 = mükerrer ödeme satırı → idempotent (webhook route.ts:215-223 semantiği).
    // Zaten ödenmiş → email ATMA. Diğer hata = gerçek başarısızlık. Heal'a gerek yok:
    // confirmTrip aşağıda koşulsuz çağrılır ve zaten idempotent.
    if (payErr.code === '23505') {
      console.info(`[admin-confirm] payment for trip ${trip.reference} already processed (23505) — idempotent`)
      freshPayment = false
    } else {
      console.error(`[admin-confirm] payment insert failed for trip ${trip.reference}:`, payErr.message)
      throw new Error(`payment_insert_failed: ${payErr.message}`)
    }
  }

  // 4) confirmTrip — trips flip (fatal) + car_bookings + policy (non-fatal). [confirm.ts:64]
  const confirmRes = await confirmTrip(trip.id)
  if (!confirmRes.ok) {
    console.error(`[admin-confirm] state update failed for trip ${trip.reference}:`, confirmRes.error)
    throw new Error(`state_update_failed: ${confirmRes.error}`)
  }

  // 5) Onay e-postası — YALNIZ fresh confirm'de (23505 değil VE gerçek flip).
  //    Çift tıklamada gitmez. Webhook main-path bloğunun birebir kopyası
  //    (route.ts:262-302); email hatası ASLA action'ı düşürmez (non-fatal).
  if (freshPayment && !confirmRes.alreadyConfirmed) {
    try {
      const { data: lead } = await admin
        .from('passengers')
        .select('first_name, last_name')
        .eq('trip_id', trip.id)
        .eq('is_lead', true)
        .maybeSingle()

      const leadName = [lead?.first_name, lead?.last_name]
        .filter((s): s is string => !!s && s.trim().length > 0)
        .join(' ')
        .trim()
      const customerName = leadName || 'Traveler' // fallback — never blank/undefined

      const { data: items } = await admin
        .from('trip_items')
        .select('item_type, title, scheduled_at, price_amount')
        .eq('trip_id', trip.id)
        .order('sequence', { ascending: true })

      await sendBookingConfirmation(trip.contact_email, {
        paid:         true,
        reference:    trip.reference,
        customerName,
        contactPhone: trip.contact_phone,
        contactEmail: trip.contact_email,
        totalAmount:  trip.total_amount,
        currency:     trip.currency,
        locale:       trip.locale,
        items: (items ?? []).map((i) => ({
          type:        i.item_type,
          title:       i.title,
          scheduledAt: i.scheduled_at,
          price:       i.price_amount,
        })),
        paymentWhatsAppUrl: '', // unused on the paid path
      })
    } catch (emailErr) {
      const msg = emailErr instanceof Error ? emailErr.message : String(emailErr)
      console.error('[admin-confirm] confirmation email failed (non-fatal):', msg)
    }
  }

  console.info(`[admin-confirm] trip ${trip.reference} confirmed (provider=${provider})`)
  revalidatePath(`/${locale}/admin/trips/${trip.id}`)
  revalidatePath(`/${locale}/admin/trips`)
}
