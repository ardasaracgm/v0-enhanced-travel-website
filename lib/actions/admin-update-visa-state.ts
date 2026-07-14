'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

import { requireFullAdmin } from '@/lib/auth/require-admin'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { logAuditEvent } from '@/lib/audit/log'
import { clientIp } from '@/lib/auth/rate-limit'

// Admin'in atayabileceği hedef state'ler (review terminalleri). CHECK bunların
// hepsini zaten geçerli sayıyor; burada admin'in dokunabileceği alt küme.
const ALLOWED_TARGETS = new Set(['reviewed', 'approved', 'rejected'])

/**
 * Vize başvurusunun state'ini değiştirir (admin).
 *
 * GÜVENLİK: bir server action BAĞIMSIZ çağrılabilir endpoint'tir — admin
 * layout gate'i BURAYI korumaz. Bu yüzden action KENDİ içinde auth + is_admin
 * doğrular (auth-aware client, profiles own-row RLS). Yazma ise service-role
 * ile: visa_applications'ta UPDATE RLS politikası yok → yalnız service-role
 * yazabilir.
 */
export async function updateVisaState(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  const target = String(formData.get('target') ?? '')
  const locale = String(formData.get('locale') ?? 'tr')

  if (!id || !ALLOWED_TARGETS.has(target)) {
    throw new Error('invalid_request')
  }

  // 1) Gate — full-admin (is_admin && admin_role='full'). cars_only reddedilir.
  //    gate bind edilir (userId + email audit için); mantık değişmez, fail-closed.
  const gate = await requireFullAdmin()
  if (!gate.ok) throw new Error('forbidden')

  // 2) Yazma — service-role (RLS visa_applications UPDATE'e izin vermiyor).
  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from('visa_applications')
    .update({ state: target, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`state_update_failed: ${error.message}`)

  // Audit izi — başarılı UPDATE sonrası, revalidate öncesi.
  await logAuditEvent({
    actorId: gate.userId,
    actorEmail: gate.email,
    action: 'visa.state',
    targetType: 'visa',
    targetId: id,
    details: { state: target },
    ip: clientIp(await headers()),
  })

  // force-dynamic olsa da mutasyon sonrası iki görünümü tazele.
  revalidatePath(`/${locale}/admin/visa/${id}`)
  revalidatePath(`/${locale}/admin`)
}
