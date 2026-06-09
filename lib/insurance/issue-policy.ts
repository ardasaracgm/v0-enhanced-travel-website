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
 * RESUMABLE + İDEMPOTENT: policy_state==='issued' ise no-op; order_id varsa addContract
 * ATLANIR (mükerrer order yok). NON-FATAL: çağıran (webhook/admin) ödeme akışını
 * bozmamalı → hata { ok:false } döner.
 *
 * confirm-tolerant / print-authoritative: confirmContract hatası YUTULUR (Auras
 * zaten-confirmed order'ı reddeder), "poliçe aktif mi" kararını get_print_form verir
 * (aktif→gerçek %PDF, değil→0 byte → %PDF guard fırlatır → pending kalır).
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

  // insurance item (metadata = durum makinesinin kaynağı).
  const { data: item, error: itemErr } = await supabase
    .from('trip_items')
    .select('id, metadata')
    .eq('trip_id', tripId)
    .eq('item_type', 'insurance')
    .maybeSingle()
  if (itemErr) return { ok: false, error: `insurance item lookup failed: ${itemErr.message}` }
  if (!item) return { ok: true, skipped: 'no_insurance' }

  const metadata = (item.metadata ?? {}) as InsuranceItemMetadata

  // Tam-bitmiş kriteri = policy_state 'issued' (order_id TEK BAŞINA yetmez —
  // yarım kalmışta da order_id var). RESUMABLE: pending → confirmed → issued.
  if (metadata.policy_state === 'issued') return { ok: true, skipped: 'already_issued' }

  try {
    // ---- STAGE 1 — FRESH: order yoksa addContract + order_id'yi HEMEN persist ----
    if (metadata.order_id === undefined) {
      // coverage_id zorunlu (yeni booking'lerde resolver yazar; tariff_id'yi VARSAYMA).
      if (metadata.coverage_id === undefined) {
        return { ok: false, error: 'missing coverage_id in insurance metadata' }
      }
      if (!metadata.starts_at || !metadata.ends_at) {
        return { ok: false, error: 'missing insurance dates in metadata' }
      }

      // insurer = lead passenger + trip contact; tourists = tüm passengers (yalnız FRESH'te okunur).
      const { data: trip, error: tripErr } = await supabase
        .from('trips').select('contact_email, contact_phone').eq('id', tripId).maybeSingle()
      if (tripErr || !trip) return { ok: false, error: `Trip not found: ${tripId}` }

      const { data: lead } = await supabase
        .from('passengers').select('first_name, last_name, birth_date, passport_number')
        .eq('trip_id', tripId).eq('is_lead', true).maybeSingle()
      if (!lead) return { ok: false, error: 'lead passenger not found' }

      const { data: passengers } = await supabase
        .from('passengers').select('first_name, last_name, birth_date, passport_number').eq('trip_id', tripId)
      const tourists = (passengers ?? []).map((p) => ({
        firstName: p.first_name, lastName: p.last_name,
        dateBirth: p.birth_date ?? '', passport: p.passport_number ?? '',
      }))
      if (tourists.length === 0) return { ok: false, error: 'no passengers for tourists' }

      const order = await addContract({
        coverageId: metadata.coverage_id,
        tariffId: metadata.tariff_id ?? metadata.coverage_id, // body coverage_id kullanır; tariffId tipte zorunlu
        dateFrom: metadata.starts_at,
        dateTo: metadata.ends_at,
        insurer: {
          firstName: lead.first_name, lastName: lead.last_name,
          phone: trip.contact_phone, email: trip.contact_email,
          dateBirth: lead.birth_date ?? '', passport: lead.passport_number ?? '',
        },
        tourists,
      })

      // order_id'yi HEMEN yaz → retry'da mükerrer addContract OLMASIN. Bu persist
      // KRİTİK: başarısızsa confirm'e GEÇME (takipsiz order'ı logla, manuel reconcile).
      metadata.order_id = order.orderId
      metadata.police_num = order.policeNum
      metadata.policy_state = 'pending'
      const persisted = await writeMetadata(supabase, item.id, metadata)
      if (!persisted) {
        console.error('[issuePolicy] CRITICAL: order created but order_id persist failed', tripId, 'orderId=', order.orderId)
        return { ok: false, error: `order ${order.orderId} created but order_id persist failed — manual reconcile` }
      }
    }

    const orderId = metadata.order_id as number // STAGE 1 sonrası kesin var

    // ---- STAGE 2 — confirm (TOLERANT) — hata olursa YUT + logla. Auras zaten-confirmed
    //      order'ı REDDEDER (success=false) ve ilk-confirm de patlayabilir; "aktif mi"
    //      kararı STAGE 3'teki get_print_form'a bırakılır (aktif→%PDF, değil→0 byte).
    try {
      await confirmContract({ orderId, paymentId: 1 }) // SABİT 1 (Auras: "ödeme bizde tamam")
    } catch (confirmErr) {
      console.warn('[issuePolicy] confirm_contract failed — deferring to print as authority:',
        confirmErr instanceof Error ? confirmErr.message : confirmErr)
    }

    // ---- STAGE 3 — print OTORİTE + R2 + issued. getPrintForm'un %PDF guard'ı aktif
    //      olmayan poliçenin 0-byte yanıtını yakalar → throw → catch → pending kalır (retry güvenli).
    const pdf = await getPrintForm({ orderId }) // aktif değilse guard fırlatır
    const key = buildPolicyKey(tripId, orderId)
    await putObject(getPolicyBucket(), key, pdf, 'application/pdf')

    metadata.policy_r2_key = key
    metadata.policy_state = 'issued'
    await writeMetadata(supabase, item.id, metadata, 'confirmed')
    return { ok: true, policeNum: metadata.police_num, r2Key: key }
  } catch (err) {
    // NON-FATAL. order_id YOKSA addContract patladı → 'failed' işaretle (retry = fresh, güvenli).
    // order_id VARSA stage'i ('pending'/'confirmed') KORU → sonraki çağrı RESUME etsin (mükerrer order yok).
    if (metadata.order_id === undefined) {
      await writeMetadata(supabase, item.id, { ...metadata, policy_state: 'failed' })
    }
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
): Promise<boolean> {
  const patch: Record<string, unknown> = { metadata, updated_at: new Date().toISOString() }
  if (state) patch.state = state
  const { error } = await supabase.from('trip_items').update(patch).eq('id', itemId)
  if (error) {
    console.error('[issuePolicy] metadata write failed for item', itemId, error.message)
    return false
  }
  return true
}
