'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { requireFullAdmin } from '@/lib/auth/require-admin'
import { issuePolicy } from '@/lib/insurance/issue-policy'

/**
 * Admin "Issue policy" backstop — issuePolicy(tripId)'i admin onayıyla tetikler.
 * GÜVENLİK: server action layout gate'inden korunmaz → guard burada tekrar
 * (updateVisaState pattern). issuePolicy zaten idempotent + non-throwing.
 */
export async function issuePolicyAction(formData: FormData): Promise<void> {
  const tripId = String(formData.get('tripId') ?? '')
  const locale = String(formData.get('locale') ?? 'tr')
  if (!tripId) throw new Error('invalid_request')

  // Gate — full-admin (is_admin && admin_role='full'). cars_only reddedilir.
  if (!(await requireFullAdmin()).ok) throw new Error('forbidden')

  const res = await issuePolicy(tripId)
  revalidatePath(`/${locale}/admin/insurance`)

  // redirect() NEXT_REDIRECT fırlatır → try/catch ile YUTULMAZ (guard dışında).
  if (!res.ok) {
    redirect(`/${locale}/admin/insurance?err=${tripId}&msg=${encodeURIComponent(res.error)}`)
  }
  redirect(`/${locale}/admin/insurance?ok=${tripId}`)
}
