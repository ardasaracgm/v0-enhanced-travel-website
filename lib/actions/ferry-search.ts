'use server'

import { getFerryProvider } from '@/lib/ferry'
import { slug } from '@/lib/ferry/util'
import { nearestCandidateDates, MAX_NEAREST_PROBES } from '@/lib/ferry/nearest'
import { todayAthensISO } from '@/lib/validation/dates'
import { addDaysISO } from '@/lib/trip-items/summary'
import type { FerryTrip } from '@/lib/ferry/provider'
import { DenturError } from '@/lib/ferry/dentur-error'

export interface FerrySearchActionInput {
  from: string
  to: string
  date: string
  pax?: { adults: number; children: number; infants: number }
}

/**
 * Client → provider boundary. Client components call THIS, never
 * getFerryProvider() (which can pull the server-only Dentur module). from/to are
 * slugged with the shared slug() so they match the Dentur adapter's port lookup.
 */
export async function searchFerriesAction(input: FerrySearchActionInput): Promise<FerryTrip[]> {
  const provider = await getFerryProvider()
  return provider.search({
    from: slug(input.from),
    to: slug(input.to),
    date: input.date,
    pax: input.pax,
  })
}

export interface FerrySearchResult {
  trips: FerryTrip[]
  reason?: 'route_not_offered' | 'no_trips_on_date' | 'no_trips_in_window' | 'provider_error'
  nearest?: FerryTrip
}

/** resolveDeparture/resolveArrival throw for an unoffered route (Dentur). */
function isUnknownRouteError(e: unknown): boolean {
  return e instanceof Error && /unknown_arrival|unknown_departure/.test(e.message)
}

/**
 * Main path: exact-date search (fresh quota). When empty, nearest-date fallback:
 *   route_not_offered      → route not in Dentur (UI: "not available")
 *   no_trips_on_date + nearest → none on this date; nearest AVAILABLE sailing (fresh-verified)
 *   no_trips_in_window     → no fresh-available day within ±NEAREST_WINDOW_DAYS
 *   provider_error         → provider threw (http/timeout/network) — degrade, never 500
 * The "nearest" business logic lives here; the provider returns raw data only.
 */
export async function searchFerriesWithNearestAction(
  input: FerrySearchActionInput,
): Promise<FerrySearchResult> {
  // A — kök guard: boş/parse-edilemez tarih Dentur'a GİTMESİN. TripSearch YYYY-MM-DD
  // bekliyor; "" / "2026-7-2" / "2026/07/02" → HTTP 400 (probe ile kanıtlı). Boş =
  // henüz arama yok → SESSİZ boş sonuç. UI no_trips_in_window'u graceful gösterir.
  const date = input.date.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { trips: [], reason: 'no_trips_in_window' }

  const from = slug(input.from), to = slug(input.to)

  // B — TEK savunma katmanı: main-search, schedule VE nearest-probe döngüsünün
  // fırlattığı her provider hatası buraya düşer → ham 500 yerine graceful reason.
  // Sıra kritik: unknown-route DA bir DenturError'dır → önce o yakalanmalı.
  try {
    const provider = await getFerryProvider()

    // 1) Main path — exact date, fresh quota.
    const trips = await provider.search({ from, to, date: input.date, pax: input.pax })
    if (trips.length > 0) return { trips }

    // 2) Empty day, route exists → season schedule for the fallback.
    const schedule = await provider.getRouteSchedule(from, to)
    const candidates = nearestCandidateDates(schedule, date, todayAthensISO())
      .slice(0, MAX_NEAREST_PROBES)

    // 3) Re-verify each candidate with a FRESH search (stale-cache guard); first available wins.
    for (const candidateDate of candidates) {
      const fresh = await provider.search({ from, to, date: `${candidateDate}T00:00:00`, pax: input.pax })
      const available = fresh.find((t) => t.passengerSeatsAvailable > 0)
      // Stamp the candidate date — mock search returns date-less trips; Dentur's is
      // already this date, so stamping is consistent across providers.
      if (available) return { trips: [], reason: 'no_trips_on_date', nearest: { ...available, date: candidateDate } }
    }

    // 4) No fresh-available candidate within the window (or all probes came back empty).
    console.warn(
      `[ferry] nearest fallback empty: ${from}→${to} @ ${date} — ` +
      `${candidates.length} candidate(s) probed, no fresh availability`,
    )
    return { trips: [], reason: 'no_trips_in_window' }
  } catch (e) {
    if (isUnknownRouteError(e)) return { trips: [], reason: 'route_not_offered' }
    if (e instanceof DenturError) {
      console.error(`[ferry] provider error: ${(e as Error).message}`)
      return { trips: [], reason: 'provider_error' }
    }
    throw e
  }
}

