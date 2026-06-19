/**
 * Provider-agnostic ferry domain model + adapter contract.
 *
 * Both MockFerryProvider (lib/ferry/mock-provider) and DenturFerryProvider
 * (Mira Ticket API @ api.denturonline.com, added in step 2) implement
 * FerryProvider. Consumers depend ONLY on these types — never on a provider's
 * wire shape. Dentur field names are recorded inline as the mapping spec.
 *
 * No 'server-only' here on purpose: these are types + a pure interface, and the
 * mock adapter is isomorphic, so client components (the results page) can import
 * them. Only the real Dentur adapter (fetch + bearer token) is server-only.
 */
import type { PassengerType } from '@/lib/supabase'

export type FerryProviderId = 'mock' | 'dentur'

/** A port. Dentur search needs numeric IDs, not names → we carry both. */
export interface FerryPort {
  id: string              // canonical slug, e.g. 'bodrum'
  name: string            // display name
  providerId?: number     // Dentur departureRegionID / arrivalRegionID
  code?: string           // Dentur departureCode / arrivalCode
}

/** Per-passenger-type fare. Mock collapses to a single 'adult' row. */
export interface FerryFare {
  passengerType: PassengerType        // 'adult' | 'child' | 'infant'
  providerTypeId?: number             // Dentur passengerTypeID (replaces guessed DENTUR_TYPE_ID)
  oneWay: number                      // Dentur oneWaySalesAmount
  returnSameDay?: number              // Dentur returnSameDaySalesAmount
  returnDifferentDay?: number         // Dentur returnDifferentDaySalesAmount
  currency: string                    // Dentur salesCurrencyType, e.g. 'EUR'
}

/** One sailing (single leg). Canonical replacement for the flat FerryRoute. */
export interface FerryTrip {
  id: string                          // opaque canonical id: `${provider}:${expeditionID}`
  provider: FerryProviderId
  providerExpeditionId?: number       // Dentur expeditionID — required to reserve
  from: FerryPort                     // Dentur departure + departureID + departurePort
  to: FerryPort                       // Dentur arrivial + arrivialID + arrivialPort (sic)
  date: string                        // ISO date (local departure day)
  departureTime: string               // ISO datetime, or local HH:MM where a provider
  arrivalTime: string                 // only supplies clock time (mock). Normalized in Dentur adapter.
  durationMinutes: number             // Dentur duration (int minutes)
  operator: string                    // Dentur companyName
  vessel: string                      // Dentur ferryName
  passengerSeatsAvailable: number     // Dentur passengerRemainingQuota
  vehicleSeatsAvailable?: number      // Dentur vehicleRemainingQuota
  fares: FerryFare[]                  // Dentur passenger[] (ExpeditionPrice)
}

/**
 * Multi-leg journey — SKELETON ONLY (no implementation until Dentur single-leg
 * lands). FerryProvider stays strictly single-leg; connecting routes
 * (Ferryscanner-style "extra row") are composed ABOVE the provider by a
 * journey/itinerary layer that stitches FerryTrip legs and computes port
 * layovers. Shape lives here so callers can be designed against it without
 * premature abstraction.
 */
export interface FerryJourney {
  legs: FerryTrip[]                   // 1..n sailings, in travel order
  totalDurationMinutes: number        // sum(leg durations) + sum(layovers)
  layoverMinutes: number[]            // length = legs.length - 1; wait at each interchange port
}

// ---- Query / reservation contracts -------------------------------------

export interface FerrySearchQuery {
  from: string                        // canonical port id → mapped to departureID
  to: string                          // canonical port id → mapped to arrivalID
  date: string                        // ISO date
  pax?: { adults: number; children: number; infants: number }
}

export interface FerryReservationPassenger {
  firstName: string                   // Dentur firstName
  lastName: string                    // Dentur lastName
  passportNumber: string              // Dentur passportNumber
  gender: 'male' | 'female' | 'unspecified'  // Dentur gender (string; wire map TBD)
  passportExpiryDate?: string         // Dentur passportExpiryDate (nullable)
  dateOfBirth: string                 // Dentur dateOfBirth
  nationality: string                 // Dentur nationality
}

export interface FerryReservationRequest {
  outboundTripId: string              // → Dentur header.departureExpeditionID
  returnTripId?: string               // → Dentur header.arrivalExpeditionID
  openReturn?: boolean                // → Dentur header.openReturn (int 0/1)
  contact: { name: string; email: string; telephone: string }  // Dentur header.name/email/telephone
  poNumber: string                    // Dentur header.poNumber — our ferry order key (see order-key.ts)
  passengers: FerryReservationPassenger[]
}

export interface FerryReservationResult {
  ok: boolean
  errors?: string[]                   // Dentur Response.errors
  providerReservationId?: number      // Dentur reservationID
  providerReservationGuid?: string    // Dentur reservationGUID
  amount?: number                     // Dentur amount
  currency?: string                   // Dentur currencyType
  vouchers?: { pnr: number; direction: string; passengerName: string }[]  // Dentur voucherDetails[]
}

// ---- The adapter contract ----------------------------------------------

export interface FerryProvider {
  readonly id: FerryProviderId
  /** Port catalog (Dentur: DepartureRegion + ArrivalRegion, cached). */
  listPorts(): Promise<FerryPort[]>
  /** Search single-leg sailings (Dentur: TripSearch). */
  search(q: FerrySearchQuery): Promise<FerryTrip[]>
  /** Single sailing by canonical id — server-side price re-verification. */
  getTrip(id: string): Promise<FerryTrip | null>
  /** Create a reservation (Dentur: CreateReservation). */
  reserve(req: FerryReservationRequest): Promise<FerryReservationResult>
}
