'use server'

import { redirect } from 'next/navigation'

import { requireFullAdmin } from '@/lib/auth/require-admin'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getDownloadUrl, getPolicyBucket } from '@/lib/r2'
import type { InsuranceItemMetadata } from '@/lib/supabase'

/**
 * Admin "Download PDF" — poliçe PDF'i için kısa-ömürlü presigned R2 URL'ine 302.
 * policy_r2_key SERVER'da yeniden okunur (client değerine güvenilmez).
 */
export async function downloadPolicyPdfAction(formData: FormData): Promise<void> {
  const tripId = String(formData.get('tripId') ?? '')
  const locale = String(formData.get('locale') ?? 'tr')
  if (!tripId) throw new Error('invalid_request')

  // Gate — full-admin (is_admin && admin_role='full'). cars_only reddedilir.
  if (!(await requireFullAdmin()).ok) throw new Error('forbidden')

  // policy_r2_key'i server'dan oku — insurance trip_item metadata'sından.
  const admin = getSupabaseAdmin()
  const { data: item } = await admin
    .from('trip_items')
    .select('metadata')
    .eq('trip_id', tripId)
    .eq('item_type', 'insurance')
    .maybeSingle()

  const key = (item?.metadata as InsuranceItemMetadata | undefined)?.policy_r2_key
  if (!key) {
    redirect(`/${locale}/admin/insurance?err=${tripId}&msg=${encodeURIComponent('No policy PDF on file')}`)
  }

  // 302 → R2 presigned GET (5 dk TTL). redirect() NEXT_REDIRECT fırlatır.
  const url = await getDownloadUrl(key, `policy-${tripId}.pdf`, getPolicyBucket())
  redirect(url)
}