export interface RouteAvailability {
  /** Sezon ufku (sefer-günlerinin min–max'ı) içinde sefer-günü OLMAYAN günler
   *  (YYYY-MM-DD). DateRangeField.disabledDates'i besler — bu günler takvimde kapalı. */
  disabledDates: string[]
  /** Gün (YYYY-MM-DD) → o gün kalkan sefer sayısı. Şimdilik tüketilmiyor; ileride
   *  gün-başı sefer-sayısı badge'i (custom DayButton) için action'da hazır durur. */
  countByDate: Record<string, number>
  /** Gün (YYYY-MM-DD) → o günün tüm seferlerindeki kalan yolcu koltuğu toplamı
   *  (Σ passengerSeatsAvailable). Tarih şeridi satır2'sini besler (akıllı: eşik
   *  altı koltuk, üstü sefer sayısı). Gerçek Dentur kotası. */
  seatsByDate: Record<string, number>
  /** Gün (YYYY-MM-DD) → o günün en ucuz yetişkin tek-yön fiyatı (min fares.oneWay,
   *  EUR). Fiyatlı şerit altyapısı — UI'da showPrice flag'i ile gizlenir, şimdilik
   *  render EDİLMEZ. Yetişkin tarifesi olmayan/0 sefer atlanır. */
  minPriceByDate: Record<string, number>
}

/**
 * Sefer-availability takvimi (Adım 2). provider.getRouteSchedule (Dentur
 * TripsByRoute, dateless, 5-dk cache) → gün→sayı indirgemesi + sezon ufku
 * tümleyeni. SALT GÖRÜNTÜ: searchParams/pricing/reserve'e DOKUNMAZ; yalnız
 * DateRangeField'ı kısıtlar. Bilinmeyen rota → boş availability (tüm günler
 * açık; kullanıcı yine arar, nearest-fallback devrede).
 */
export async function getRouteScheduleAction(
  from: string,
  to: string,
): Promise<RouteAvailability> {
  const provider = await getFerryProvider()
  let schedule: FerryTrip[]
  try {
    schedule = await provider.getRouteSchedule(slug(from), slug(to))
  } catch (e) {
    if (isUnknownRouteError(e)) return { disabledDates: [], countByDate: {}, seatsByDate: {}, minPriceByDate: {} }
    throw e
  }

  // Tek geçiş: gün → sefer sayısı + kalan koltuk toplamı + en ucuz yetişkin tek-yön fiyatı.
  const countByDate: Record<string, number> = {}
  const seatsByDate: Record<string, number> = {}
  const minPriceByDate: Record<string, number> = {}
  for (const t of schedule) {
    const d = t.date.slice(0, 10)
    countByDate[d] = (countByDate[d] ?? 0) + 1
    seatsByDate[d] = (seatsByDate[d] ?? 0) + (t.passengerSeatsAvailable ?? 0)
    const adult = t.fares.find((f) => f.passengerType === 'adult')
    if (adult && adult.oneWay > 0) {
      minPriceByDate[d] = d in minPriceByDate ? Math.min(minPriceByDate[d], adult.oneWay) : adult.oneWay
    }
  }

  const sailing = Object.keys(countByDate).sort()
  if (sailing.length === 0) return { disabledDates: [], countByDate, seatsByDate, minPriceByDate }

  // Sezon ufku = min–max sefer-günü. Aralıktaki sefersiz günler = tümleyen → kapalı.
  // Ufuk dışı (max sonrası) günler set'te değil → takvimde açık kalır (round-trip MVP
  // kararı + nearest-fallback sefersiz güne aramayı zaten yakalar).
  const disabledDates: string[] = []
  for (let d = sailing[0]; d <= sailing[sailing.length - 1]; d = addDaysISO(d, 1)) {
    if (!(d in countByDate)) disabledDates.push(d)
  }
  return { disabledDates, countByDate, seatsByDate, minPriceByDate }
}
