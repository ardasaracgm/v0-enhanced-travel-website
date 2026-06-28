import 'server-only'
import type { PassengerType } from '@/lib/supabase'
import type {
  FerryProvider, FerryTrip, FerryPort, FerryFare,
  FerrySearchQuery, FerryReservationRequest, FerryReservationResult,
} from './provider'
import { slug } from './util'
import { DenturError } from './dentur-error'

const BASE = process.env.DENTUR_API_BASE
const TOKEN = process.env.DENTUR_API_TOKEN
const TIMEOUT_MS = 15_000
const ROUTE_SCHEDULE_TTL_MS = 5 * 60_000

/** POST helper: bearer auth, JSON, timeout, meaningful errors (insurance adapter pattern). */
async function denturPost<T>(path: string, body?: unknown): Promise<T> {
  if (!BASE || !TOKEN) {
    throw new DenturError('dentur_env_missing: DENTUR_API_BASE / DENTUR_API_TOKEN not set', 'config')
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      // Raw token in Authorization — NOT `Bearer <token>`. The swagger describes
      // it as "Bearer token" but the live API returns 401 for a Bearer prefix and
      // accepts the bare key (verified against the real API).
      headers: { Authorization: TOKEN as string, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
      cache: 'no-store',
    })
    if (!res.ok) throw new DenturError(`dentur_http_${res.status} on ${path}`, 'http', res.status)
    return (await res.json()) as T
  } catch (e) {
    if (e instanceof DenturError) throw e
    // The AbortController we own fired ⇒ TIMEOUT (request may have landed → NOT
    // retryable). Otherwise a pre-connection NETWORK failure (never landed → retryable).
    const kind = ctrl.signal.aborted || (e as Error)?.name === 'AbortError' ? 'timeout' : 'network'
    throw new DenturError(`dentur_fetch_failed on ${path}: ${(e as Error).message}`, kind)
  } finally {
    clearTimeout(timer)
  }
}

// ---- wire types (only the fields we read) ------------------------------
interface WireDeparture { departureRegionID: number; departureRegionName: string; departureCode: string }
interface WireArrival   { arrivalRegionID: number;   arrivalRegionName: string;   arrivalCode: string }
interface WireFare {
  passengerTypeID: number; oneWaySalesAmount: number
  returnSameDaySalesAmount: number; returnDifferentDaySalesAmount: number; salesCurrencyType: string
}
interface WireExpedition {
  expeditionID: number; companyName: string; ferryName: string
  departureDate: string; departureTime: string; arrivalTime: string; duration: number
  departureID: number; arrivialID: number              // arrivial* = Dentur typo (sic)
  departure: string; arrivial: string; departurePort: string; arrivialPort: string
  passengerRemainingQuota: number; vehicleRemainingQuota: number
  passenger: WireFare[] | null
}
interface WireExpeditionResponse { trips: WireExpedition[] | null }
interface WireVoucherDetail {
  pnr: number; ticketDirection: string | null; firstName: string | null; lastName: string | null
  // Per-voucher (= per-passenger-per-leg) fields for the post-reserve split.
  // tripID == expeditionID (TripInfo's key; matches our meta.ferry_id) — NOT ferryId
  // (that field is the vessel id). amount = this voucher's own fare (EUR decimal).
  // Names/casing confirmed against the live swagger VoucherDetail schema.
  amount: number; tripID: number
}
interface WireReservationResponse {
  errors: string[] | null; reservationID: number; reservationGUID: string | null
  amount: number; currencyType: string | null; voucherDetails: WireVoucherDetail[] | null
}

// Verified against live API: passengerTypeID 1=Yetişkin, 2=Çocuk, 3=Bebek.
function mapPassengerType(id: number): PassengerType {
  return id === 3 ? 'infant' : id === 2 ? 'child' : 'adult'
}

/**
 * Normalize a Dentur clock string to "HH:MM". Live API returns "HH:MM:SS"
 * (e.g. "09:15:00") while the rest of the app (combineDateAndTime, display,
 * mock parity) expects "HH:MM". Regex-based — tolerant of single-digit hours
 * ("9:15") and missing seconds; leaves anything unrecognized untouched so a
 * format drift surfaces loudly rather than corrupting silently.
 */
function normalizeTime(t: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim())
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : t
}

/**
 * Operatör adı görüntü-normalizasyonu. Dentur tüzel adı "DENTUR AVRASYA" döndürür;
 * UI kısa markayı "DENTUR" gösterir. YALNIZ bu operatör kısaltılır — IDO ve diğer
 * her companyName olduğu gibi geçer (başka firmayı yeniden adlandırma). Boşluk/
 * casing duyarsız. Provider sınırında uygulandığı için round-trip'in HER İKİ bacağı
 * da aynı normalize olur → isReversePair'in operator-eşitlik anahtarı tutarlı kalır.
 */
