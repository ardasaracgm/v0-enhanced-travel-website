'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { parseISODate, ageOn, todayAthensISO } from '@/lib/validation/dates'
import { PASSPORT_RE } from '@/lib/validation/booking'
import { isNationality } from '@/lib/countries'
import { upperName, upperPassport } from '@/lib/text/uppercase'

/**
 * Save the owner's own profile. Two writes, two concepts kept separate:
 *  - contact phone → profiles.phone (the booking CONTACT source; RLS update-own),
 *  - passenger identity → the single self-row in travel_companions
 *    (is_self=true, status='active', contact_email NULL — consent bypassed, the
 *    adult unique index sidestepped, no self-invite).
 * Same validation + uppercasing as companion-add (A-rule: passport number and
 * expiry are bound). Distinct err codes feed the profile-page banner.
 */
export async function saveProfileFormAction(formData: FormData): Promise<void> {
  const locale = String(formData.get('locale') ?? 'tr')
  const firstName = upperName(String(formData.get('firstName') ?? '').trim())
  const lastName = upperName(String(formData.get('lastName') ?? '').trim())
  const birthDate = String(formData.get('birthDate') ?? '').trim()
  const gender = String(formData.get('gender') ?? '').trim()
  const nationality = String(formData.get('nationality') ?? '').trim()
  const passportNumber = upperPassport(String(formData.get('passportNumber') ?? '').trim())
  const passportCountry = String(formData.get('passportCountry') ?? '').trim()
  const passportExpiry = String(formData.get('passportExpiry') ?? '').trim()
  const licenseExpiry = String(formData.get('licenseExpiry') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/hub`)

  const back = (q: string): never => redirect(`/${locale}/hub/profile${q}`)

  if (!firstName || !lastName) back('?err=invalid')
  if (birthDate) {
    const age = ageOn(birthDate, todayAthensISO())
    if (!parseISODate(birthDate) || age < 0 || age > 120) back('?err=birthdate')
  }
  if ((nationality && !isNationality(nationality)) || (passportCountry && !isNationality(passportCountry))) {
    back('?err=country')
  }
  if (passportNumber && !PASSPORT_RE.test(passportNumber)) back('?err=passport_format')
  if (Boolean(passportNumber) !== Boolean(passportExpiry)) back('?err=passport_expiry')
  if (passportExpiry && !parseISODate(passportExpiry)) back('?err=passport_expiry')
  // Licence expiry: optional, unbound (no licence number to pair with).
  if (licenseExpiry && !parseISODate(licenseExpiry)) back('?err=license_expiry')

  // Contact phone → profiles.phone (the single contact source; RLS update-own).
  await supabase.from('profiles').update({ phone: phone || null }).eq('id', user.id)

  // Upsert the self-row (owner_id + is_self). contact_email NULL by design.
  const row = {
    owner_id: user.id,
    is_self: true,
    status: 'active',
    contact_email: null,
    first_name: firstName,
    last_name: lastName,
    birth_date: birthDate || null,
    gender: gender || null,
    nationality: nationality || null,
    passport_number: passportNumber || null,
    passport_country: passportCountry || null,
    passport_expiry: passportExpiry || null,
    license_expiry: licenseExpiry || null,
    updated_at: new Date().toISOString(),
  }
  const { data: existing } = await supabase
    .from('travel_companions')
    .select('id')
    .eq('owner_id', user.id)
    .eq('is_self', true)
    .maybeSingle()
  if (existing) {
    await supabase.from('travel_companions').update(row).eq('id', existing.id)
  } else {
    await supabase.from('travel_companions').insert(row)
  }

  revalidatePath(`/${locale}/hub/profile`)
  back('?saved=1')
}
