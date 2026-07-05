import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { maskPassport } from './mask-passport'

export type CompanionStatus = 'pending' | 'active' | 'revoked'

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

  return data.map((c) => ({
    id: c.id as string,
    name: [c.first_name, c.last_name].filter(Boolean).join(' ').trim(),
    contactEmail: (c.contact_email as string | null) ?? null,
    birthDate: (c.birth_date as string | null) ?? null,
    nationality: (c.nationality as string | null) ?? null,
    passportMasked: maskPassport(c.passport_number as string | null),
    status: c.status as CompanionStatus,
  }))
}