function normalizeOperatorName(name: string): string {
  return /dentur\s*avrasya/i.test(name.trim()) ? 'DENTUR' : name
}

/** "2026-06-25T00:00:00" → "2026-06-25". Robust to a plain date or a datetime. */
function normalizeDate(d: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(d.trim())
  return m ? m[1] : d
}

/**
 * Reservation DateTime fields (dateOfBirth, passportExpiryDate) → full ISO
 * date-time. Dentur deserializes with System.Text.Json, which rejects a bare
 * "YYYY-MM-DD" for a C# DateTime ("could not be converted to System.DateTime")
 * — diagnosed from a live Step1 400. Append midnight (no offset, so a DOB is not
 * shifted a day by timezone) when only a date was supplied; leave a full
 * datetime untouched.
 */
function toDenturDateTime(d: string): string {
  const s = d.trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00` : s
}

function mapFare(f: WireFare): FerryFare {
  return {
    passengerType: mapPassengerType(f.passengerTypeID),
    providerTypeId: f.passengerTypeID,
    oneWay: f.oneWaySalesAmount,
    returnSameDay: f.returnSameDaySalesAmount,
    returnDifferentDay: f.returnDifferentDaySalesAmount,
    currency: f.salesCurrencyType,
  }
}

function mapExpedition(e: WireExpedition): FerryTrip {
  return {
    id: `dentur:${e.expeditionID}`,
    provider: 'dentur',
    providerExpeditionId: e.expeditionID,
    from: { id: slug(e.departure), name: e.departure, providerId: e.departureID, code: e.departurePort },
    to:   { id: slug(e.arrivial),  name: e.arrivial,  providerId: e.arrivialID, code: e.arrivialPort }, // sic
    date: normalizeDate(e.departureDate),
    departureTime: normalizeTime(e.departureTime),  // "09:15:00" → "09:15" (mock parity)
    arrivalTime: normalizeTime(e.arrivalTime),
    durationMinutes: e.duration,      // verified minutes (45 = 09:15→10:00)
    operator: normalizeOperatorName(e.companyName),
    vessel: e.ferryName,
    passengerSeatsAvailable: e.passengerRemainingQuota,
    vehicleSeatsAvailable: e.vehicleRemainingQuota,
    fares: (e.passenger ?? []).map(mapFare),
  }
}

// ---- port resolution caches (departures flat; arrivals per-departure) --
let departuresCache: FerryPort[] | null = null
const arrivalsCache = new Map<number, FerryPort[]>()
const scheduleCache = new Map<string, { at: number; trips: FerryTrip[] }>()  // key `${depID}:${arrID}`

async function getDepartures(): Promise<FerryPort[]> {
  if (departuresCache) return departuresCache
  const rows = await denturPost<WireDeparture[]>('/api/ticket/DepartureRegion')
  departuresCache = rows.map((r) => ({
    id: slug(r.departureRegionName), name: r.departureRegionName,
    providerId: r.departureRegionID, code: r.departureCode,
  }))
  return departuresCache
}

async function getArrivals(departureRegionID: number): Promise<FerryPort[]> {
  const hit = arrivalsCache.get(departureRegionID)
  if (hit) return hit
  const rows = await denturPost<WireArrival[]>('/api/ticket/ArrivalRegion', { departureRegionID })
  const ports = rows.map((r) => ({
    id: slug(r.arrivalRegionName), name: r.arrivalRegionName,
    providerId: r.arrivalRegionID, code: r.arrivalCode,
  }))
  arrivalsCache.set(departureRegionID, ports)
  return ports
}

async function resolveDeparture(fromSlug: string): Promise<FerryPort> {
  const d = (await getDepartures()).find((p) => p.id === fromSlug)
  if (!d?.providerId) throw new DenturError(`dentur_unknown_departure: ${fromSlug}`)
  return d
}
async function resolveArrival(departureRegionID: number, toSlug: string): Promise<FerryPort> {
  const a = (await getArrivals(departureRegionID)).find((p) => p.id === toSlug)
  if (!a?.providerId) throw new DenturError(`dentur_unknown_arrival: ${toSlug}`)
  return a
}

export const DenturFerryProvider: FerryProvider = {
  id: 'dentur',

  // Departures only — arrivals are departure-scoped (req_arrival needs a
  // departureRegionID), resolved inside search().
  async listPorts(): Promise<FerryPort[]> {
    return getDepartures()
  },

  // Arrivals reachable from a departure slug. Reuses resolveDeparture (slug→
  // regionID) + getArrivals (arrivalsCache). Throws dentur_unknown_departure for
  // an off-catalog slug — the action catches it and returns [].
  async listArrivals(departureSlug: string): Promise<FerryPort[]> {
    const dep = await resolveDeparture(departureSlug)
    return getArrivals(dep.providerId!)
  },

  async search(q: FerrySearchQuery): Promise<FerryTrip[]> {
    const dep = await resolveDeparture(q.from)
    const arr = await resolveArrival(dep.providerId!, q.to)
    // TripSearch request uses correctly-spelled departureID/arrivalID; it takes
    // no pax (q.pax unused) — per-type prices come back in fares[].
    const res = await denturPost<WireExpeditionResponse>('/api/ticket/TripSearch', {
      departureID: dep.providerId, arrivalID: arr.providerId, date: q.date, language: 'tr',
    })
    return (res.trips ?? []).map(mapExpedition)
  },

  // Whole season (TripsByRoute, dateless), 5-min cache. resolveArrival throws
  // unknown_arrival when the route isn't offered → action maps it to route_not_offered.
  async getRouteSchedule(from: string, to: string): Promise<FerryTrip[]> {
    const dep = await resolveDeparture(from)
    const arr = await resolveArrival(dep.providerId!, to)
    const key = `${dep.providerId}:${arr.providerId}`
    const hit = scheduleCache.get(key)
    if (hit && Date.now() - hit.at < ROUTE_SCHEDULE_TTL_MS) return hit.trips
    const res = await denturPost<WireExpeditionResponse>('/api/ticket/TripsByRoute', {
      departureRegionID: dep.providerId, arrivalRegionID: arr.providerId, language: 'tr',
    })
    const trips = (res.trips ?? []).map(mapExpedition)
    scheduleCache.set(key, { at: Date.now(), trips })
    return trips
  },

  // TripInfo({ tripID }); UNVERIFIED: assumes tripID == expeditionID — confirm live.
  async getTrip(id: string): Promise<FerryTrip | null> {
    const tripID = Number(id.startsWith('dentur:') ? id.slice('dentur:'.length) : id)
    if (!Number.isFinite(tripID)) return null
    const res = await denturPost<WireExpeditionResponse>('/api/ticket/TripInfo', { tripID, language: 'tr' })
    const e = res.trips?.[0]
    return e ? mapExpedition(e) : null
  },

  async reserve(req: FerryReservationRequest): Promise<FerryReservationResult> {
    const expId = (id: string) => Number(id.replace(/^dentur:/, ''))
    const header = {
      departureExpeditionID: expId(req.outboundTripId),
      // UNVERIFIED: one-way sends arrivalExpeditionID/openReturn = 0 — confirm live.
      arrivalExpeditionID: req.returnTripId ? expId(req.returnTripId) : 0,
      openReturn: req.openReturn ? 1 : 0,
      name: req.contact.name, email: req.contact.email, telephone: req.contact.telephone,
      poNumber: req.poNumber,
    }
    const passengers = req.passengers.map((p) => ({
      firstName: p.firstName, lastName: p.lastName, passportNumber: p.passportNumber,
      // Dentur wants "M"/"F" (swagger PassengerInfo: "M for Male, F for Female").
      // female → 'F'; male AND unspecified → 'M' (house rule: anything non-female → male).
      gender: p.gender === 'female' ? 'F' : 'M',
      passportExpiryDate: p.passportExpiryDate ? toDenturDateTime(p.passportExpiryDate) : null,
      dateOfBirth: toDenturDateTime(p.dateOfBirth), nationality: p.nationality,
    }))
    const res = await denturPost<WireReservationResponse>('/api/ticket/CreateReservation', { header, passengers })
    const ok = !res.errors || res.errors.length === 0
    return {
      ok,
      errors: res.errors ?? undefined,
      providerReservationId: res.reservationID,
      providerReservationGuid: res.reservationGUID ?? undefined,
      amount: res.amount,
      currency: res.currencyType ?? undefined,
      vouchers: (res.voucherDetails ?? []).map((v) => ({
        pnr: v.pnr,
        direction: v.ticketDirection ?? '',
        passengerName: `${v.firstName ?? ''} ${v.lastName ?? ''}`.trim(),
        amount: v.amount,
        expeditionId: v.tripID, // tripID == expeditionID (NOT ferryId/vessel)
      })),
    }
  },
}
