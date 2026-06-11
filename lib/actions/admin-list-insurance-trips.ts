import 'server-only'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import type { InsuranceItemMetadata, TripState } from '@/lib/supabase'

export interface InsuranceTripRow {
  tripId: string
  reference: string
  contactEmail: string
  tripState: TripState
  cancellationReason: string | null
  confirmedAt: string | null
  cancelledAt: string | null
  createdAt: string
  partySize: number
  policyState: 'pending' | 'issued' | 'failed' | 'none'
  touristCount: number | null
  coverageValue: number | null
  tariffName: string | null
  policeNum: string | null
  policyR2Key: string | null
}

export async function listInsuranceTrips(): Promise<
  { ok: true; rows: InsuranceTripRow[] } | { ok: false; error: string }
> {
  const supabase = getSupabaseAdmin()

  // 1) Önce insurance item'ları (tüm trips taranmaz; yalnız sigortalı evren)
  const { data: items, error: itemsErr } = await supabase
    .from('trip_items')
    .select('trip_id, metadata')
    .eq('item_type', 'insurance')

  if (itemsErr) return { ok: false, error: `items_query_failed: ${itemsErr.message}` }
  if (!items || items.length === 0) return { ok: true, rows: [] }

  const insuranceByTrip = new Map<string, InsuranceItemMetadata>()
  for (const it of items) {
    insuranceByTrip.set(it.trip_id as string, (it.metadata ?? {}) as InsuranceItemMetadata)
  }
  const tripIds = [...insuranceByTrip.keys()]

  // 2) O trip'leri getir (state filtresi YOK — admin hepsini görür)
  const { data: trips, error: tripsErr } = await supabase
    .from('trips')
    .select(
      'id, reference, contact_email, state, cancellation_reason, confirmed_at, cancelled_at, created_at, party_size',
    )
    .in('id', tripIds)
    .order('created_at', { ascending: false })

  if (tripsErr) return { ok: false, error: `trips_query_failed: ${tripsErr.message}` }

  const rows: InsuranceTripRow[] = (trips ?? []).map((t) => {
    const m = insuranceByTrip.get(t.id)!
    return {
      tripId: t.id,
      reference: t.reference,
      contactEmail: t.contact_email,
      tripState: t.state as TripState,
      cancellationReason: t.cancellation_reason ?? null,
      confirmedAt: t.confirmed_at ?? null,
      cancelledAt: t.cancelled_at ?? null,
      createdAt: t.created_at,
      partySize: t.party_size,
      policyState: m.policy_state ?? 'none',
      touristCount: m.tourist_count ?? null,
      coverageValue: m.coverage_value ?? null,
      tariffName: m.tariff_name ?? null,
      policeNum: m.police_num ?? null,
      policyR2Key: m.policy_r2_key ?? null,
    }
  })

  return { ok: true, rows }
}
