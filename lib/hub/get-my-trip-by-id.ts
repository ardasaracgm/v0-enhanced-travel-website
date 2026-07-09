import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { maskPassport } from './mask-passport'
import { ferryVoucherSections, type VoucherSection } from '@/lib/ferry/voucher-split'
import type { FerryItemMetadata, TransferItemMetadata, TripItemType, TripState } from '@/lib/supabase'

export interface HubTripDetailItem {
  type: TripItemType
  title: string
  scheduledAt: string | null
  endsAt: string | null
  /** ferry only — departure/arrival port names, so the view can pick the right
   *  timezone for the day (see lib/dates/display.ts ferryLocalDay). */
  fromPort: string | null
  toPort: string | null
  priceAmount: number
  priceCurrency: string
}

export interface HubTripPassenger {
  name: string
  birthDate: string | null
  passportMasked: string | null   // "••••••34" — full number NEVER leaves the server
  nationality: string | null
  isLead: boolean
}

export interface HubTripDetail {
  id: string
  reference: string
  state: TripState
  totalAmount: number
  currency: string
  createdAt: string
  confirmedAt: string | null
  contactPhone: string
  contactEmail: string
  items: HubTripDetailItem[]
  passengers: HubTripPassenger[]
  ferryVouchers: VoucherSection[]  // Dentur-style Voucher No + PNR sections
  ferryReserveFailed: boolean      // any ferry leg whose provider reserve failed
}

/**
 * 🔐 getMyTripById — a single trip with ALL its items, passengers and ferry
 * vouchers. Trip-centric (a booking is a cart: ferry + luggage + transfer + … in
 * ONE trip), so this is the whole booking in one place.
 *
 * SAHİPLİK KAPISI (IDOR): trip'i id ile çek, `contact_email == oturum email`
 * (normalized) DEĞİLSE null dön — çağıran sayfada `notFound()` (varlık sızdırma
 * yok). Bundan SONRA items/passengers okunur; trip_id DB'den gelir, kullanıcıdan
 * ASLA. (getMyVisaApplicationById deseninin birebir aynısı.)
 */
export async function getMyTripById(id: string, email: string): Promise<HubTripDetail | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null

  const supabase = getSupabaseAdmin()
  const { data: trip } = await supabase
    .from('trips')
    .select('id, reference, state, total_amount, currency, created_at, confirmed_at, contact_email, contact_phone')
    .eq('id', id)
    .maybeSingle()

  // 🔐 KAPI — bundan önce HİÇBİR item/passenger okunmaz.
  if (!trip || (trip.contact_email ?? '').toLowerCase() !== normalized) return null

  const { data: itemRows } = await supabase
    .from('trip_items')
    .select('item_type, title, scheduled_at, ends_at, price_amount, price_currency, metadata')
    .eq('trip_id', id)
    .order('sequence', { ascending: true })

  const { data: paxRows } = await supabase
    .from('passengers')
    .select('first_name, last_name, birth_date, passport_number, nationality, is_lead')
    .eq('trip_id', id)
    .order('is_lead', { ascending: false })

  const items: HubTripDetailItem[] = (itemRows ?? []).map((it) => {
    let scheduledAt = it.scheduled_at as string | null
    let endsAt = it.ends_at as string | null
    // Transfer keeps its per-leg dates in metadata (RAW YYYY-MM-DD); the
    // scheduled_at instant can be absent for a transfer row → read the SAME
    // source as the list (get-my-transfer-reservations) so the two views never
    // disagree. one-way → single date (endsAt null); round-trip → out → return.
    if (it.item_type === 'transfer') {
      const m = (it.metadata ?? {}) as TransferItemMetadata
      scheduledAt = m.outbound?.date ?? m.return?.date ?? scheduledAt ?? null
      endsAt = m.outbound?.date && m.return?.date ? m.return.date : null
    }
    const fm = it.item_type === 'ferry' ? ((it.metadata ?? {}) as FerryItemMetadata) : null
    return {
      type: it.item_type as TripItemType,
      title: it.title,
      scheduledAt,
      endsAt,
      fromPort: fm?.from_port ?? null,
      toPort: fm?.to_port ?? null,
      priceAmount: Number(it.price_amount ?? 0),
      priceCurrency: (it.price_currency as string | null) ?? trip.currency ?? 'EUR',
    }
  })

  const passengers: HubTripPassenger[] = (paxRows ?? []).map((p) => ({
    name: [p.first_name, p.last_name].filter(Boolean).join(' ').trim(),
    birthDate: (p.birth_date as string | null) ?? null,
    passportMasked: maskPassport(p.passport_number as string | null),
    nationality: (p.nationality as string | null) ?? null,
    isLead: !!p.is_lead,
  }))

  const ferryLegs = (itemRows ?? [])
    .filter((it) => it.item_type === 'ferry')
    .map((it, idx) => ({ id: String(idx), meta: (it.metadata ?? {}) as FerryItemMetadata }))
  const ferryVouchers = ferryVoucherSections(ferryLegs)
  // reserveFerry is non-fatal (confirmTrip), so a paid trip can still have a
  // failed ferry reservation — surface it so the user can reach support.
  const ferryReserveFailed = ferryLegs.some((l) => l.meta.reserve_state === 'failed')

  return {
    id: trip.id,
    reference: trip.reference,
    state: trip.state as TripState,
    totalAmount: Number(trip.total_amount ?? 0),
    currency: trip.currency,
    createdAt: trip.created_at,
    confirmedAt: (trip.confirmed_at as string | null) ?? null,
    contactPhone: trip.contact_phone,
    contactEmail: trip.contact_email,
    items,
    passengers,
    ferryVouchers,
    ferryReserveFailed,
  }
}
