'use server'

import { revalidatePath } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getSupabaseAdmin } from '@/lib/supabase-server'

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

  // 1) Gate — action'ın kendi yetki doğrulaması (layout gate buraya geçmez).
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

  // 2) Yazma — service-role (RLS visa_applications UPDATE'e izin vermiyor).
  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from('visa_applications')
    .update({ state: target, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`state_update_failed: ${error.message}`)

  // force-dynamic olsa da mutasyon sonrası iki görünümü tazele.
  revalidatePath(`/${locale}/admin/visa/${id}`)
  revalidatePath(`/${locale}/admin`)
}
