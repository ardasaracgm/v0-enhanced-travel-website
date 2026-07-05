import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { maskPassport } from './mask-passport'

export type CompanionStatus = 'pending' | 'active' | 'revoked'

// Revoked companions: mask identifying PII at the server boundary (same principle
// as maskPassport) so a withdrawn person's full name / email / DOB never reach the
// client. The owner still recognises the row from initials + email domain.
function maskName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + '•••')
    .join(' ')
}

function maskEmail(email: string | null): string | null {
  if (!email) return null
  const at = email.indexOf('@')
  if (at <= 0) return '•••' // no local-part → fully masked
  return email[0] + '•••' + email.slice(at) // "a•••@gmail.com" — domain kept
}

export interface HubCompanion {
  id: string
  name: string
  contactEmail: string | null
  birthDate: string | null
  nationality: string | null
  passportMasked: string | null // "••••••34" — full number NEVER leaves the server
  status: CompanionStatus
}

/**
 * Owner's saved travel companions. Reads with the caller's RLS/anon client — the
 * travel_companions_owner_all policy (owner_id = auth.uid()) already scopes rows
 * to the signed-in owner, so no in-code email gate is needed (unlike the
 * service-role trip helpers). ownerId is passed only as a defensive, explicit
 * filter that also documents intent.
 */
export async function getMyCompanions(
  supabase: SupabaseClient,
  ownerId: string
): Promise<HubCompanion[]> {
  const { data, error } = await supabase
    .from('travel_companions')
    .select('id, first_name, last_name, contact_email, birth_date, nationality, passport_number, status')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((c) => {
    const status = c.status as CompanionStatus
    const revoked = status === 'revoked'
    const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ').trim()
    const email = (c.contact_email as string | null) ?? null
    return {
      id: c.id as string,
      // Revoked → mask name/email/DOB at the server boundary (full PII never sent).
      name: revoked ? maskName(fullName) : fullName,
      contactEmail: revoked ? maskEmail(email) : email,
      birthDate: revoked ? null : ((c.birth_date as string | null) ?? null),
      nationality: (c.nationality as string | null) ?? null,
      passportMasked: maskPassport(c.passport_number as string | null), // already masked
      status,
    }
  })
}
