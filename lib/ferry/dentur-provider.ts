import 'server-only'
import type { PassengerType } from '@/lib/supabase'
import type {
  FerryProvider, FerryTrip, FerryPort, FerryFare,
  FerrySearchQuery, FerryReservationRequest, FerryReservationResult,
} from './provider'

const BASE = process.env.DENTUR_API_BASE
const TOKEN = process.env.DENTUR_API_TOKEN
const TIMEOUT_MS = 15_000

class DenturError extends Error {}

/** POST helper: bearer auth, JSON, timeout, meaningful errors (insurance adapter pattern). */
async function denturPost<T>(path: string, body?: unknown): Promise<T> {
  if (!BASE || !TOKEN) {
    throw new DenturError('dentur_env_missing: DENTUR_API_BASE / DENTUR_API_TOKEN not set')
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
      cache: 'no-store',
    })
    if (!res.ok) throw new DenturError(`dentur_http_${res.status} on ${path}`)
    return (await res.json()) as T
  } catch (e) {
    if (e instanceof DenturError) throw e
    throw new DenturError(`dentur_fetch_failed on ${path}: ${(e as Error).message}`)
  } finally {
    clearTimeout(timer)
  }
}

const slug = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-')

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
interface WireVoucherDetail { pnr: number; ticketDirection: string | null; firstName: string | null; lastName: string | null }
interface WireReservationResponse {
  errors: string[] | null; reservationID: number; reservationGUID: string | null
  amount: number; currencyType: string | null; voucherDetails: WireVoucherDetail[] | null
}

// UNVERIFIED: passengerTypeID → canonical type is a best-guess. Replace once the
// PassengerType endpoint is wired (supersedes the guessed DENTUR_TYPE_ID).
function mapPassengerType(id: number): PassengerType {
  return id === 3 ? 'infant' : id === 2 ? 'child' : 'adult'
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
    date: e.departureDate,
    departureTime: e.departureTime,   // UNVERIFIED TZ: departureTime vs departureTimeTurkiye
    arrivalTime: e.arrivalTime,
    durationMinutes: e.duration,      // UNVERIFIED unit (assumed minutes)
    operator: e.companyName,
    vessel: e.ferryName,
    passengerSeatsAvailable: e.passengerRemainingQuota,
    vehicleSeatsAvailable: e.vehicleRemainingQuota,
    fares: (e.passenger ?? []).map(mapFare),
  }
}

// ---- port resolution caches (departures flat; arrivals per-departure) --
let departuresCache: FerryPort[] | null = null
const arrivalsCache = new Map<number, FerryPort[]>()

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
      gender: p.gender, passportExpiryDate: p.passportExpiryDate ?? null,
      dateOfBirth: p.dateOfBirth, nationality: p.nationality,
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
      })),
    }
  },
}
