'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { sendCompanionInvite } from '@/lib/email/send-companion-invite'
import { createCompanionForOwner } from '@/lib/companions/create-companion'
import { parseISODate, ageOn, todayAthensISO } from '@/lib/validation/dates'
import { PASSPORT_RE } from '@/lib/validation/booking'
import { isNationality } from '@/lib/countries'
import { upperName, upperPassport } from '@/lib/text/uppercase'
import type { Locale } from '@/lib/notifications/whatsapp-link'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function asLocale(v: string): Locale {
  return (['tr', 'en', 'el'].includes(v) ? v : 'tr') as Locale
}

/**
 * Owner adds a saved travel companion (Hub). Writes with the RLS/anon client —
 * the travel_companions_owner_all policy authorises owner_id = auth.uid(), the
 * first owner-scoped RLS write in the app. Inserts a pending row, resolves a
 * display owner_name (customers.full_name → email local-part), then fires the
 * consent invite. Two-sided consent: the companion must approve via the emailed
 * token link before the row is usable (Parça 4 booking gate).
 */
export async function addCompanionFormAction(formData: FormData): Promise<void> {
  const locale = String(formData.get('locale') ?? 'tr')
  // Names/passport are uppercased at the boundary so hub-saved companions match
  // what the passenger forms produce (shared upperName/upperPassport helpers).
  const firstName = upperName(String(formData.get('firstName') ?? '').trim())
  const lastName = upperName(String(formData.get('lastName') ?? '').trim())
  const contactEmail = String(formData.get('contactEmail') ?? '').trim().toLowerCase()
  const birthDate = String(formData.get('birthDate') ?? '').trim()
  const nationality = String(formData.get('nationality') ?? '').trim()
  const gender = String(formData.get('gender') ?? '').trim()
  const passportNumber = upperPassport(String(formData.get('passportNumber') ?? '').trim())
  const passportCountry = String(formData.get('passportCountry') ?? '').trim()
  const passportExpiry = String(formData.get('passportExpiry') ?? '').trim()

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/hub`)

  if (!firstName || !lastName || !EMAIL_RE.test(contactEmail)) {
    redirect(`/${locale}/hub/companions?err=invalid`)
  }

  // Birth date optional, but if present it must be a real date, not in the future,
  // and age 0–120 (same bound as ferry passengers — blocks garbage years).
  if (birthDate) {
    const age = ageOn(birthDate, todayAthensISO())
    if (!parseISODate(birthDate) || age < 0 || age > 120) {
      redirect(`/${locale}/hub/companions?err=birthdate`)
    }
  }

  // Nationality / passport country: must be from the shared list if provided
  // (the form uses a select, so this is a forged-post backstop).
  if ((nationality && !isNationality(nationality)) || (passportCountry && !isNationality(passportCountry))) {
    redirect(`/${locale}/hub/companions?err=country`)
  }

  // Passport number: same rule as ferry passengers (5–20 alphanumeric) if provided.
  if (passportNumber && !PASSPORT_RE.test(passportNumber)) {
    redirect(`/${locale}/hub/companions?err=passport_format`)
  }

  // Passport number and its expiry are bound: provide both or neither, and the
  // expiry (if present) must be a real date.
  if (Boolean(passportNumber) !== Boolean(passportExpiry)) {
    redirect(`/${locale}/hub/companions?err=passport_expiry`)
  }
  if (passportExpiry && !parseISODate(passportExpiry)) {
    redirect(`/${locale}/hub/companions?err=passport_expiry`)
  }

  const email = (user.email ?? '').toLowerCase()
  const result = await createCompanionForOwner(
    supabase,
    { id: user.id, email },
    { firstName, lastName, contactEmail, birthDate, nationality, gender, passportNumber, passportCountry, passportExpiry },
  )

  if (!result.ok) {
    redirect(`/${locale}/hub/companions?err=${result.errorCode}`)
  }

  if (result.consentToken && result.contactEmail) {
    await sendCompanionInvite(result.contactEmail, {
      ownerName: result.ownerName,
      companionName: firstName,
      consentToken: result.consentToken,
      locale: asLocale(locale),
    })
  }

  revalidatePath(`/${locale}/hub/companions`)
  redirect(`/${locale}/hub/companions?added=1`)
}

/**
 * Owner removes a companion from their address book (hard-delete). This is the
 * owner's own list-management; it is distinct from the companion's token revoke
 * (status='revoked', row kept for audit). RLS scopes the delete to owner rows;
 * the owner_id filter is defensive/explicit.
 */
export async function deleteCompanionFormAction(formData: FormData): Promise<void> {
  const locale = String(formData.get('locale') ?? 'tr')
  const id = String(formData.get('id') ?? '')

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/hub`)

  if (id) {
    // is_self guard: the owner's self-row can never be deleted here (managed on
    // the profile page); only invited companions are removable.
    await supabase.from('travel_companions').delete().eq('id', id).eq('owner_id', user.id).eq('is_self', false)
    revalidatePath(`/${locale}/hub/companions`)
  }
  redirect(`/${locale}/hub/companions?deleted=1`)
}
