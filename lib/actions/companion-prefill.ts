'use server'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'

export interface CompanionOption {
  id: string
  name: string
}

export interface CompanionPrefillContext {
  signedIn: boolean
  contactEmail: string
  contactPhone: string
  companions: CompanionOption[]
}

export interface CompanionPrefill {
  firstName: string
  lastName: string
  gender: '' | 'male' | 'female' | 'unspecified'
  birthDate: string
  passportNumber: string
  passportExpiryDate: string
  nationality: string
}

/**
 * Mount-time context for the ferry passenger step. A server action sees the
 * cookie session, so it reads the signed-in owner even though the caller is a
 * client component. Returns ONLY companion id+name (no PII shipped eagerly) plus
 * the owner's contact defaults. Guest → signedIn:false (current guest behaviour).
 * Owner-scoped via RLS (travel_companions_owner_all + profiles_select_own); the
 * owner_id filter is a defensive, explicit echo of that policy. Active only.
 */
export async function getCompanionPrefillContext(): Promise<CompanionPrefillContext> {
  const empty: CompanionPrefillContext = {
    signedIn: false,
    contactEmail: '',
    contactPhone: '',
    companions: [],
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return empty

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase
      .from('travel_companions')
      .select('id, first_name, last_name')
      .eq('owner_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('phone').eq('id', user.id).maybeSingle(),
  ])

  const companions: CompanionOption[] = (rows ?? []).map((c) => ({
    id: c.id as string,
    name: [c.first_name, c.last_name].filter(Boolean).join(' ').trim(),
  }))

  return {
    signedIn: true,
    contactEmail: user.email ?? '',
    contactPhone: (profile?.phone as string | null) ?? '',
    companions,
  }
}

/**
 * Full prefill payload for ONE active companion, fetched only when the owner
 * selects them (Option A, on-demand). The full passport crosses the wire only
 * here, for the deliberately-selected, consented companion — never eagerly and
 * never for a pending/revoked row (status='active' filter). RLS + owner_id scope
 * the read to the owner. Returns null if not found / not active / not theirs.
 */
export async function getCompanionForPrefill(id: string): Promise<CompanionPrefill | null> {
  if (!id) return null

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: c } = await supabase
    .from('travel_companions')
    .select('first_name, last_name, gender, birth_date, nationality, passport_number, passport_expiry')
    .eq('id', id)
    .eq('owner_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!c) return null

  const g = (c.gender as string | null) ?? ''
  return {
    firstName: (c.first_name as string | null) ?? '',
    lastName: (c.last_name as string | null) ?? '',
    gender: (g === 'male' || g === 'female' || g === 'unspecified' ? g : '') as CompanionPrefill['gender'],
    birthDate: (c.birth_date as string | null) ?? '',
    passportNumber: (c.passport_number as string | null) ?? '',
    passportExpiryDate: (c.passport_expiry as string | null) ?? '',
    nationality: (c.nationality as string | null) ?? '',
  }
}
