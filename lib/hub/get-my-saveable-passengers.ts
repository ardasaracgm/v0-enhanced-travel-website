import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { ageOn, todayAthensISO } from '@/lib/validation/dates'
import type { PassengerType, TripState } from '@/lib/supabase'

// Only trips whose payment is settled expose their passengers for companion
// saving — the "paid" set the trip-detail page uses (confirmed + downstream
// lifecycle). draft / pending_payment / failed / cancelled are excluded.
const SAVEABLE_STATES: TripState[] = ['confirmed', 'in_progress', 'completed']

export interface SaveablePassenger {
  passengerId: string        // DB passengers.id — the save action re-reads PII by this
  name: string
  tripReference: string
}

/**
 * 🔐 getMySaveablePassengers — non-lead ADULT passengers across a user's PAID
 * trips, for the Hub "save as companion" flow. Returns display-only DTOs (name +
 * trip ref); NO PII (passport/DOB) leaves here — the save action re-reads it
 * server-side by passengerId.
 *
 * SERVICE-ROLE + ZORUNLU EMAIL-SCOPE (İHLAL = IDOR/veri sızıntısı): trips/
 * passengers'ta owner-read RLS YOK → service-role RLS'i bypass eder. `email`
 * (doğrulanmış oturumdan, auth.email()) TEK bariyer; boşsa ASLA geniş sorgu →
 * [] dön. Trip seçimi ilike + JS'te tam eşitlikle süzülür (get-my-reservations
 * deseni) → crafted `_`/`%` email filtreyi genişletemez.
 */
export async function getMySaveablePassengers(email: string): Promise<SaveablePassenger[]> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return []   // boş email → asla geniş sorgu

  const supabase = getSupabaseAdmin()
  const { data: trips } = await supabase
    .from('trips')
    .select('id, reference, contact_email, state')
    .ilike('contact_email', normalized)
    .in('state', SAVEABLE_STATES)
    .order('created_at', { ascending: false })

  // ilike `_`/`%` joker → tam (case-insensitive) eşitlikle yeniden süz.
  const mine = (trips ?? []).filter((t) => (t.contact_email ?? '').toLowerCase() === normalized)
  if (mine.length === 0) return []

  const refByTrip = new Map(mine.map((t) => [t.id as string, t.reference as string]))

  const { data: paxRows } = await supabase
    .from('passengers')
    .select('id, trip_id, first_name, last_name, birth_date, passport_number, type, is_lead')
    .in('trip_id', mine.map((t) => t.id))

  const out: SaveablePassenger[] = []
  const seen = new Set<string>()

  for (const p of paxRows ?? []) {
    if (p.is_lead) continue   // booker/self → already the owner's self-row (/hub/profile)
    if (!isSaveableAdult(p.type as PassengerType | null, (p.birth_date as string | null) ?? null)) continue

    const first = (p.first_name as string | null) ?? ''
    const last = (p.last_name as string | null) ?? ''
    const name = [first, last].filter(Boolean).join(' ').trim()
    if (!name) continue

    // Dedup: same person across trips shown once. Prefer passport (exact); fall
    // back to name+DOB. passport_number is read for keying ONLY — never returned.
    const passport = (p.passport_number as string | null) ?? ''
    const key = passport
      ? `pp:${passport.toLowerCase()}`
      : `nd:${first.toLowerCase()}|${last.toLowerCase()}|${(p.birth_date as string | null) ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)

    out.push({ passengerId: p.id as string, name, tripReference: refByTrip.get(p.trip_id as string) ?? '' })
  }

  return out
}

/**
 * v1 = adults only (minors skipped — Hub companion flow has no guardian step).
 * "Hide the provably-minor, show the uncertain": type==='adult' → show;
 * child/infant → hide; type missing → derive from DOB (age≥18 → show); DOB also
 * missing → show (assume adult — most passengers are). Shared with the save
 * action so the list filter and the server-side re-check never diverge.
 */
export function isSaveableAdult(type: PassengerType | null, birthDate: string | null): boolean {
  if (type === 'child' || type === 'infant') return false
  if (type === 'adult') return true
  if (birthDate) return ageOn(birthDate, todayAthensISO()) >= 18
  return true
}
