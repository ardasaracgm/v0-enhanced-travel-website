'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { getSupabaseAdmin } from '@/lib/supabase-server'

/**
 * Two-sided companion consent — token-gated, NO auth (service-role, RLS bypass).
 * The consent link is permanent: the same token approves, later revokes, and
 * re-approves. Every transition is a single atomic guarded UPDATE, so a
 * double-click / re-open is idempotent (0 rows back = already in that state).
 */
export type ConsentResult =
  | { ok: true; status: 'active' | 'revoked'; changed: boolean }
  | { ok: false; error: string }

export async function applyCompanionConsent(
  token: string,
  intent: 'approve' | 'revoke'
): Promise<ConsentResult> {
  if (!token) return { ok: false, error: 'missing_token' }
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

  if (intent === 'approve') {
    // pending (first consent) OR revoked (re-consent) → active; clears revoked_at.
    const { data, error } = await supabase
      .from('travel_companions')
      .update({ status: 'active', consent_at: now, revoked_at: null, updated_at: now })
      .eq('consent_token', token)
      .in('status', ['pending', 'revoked'])
      .select('id')
      .maybeSingle()
    if (error) return { ok: false, error: error.message }
    return { ok: true, status: 'active', changed: !!data }
  }

  // revoke: anything not already revoked → revoked; stamps revoked_at (audit/KVKK).
  const { data, error } = await supabase
    .from('travel_companions')
    .update({ status: 'revoked', revoked_at: now, updated_at: now })
    .eq('consent_token', token)
    .neq('status', 'revoked')
    .select('id')
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  return { ok: true, status: 'revoked', changed: !!data }
}

// ── Form-action wrappers (consent page buttons) ─────────────────────────────
// Mutate → revalidate → redirect back to the same token page (status-driven
// re-render shows the new state). redirect() throws NEXT_REDIRECT by design.

export async function approveConsentFormAction(formData: FormData): Promise<void> {
  const token = String(formData.get('token') ?? '')
  const locale = String(formData.get('locale') ?? 'tr')
  const res = await applyCompanionConsent(token, 'approve')
  revalidatePath(`/${locale}/companion/consent/${token}`)
  redirect(`/${locale}/companion/consent/${token}${res.ok ? '' : '?err=1'}`)
}

export async function revokeConsentFormAction(formData: FormData): Promise<void> {
  const token = String(formData.get('token') ?? '')
  const locale = String(formData.get('locale') ?? 'tr')
  const res = await applyCompanionConsent(token, 'revoke')
  revalidatePath(`/${locale}/companion/consent/${token}`)
  redirect(`/${locale}/companion/consent/${token}${res.ok ? '' : '?err=1'}`)
}
