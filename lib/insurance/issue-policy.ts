import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { addContract, confirmContract, getPrintForm } from '@/lib/insurs'
import { putObject, getPolicyBucket } from '@/lib/r2'
import { buildPolicyKey } from '@/lib/insurance/policy-key'
import type { InsuranceItemMetadata } from '@/lib/supabase'

/**
 * issuePolicy — Auras poliçesini OLUŞTURUR (add_contract → confirm_contract →
 * get_print_form → R2) ve insurance trip_item metadata'sını günceller.
 *
 * Çekirdek orkestratör — HİÇBİR YERDEN çağrılmaz (B4b webhook, B4c admin bağlar).
 * İdempotent: metadata.order_id varsa no-op. NON-FATAL: çağıran (webhook/admin)
 * ödeme akışını bozmamalı → hata { ok:false } döner, policy_state='failed' yazılır.
 *
 * GÜVENLİK: confirm_contract poliçeyi Paid+Active yapar → SADECE gerçek ödeme
 * alındıktan sonra çağrılmalı (çağıran sorumlu). payment_id=1 = "ödeme bizde
 * tamam" sinyali (Auras, B1 TEST'te kabul).
 */
export type IssuePolicyResult =
  | { ok: true; policeNum?: string; r2Key?: string; skipped?: 'no_insurance' | 'already_issued' }
  | { ok: false; error: string }

export async function issuePolicy(tripId: string): Promise<IssuePolicyResult> {
  const supabase = getSupabaseAdmin()

  // 1. trip (insurer contact) + insurance item (metadata).
  const { data: trip, error: tripErr } = await supabase
    .from('trips')
    .select('contact_email, contact_phone')
    .eq('id', tripId)
    .maybeSingle()
  if (tripErr || !trip) return { ok: false, error: `Trip not found: ${tripId}` }

  const { data: item, error: itemErr } = await supabase
    .from('trip_items')
    .select('id, metadata')
    .eq('trip_id', tripId)
    .eq('item_type', 'insurance')
    .maybeSingle()
  if (itemErr) return { ok: false, error: `insurance item lookup failed: ${itemErr.message}` }
  if (!item) return { ok: true, skipped: 'no_insurance' }

  const metadata = (item.metadata ?? {}) as InsuranceItemMetadata

  // 2/3. İdempotency — poliçe zaten oluşturulmuşsa no-op.
  if (metadata.order_id !== undefined) return { ok: true, skipped: 'already_issued' }

  // coverage_id zorunlu (yeni booking'lerde resolver yazar; tariff_id'yi VARSAYMA).
  if (metadata.coverage_id === undefined) {
    return { ok: false, error: 'missing coverage_id in insurance metadata' }
  }
  if (!metadata.starts_at || !metadata.ends_at) {
    return { ok: false, error: 'missing insurance dates in metadata' }
  }

  // insurer = lead passenger + trip contact; tourists = tüm passengers.
  const { data: lead } = await supabase
    .from('passengers')
    .select('first_name, last_name, birth_date, passport_number')
    .eq('trip_id', tripId)
    .eq('is_lead', true)
    .maybeSingle()
  if (!lead) return { ok: false, error: 'lead passenger not found' }

  const { data: passengers } = await supabase
    .from('passengers')
    .select('first_name, last_name, birth_date, passport_number')
    .eq('trip_id', tripId)
  const tourists = (passengers ?? []).map((p) => ({
    firstName: p.first_name,
    lastName: p.last_name,
    dateBirth: p.birth_date ?? '',
    passport: p.passport_number ?? '',
  }))
  if (tourists.length === 0) return { ok: false, error: 'no passengers for tourists' }

  // 4. policy_state='pending' (best-effort).
  await writeMetadata(supabase, item.id, { ...metadata, policy_state: 'pending' })

  // 5. add → confirm → print → R2 → metadata.
  try {
    const order = await addContract({
      coverageId: metadata.coverage_id,
      tariffId: metadata.tariff_id ?? metadata.coverage_id, // body coverage_id kullanır; tariffId tipte zorunlu
      dateFrom: metadata.starts_at,
      dateTo: metadata.ends_at,
      insurer: {
        firstName: lead.first_name,
        lastName: lead.last_name,
        phone: trip.contact_phone,
        email: trip.contact_email,
        dateBirth: lead.birth_date ?? '',
        passport: lead.passport_number ?? '',
      },
      tourists,
    })

    await confirmContract({ orderId: order.orderId, paymentId: 1 }) // SABİT 1 (Auras: "ödeme bizde tamam")

    const pdf = await getPrintForm({ orderId: order.orderId }) // ham %PDF Buffer
    const key = buildPolicyKey(tripId, order.orderId)
    await putObject(getPolicyBucket(), key, pdf, 'application/pdf')

    await writeMetadata(
      supabase,
      item.id,
      { ...metadata, order_id: order.orderId, police_num: order.policeNum, policy_r2_key: key, policy_state: 'issued' },
      'confirmed',
    )
    return { ok: true, policeNum: order.policeNum, r2Key: key }
  } catch (err) {
    // NON-FATAL — ödeme zaten alındı; çağıran bozulmaz. Admin retry için işaretle.
    await writeMetadata(supabase, item.id, { ...metadata, policy_state: 'failed' })
    console.error('[issuePolicy] failed for trip', tripId, err)
    return { ok: false, error: err instanceof Error ? err.message : 'issuePolicy failed' }
  }
}

// jsonb tümden yazılır (Supabase partial-merge yapmaz). state opsiyonel.
async function writeMetadata(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  itemId: string,
  metadata: InsuranceItemMetadata,
  state?: string,
): Promise<void> {
  const patch: Record<string, unknown> = { metadata, updated_at: new Date().toISOString() }
  if (state) patch.state = state
  const { error } = await supabase.from('trip_items').update(patch).eq('id', itemId)
  if (error) console.error('[issuePolicy] metadata write failed for item', itemId, error.message)
}
