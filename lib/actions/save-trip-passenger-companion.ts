'use server'

import { revalidatePath } from 'next/cache'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { createCompanionForOwner } from '@/lib/companions/create-companion'
import { isSaveableAdult } from '@/lib/hub/get-my-saveable-passengers'
import { sendCompanionInvite } from '@/lib/email/send-companion-invite'
import type { Locale } from '@/lib/notifications/whatsapp-link'
import type { PassengerType } from '@/lib/supabase'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function asLocale(v: string): Locale {
  return (['tr', 'en', 'el'].includes(v) ? v : 'tr') as Locale
}

export type SaveCompanionResult =
  | { status: 'saved'; name: string }
  | { status: 'duplicate' }
  | { status: 'invalid' }
  | { status: 'error' }

/**
 * Save a passenger from one of the owner's PAID trips as a travel companion
 * (Hub post-payment flow, Kademe 4a). React 19 useActionState signature so each
 * per-passenger <form> renders its own result.
 *
 * SERVER-AUTHORITATIVE PII: the client sends ONLY passengerId + email. Name /
 * DOB / passport are re-read from the DB here — never trusted from the client.
 * 🔐 IDOR GATE = the SAME proven check as getMyTripById: read the passenger's
 * trip, reject unless trip.contact_email == auth.email(). trip_id comes from the
 * DB row, never the client.
 */
export async function saveTripPassengerAsCompanionAction(
  _prev: SaveCompanionResult | null,
  formData: FormData,
): Promise<SaveCompanionResult> {
  const locale = String(formData.get('locale') ?? 'tr')
  const passengerId = String(formData.get('passengerId') ?? '').trim()
  const contactEmail = String(formData.get('email') ?? '').trim().toLowerCase()

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const ownerEmail = (user?.email ?? '').toLowerCase()
  if (!user || !ownerEmail) return { status: 'error' }

  // Email REQUIRED in this flow (no incomplete companion): invalid/empty → stop.
  if (!EMAIL_RE.test(contactEmail)) return { status: 'invalid' }
  if (!passengerId) return { status: 'error' }

  // Server-authoritative read: passenger PII + its trip, via service-role.
  const admin = getSupabaseAdmin()
  const { data: pax } = await admin
    .from('passengers')
    .select('id, trip_id, first_name, last_name, birth_date, gender, passport_number, passport_country, passport_expiry, nationality, type, is_lead')
    .eq('id', passengerId)
    .maybeSingle()
  if (!pax) return { status: 'error' }

  // 🔐 IDOR GATE — trip.contact_email == auth.email() (getMyTripById deseni).
  const { data: trip } = await admin
    .from('trips')
    .select('contact_email')
    .eq('id', pax.trip_id)
    .maybeSingle()
  if (!trip || (trip.contact_email ?? '').toLowerCase() !== ownerEmail) return { status: 'error' }

  // Eligibility re-enforced server-side (don't trust the client sent only
  // eligible rows): non-lead + adult, matching the list filter's single source.
  if (pax.is_lead) return { status: 'error' }
  if (!isSaveableAdult(pax.type as PassengerType | null, (pax.birth_date as string | null) ?? null)) {
    return { status: 'error' }
  }

  const firstName = (pax.first_name as string | null) ?? ''
  const result = await createCompanionForOwner(
    supabase,
    { id: user.id, email: ownerEmail },
    {
      firstName,
      lastName: (pax.last_name as string | null) ?? '',
      contactEmail,
      birthDate: (pax.birth_date as string | null) ?? null,
      nationality: (pax.nationality as string | null) ?? null,
      gender: (pax.gender as string | null) ?? null,
      passportNumber: (pax.passport_number as string | null) ?? null,
      passportCountry: (pax.passport_country as string | null) ?? null,
      passportExpiry: (pax.passport_expiry as string | null) ?? null,
    },
  )

  if (!result.ok) {
    return { status: result.errorCode === 'duplicate' ? 'duplicate' : 'error' }
  }

  // Non-fatal invite: the row is already saved; a mail failure must NOT fail the
  // save (companion > invite). Log and continue — owner can re-trigger later.
  if (result.consentToken && result.contactEmail) {
    try {
      await sendCompanionInvite(result.contactEmail, {
        ownerName: result.ownerName,
        companionName: firstName,
        consentToken: result.consentToken,
        locale: asLocale(locale),
      })
    } catch (err) {
      console.error('[save-companion] invite failed (companion still saved):', err)
    }
  }

  revalidatePath(`/${locale}/hub/companions`)
  return { status: 'saved', name: [firstName, pax.last_name].filter(Boolean).join(' ').trim() }
}
