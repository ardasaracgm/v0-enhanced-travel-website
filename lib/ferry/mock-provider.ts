/**
 * Behaviour-preserving adapter: wraps the existing in-memory mockFerries
 * (lib/ferry-mock-data) behind the FerryProvider contract. Consumers keep
 * getting the exact same sailings. The flat FerryRoute has no numeric ids,
 * no per-type fares and no vehicle quota → those map to undefined / a single
 * 'adult' fare row. Pure/isomorphic: safe to import from client or server.
 */
import {
  mockFerries,
  getFerriesForRoute,
  getFerryById,
  type FerryRoute,
} from '@/lib/ferry-mock-data'
import type {
  FerryProvider,
  FerryTrip,
  FerryPort,
  FerrySearchQuery,
  FerryReservationRequest,
  FerryReservationResult,
} from './provider'
import { todayAthensISO } from '@/lib/validation/dates'

function portOf(name: string): FerryPort {
  return { id: name.toLowerCase(), name }
}

function addDaysISO(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

// Trivial calendar: no sailings on Tuesdays (deterministic ~1/7 empty days) so the
// nearest-date fallback also triggers + is testable under mock. Kept deliberately simple.
function mockHasSailings(dateISO: string): boolean {
  return new Date(`${dateISO}T00:00:00Z`).getUTCDay() !== 2  // 2 = Tuesday
}

/** '1h 30m' | '40m' | '1h 00m' → minutes. */
function durationToMinutes(d: string): number {
  const h = /(\d+)\s*h/.exec(d)
  const m = /(\d+)\s*m/.exec(d)
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0)
}

function toTrip(r: FerryRoute): FerryTrip {
  return {
    id: `mock:${r.id}`,
    provider: 'mock',
    from: portOf(r.from),
    to: portOf(r.to),
    date: r.date,
    departureTime: r.departureTime,   // mock keeps HH:MM display strings
    arrivalTime: r.arrivalTime,
    durationMinutes: durationToMinutes(r.duration),
    operator: r.operator,
    vessel: r.vessel,
    passengerSeatsAvailable: r.availableSeats,
    fares: [{ passengerType: 'adult', oneWay: r.price, currency: 'EUR' }],
  }
}

export const MockFerryProvider: FerryProvider = {
  id: 'mock',

  async listPorts(): Promise<FerryPort[]> {
    // Mock has no port catalog endpoint; derive from the route table.
    const seen = new Map<string, FerryPort>()
    for (const r of mockFerries) {
      seen.set(r.from.toLowerCase(), portOf(r.from))
      seen.set(r.to.toLowerCase(), portOf(r.to))
    }
    return [...seen.values()]
  },

  // Arrivals for a departure slug — derived from the route table (mock has no
  // region ids; matches by lowercased name === slug, as search() does).
  async listArrivals(departureSlug: string): Promise<FerryPort[]> {
    const seen = new Map<string, FerryPort>()
    for (const r of mockFerries) {
      if (r.from.toLowerCase() === departureSlug) seen.set(r.to.toLowerCase(), portOf(r.to))
    }
    return [...seen.values()]
  },

  async search(q: FerrySearchQuery): Promise<FerryTrip[]> {
    // Blackout days (Tuesdays) return empty → exercises the nearest-date fallback.
    if (!mockHasSailings(q.date.slice(0, 10))) return []
    // Mock matches by name (case-insensitive); our canonical slug is the
    // lowercased name, so passing the slug through works unchanged.
    return getFerriesForRoute(q.from, q.to).map(toTrip)
  },

  async getRouteSchedule(from: string, to: string): Promise<FerryTrip[]> {
    // Stamp the route's fixed sailings onto the next 30 days from today (Athens),
    // skipping blackout (Tuesday) days — a season-with-gaps for the fallback.
    const base = getFerriesForRoute(from, to)
    const today = todayAthensISO()
    const out: FerryTrip[] = []
    for (let i = 0; i < 30; i++) {
      const date = addDaysISO(today, i)
      if (!mockHasSailings(date)) continue
      for (const r of base) out.push({ ...toTrip(r), date })
    }
    return out
  },

  async getTrip(id: string): Promise<FerryTrip | null> {
    const raw = id.startsWith('mock:') ? id.slice('mock:'.length) : id
    const r = getFerryById(raw)
    return r ? toTrip(r) : null
  },

  async reserve(_req: FerryReservationRequest): Promise<FerryReservationResult> {
    // The mock has no booking backend. Return a clean failure rather than a
    // synthetic PNR — fake live-looking trips/PNRs would leak into confirmation,
    // email and the Viva flow and become cleanup debt (cf. ZZ_TEST). Real
    // end-to-end reservation testing uses the Dentur adapter (step 2) with
    // USE_MOCK_FERRY off and a sandbox/test token.
    return { ok: false, errors: ['mock_no_reservation'] }
  },
}
