'use server'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'

export interface CompanionOption {
  id: string
  name: string
  isSelf: boolean // the owner's own self-row (managed on /hub/profile) — labelled "Kendim", sorted first
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
 * What the car-rental driver form needs — and nothing else. Deliberately NOT a
 * superset of CompanionPrefill: the driver form shows no passport, so no
 * passport crosses the wire for it. Keeping the two payloads separate also
 * keeps licenceExpiry out of the ferry passenger blocks, whose prefill spreads
 * the whole object into a Passenger (which has an optional licenseExpiry field
 * meant only for the car-only driver).
 */
export interface DriverPrefill {
  firstName: string
  lastName: string
  birthDate: string
  licenseExpiry: string
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
      .select('id, first_name, last_name, is_self')
      .eq('owner_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('phone').eq('id', user.id).maybeSingle(),
  ])

  const companions: CompanionOption[] = (rows ?? [])
    .map((c) => ({
      id: c.id as string,
      name: [c.first_name, c.last_name].filter(Boolean).join(' ').trim(),
      isSelf: Boolean(c.is_self),
    }))
    // Self-row first ("Kendim"), then invited companions in created_at order.
    .sort((a, b) => Number(b.isSelf) - Number(a.isSelf))

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
type CompanionRow = Record<string, string | null>

/**
 * The one ownership gate both prefill payloads go through: signed-in owner, own
 * row, active only. `columns` decides how much of the row is read — the caller
 * asks for exactly the fields its form renders, so a narrow form never pulls
 * passport data it will not show.
 */
async function fetchOwnedCompanion(id: string, columns: string): Promise<CompanionRow | null> {
  if (!id) return null

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('travel_companions')
    .select(columns)
    .eq('id', id)
    .eq('owner_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  return (data as CompanionRow | null) ?? null
}

export async function getCompanionForPrefill(id: string): Promise<CompanionPrefill | null> {
  const c = await fetchOwnedCompanion(
    id,
    'first_name, last_name, gender, birth_date, nationality, passport_number, passport_expiry',
  )
  if (!c) return null

  // Gender null/blank on the companion → 'unspecified' (a value the ferry select
  // and Zod both accept, and which the Dentur adapter maps to 'M'), NOT '' which
  // would leave the required select empty after prefill.
  const g = (c.gender as string | null) ?? ''
  return {
    firstName: (c.first_name as string | null) ?? '',
    lastName: (c.last_name as string | null) ?? '',
    gender: (g === 'male' || g === 'female' ? g : 'unspecified') as CompanionPrefill['gender'],
    birthDate: (c.birth_date as string | null) ?? '',
    passportNumber: (c.passport_number as string | null) ?? '',
    passportExpiryDate: (c.passport_expiry as string | null) ?? '',
    nationality: (c.nationality as string | null) ?? '',
  }
}

/**
 * Prefill payload for the car-rental driver form. Same on-demand, owner-scoped
 * read as getCompanionForPrefill, but only the four fields that form renders.
 * licenseExpiry may be '' — a companion saved for ferry travel need never have
 * one; the driver then types it in. Whether a present expiry actually covers
 * the rental is the caller's check (makeDriverSchema's licenseExpiry
 * .beforeDropoff), mirroring how passport expiry is gated at the ferry step.
 */
export async function getCompanionForDriverPrefill(id: string): Promise<DriverPrefill | null> {
  const c = await fetchOwnedCompanion(id, 'first_name, last_name, birth_date, license_expiry')
  if (!c) return null

  return {
    firstName: c.first_name ?? '',
    lastName: c.last_name ?? '',
    birthDate: c.birth_date ?? '',
    licenseExpiry: c.license_expiry ?? '',
  }
}
