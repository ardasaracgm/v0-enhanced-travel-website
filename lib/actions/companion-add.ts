'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { sendCompanionInvite } from '@/lib/email/send-companion-invite'
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
  const firstName = String(formData.get('firstName') ?? '').trim()
  const lastName = String(formData.get('lastName') ?? '').trim()
  const contactEmail = String(formData.get('contactEmail') ?? '').trim().toLowerCase()
  const birthDate = String(formData.get('birthDate') ?? '').trim()
  const nationality = String(formData.get('nationality') ?? '').trim()
  const gender = String(formData.get('gender') ?? '').trim()
  const passportNumber = String(formData.get('passportNumber') ?? '').trim()
  const passportCountry = String(formData.get('passportCountry') ?? '').trim()

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/hub`)

  if (!firstName || !lastName || !EMAIL_RE.test(contactEmail)) {
    redirect(`/${locale}/hub/companions?err=invalid`)
  }

  // Owner display name: customers.full_name (booking-captured) → email local-part.
  // Read via service-role — customers has no owner-read RLS policy for this user.
  const email = (user.email ?? '').toLowerCase()
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
      owner_id: user.id,
      owner_name: ownerName,
      first_name: firstName,
      last_name: lastName,
      contact_email: contactEmail,
      birth_date: birthDate || null,
      nationality: nationality || null,
      gender: gender || null,
      passport_number: passportNumber || null,
      passport_country: passportCountry || null,
      status: 'pending',
    })
    .select('consent_token, contact_email')
    .maybeSingle()

  if (error) {
    // 23505 = adult double-add unique index (owner_id, lower(contact_email)).
    redirect(`/${locale}/hub/companions?err=${error.code === '23505' ? 'duplicate' : 'save'}`)
  }

  if (inserted?.consent_token && inserted.contact_email) {
    await sendCompanionInvite(inserted.contact_email, {
      ownerName,
      companionName: firstName,
      consentToken: inserted.consent_token,
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
    await supabase.from('travel_companions').delete().eq('id', id).eq('owner_id', user.id)
    revalidatePath(`/${locale}/hub/companions`)
  }
  redirect(`/${locale}/hub/companions?deleted=1`)
}
