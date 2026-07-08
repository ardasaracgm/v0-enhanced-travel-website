import 'server-only'

import type { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getSupabaseAdmin } from '@/lib/supabase-server'

type OwnerScopedClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

export interface CompanionFields {
  firstName: string
  lastName: string
  contactEmail: string
  birthDate?: string | null
  nationality?: string | null
  gender?: string | null
  passportNumber?: string | null
  passportCountry?: string | null
  passportExpiry?: string | null
}

export type CreateCompanionResult =
  | { ok: true; consentToken: string | null; contactEmail: string | null; ownerName: string }
  | { ok: false; errorCode: 'duplicate' | 'save' }

/**
 * Shared core for creating an owner-scoped pending travel companion. Resolves the
 * display owner_name (customers.full_name → email local-part) and inserts the row
 * with the passed RLS/anon client (travel_companions_owner_all → owner_id=auth.uid()).
 * FormData-agnostic and redirect-free: callers own validation, the consent invite,
 * and their HTTP/redirect flow. Used by the Hub add form and the post-payment
 * "save trip passenger as companion" flow.
 */
export async function createCompanionForOwner(
  supabase: OwnerScopedClient,
  owner: { id: string; email: string },
  fields: CompanionFields,
): Promise<CreateCompanionResult> {
  // Owner display name: customers.full_name (booking-captured) → email local-part.
  // Read via service-role — customers has no owner-read RLS policy for this user.
  const email = owner.email.toLowerCase()
  let ownerName = email.split('@')[0] || 'TravelBeez'
  const { data: cust } = await getSupabaseAdmin()
    .from('customers')
    .select('full_name')
    .eq('email', email)
    .maybeSingle()
  if (cust?.full_name) ownerName = cust.full_name

  const { data: inserted, error } = await supabase
    .from('travel_companions')
    .insert({
      owner_id: owner.id,
      owner_name: ownerName,
      first_name: fields.firstName,
      last_name: fields.lastName,
      contact_email: fields.contactEmail,
      birth_date: fields.birthDate || null,
      nationality: fields.nationality || null,
      gender: fields.gender || null,
      passport_number: fields.passportNumber || null,
      passport_country: fields.passportCountry || null,
      passport_expiry: fields.passportExpiry || null,
      status: 'pending',
    })
    .select('consent_token, contact_email')
    .maybeSingle()

  if (error) {
    // 23505 = adult double-add unique index (owner_id, lower(contact_email)).
    return { ok: false, errorCode: error.code === '23505' ? 'duplicate' : 'save' }
  }

  return {
    ok: true,
    consentToken: inserted?.consent_token ?? null,
    contactEmail: inserted?.contact_email ?? null,
    ownerName,
  }
}
