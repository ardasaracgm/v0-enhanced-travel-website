'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

import { requireFullAdmin } from '@/lib/auth/require-admin'
import { issuePolicy } from '@/lib/insurance/issue-policy'
import { logAuditEvent } from '@/lib/audit/log'
import { clientIp } from '@/lib/auth/rate-limit'

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
  //    gate bind edilir (userId + email audit için); mantık değişmez, fail-closed.
  const gate = await requireFullAdmin()
  if (!gate.ok) throw new Error('forbidden')

  const res = await issuePolicy(tripId)
  revalidatePath(`/${locale}/admin/insurance`)

  // Audit izi — issuePolicy idempotent + non-throwing; skipped ('already_issued'
  // vb.) da flag'le loglanır (no-op'u kaybetme). redirect'ten ÖNCE.
  await logAuditEvent({
    actorId: gate.userId,
    actorEmail: gate.email,
    action: 'policy.issue',
    targetType: 'trip',
    targetId: tripId,
    details: {
      ok: res.ok,
      police_num: res.ok ? res.policeNum ?? null : null,
      skipped: res.ok ? res.skipped ?? null : null,
      error: res.ok ? null : res.error,
    },
    ip: clientIp(await headers()),
  })

  // redirect() NEXT_REDIRECT fırlatır → try/catch ile YUTULMAZ (guard dışında).
  if (!res.ok) {
    redirect(`/${locale}/admin/insurance?err=${tripId}&msg=${encodeURIComponent(res.error)}`)
  }
  redirect(`/${locale}/admin/insurance?ok=${tripId}`)
}
