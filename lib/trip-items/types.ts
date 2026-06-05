/**
 * Trip Item Registry — shared types (single source)
 * =================================================
 * One place that declares, per bookable item type:
 *   - the CLIENT submit shape (IDs/params only — never prices)
 *   - the resolve context the server gathers before pricing
 *   - the resolved trip item the registry produces
 *
 * Every layer (submit-booking Zod, server price resolve, create-trip
 * passthrough, summary render) reads from the registry built on these
 * types, so adding a new service type touches ONE descriptor — not 6
 * scattered call sites. See lib/trip-items/registry.ts.
 *
 * Refactor stage (refactor/trip-item-architecture): types + skeleton.
 * Per-type resolve bodies are migrated one at a time, each verified
 * against a pre-refactor snapshot. Until migrated, resolve() throws.
 */

import type { AnyZodObject } from 'zod'
import type { TripItemType, TripItemMetadata } from '@/lib/supabase'
import type { LuggageCounts } from '@/lib/luggage-rates'
import type { FerryRoute } from '@/lib/ferry-mock-data'

// ============================================================
// Bookable vs. planned types
// ============================================================
// BookableItemType — can be added to the CLIENT ferry-booking cart today.
// Strict subset of the DB-level TripItemType (which also has visa,
// package_pickup, etc. created through OTHER flows). The registry's
// Record<BookableItemType, …> forces an entry for each, so a new value
// here is a COMPILE error until its descriptor exists.
export type BookableItemType = 'ferry' | 'car_rental' | 'luggage'

// Future doors — declared, intentionally NOT bookable yet. Adding one to
// BookableItemType above + a descriptor is the whole "enable" step.
// Insurance (Kademe A), e-SIM, VIP transfer, etc. live here as placeholders.
export type PlannedItemType =
  | 'insurance'
  | 'esim'
  | 'transfer'
  | 'tour'
  | 'hotel'
  | 'package_pickup'
  | 'visa'
  | 'custom'

export const PLANNED_ITEM_TYPES: readonly PlannedItemType[] = [
  'insurance',
  'esim',
  'transfer',
  'tour',
  'hotel',
  'package_pickup',
  'visa',
  'custom',
]

// ============================================================
// Client submit shapes — IDs/params only (server resolves prices)
// ============================================================
// These mirror what the browser sends to submitBooking. Defined HERE so
// submit-booking imports them from the single source instead of redefining.

export interface FerrySubmitItem {
  type: 'ferry'
  leg: 'outbound' | 'return'
  ferryId: string
  date: string // YYYY-MM-DD
}

export interface CarSubmitItem {
  type: 'car_rental'
  carId: string
  days: number
  pickupAt?: string
  dropoffAt?: string
}

export interface LuggageSubmitItem {
  type: 'luggage'
  counts: LuggageCounts
  dropOffDate: string // YYYY-MM-DD
  pickupDate: string // YYYY-MM-DD
  location: string
}

export type SubmitItem = FerrySubmitItem | CarSubmitItem | LuggageSubmitItem

// ============================================================
// Resolve contexts — what the server gathers before pricing
// ============================================================
// I/O (mock ferry lookup, cars-table fetch, authorizedDays computation)
// stays at the call site; descriptors receive an ALREADY-RESOLVED context
// so resolve() is a PURE function — snapshot-testable without DB/network.

export interface FerryResolveCtx {
  item: FerrySubmitItem
  /** Resolved schedule (getFerryById stays at the call site — I/O upstream). */
  ferry: FerryRoute
  passengerCount: number
}

/** Minimal car row the price resolver needs (from the cars table). */
export interface CarPriceRow {
  id: string
  brand?: string | null
  model?: string | null
  price_per_day: number | string | null
}

export interface CarResolveCtx {
  item: CarSubmitItem
  car: CarPriceRow
  /** Server-authorized rental days (recomputed from ferry legs upstream). */
  authorizedDays: number
  passengerCount: number
}

export interface LuggageResolveCtx {
  item: LuggageSubmitItem
}

export type ResolveCtx = FerryResolveCtx | CarResolveCtx | LuggageResolveCtx

// ============================================================
// Resolved trip item — the registry's output contract
// ============================================================
// Structurally identical to one element of CreateTripInput['items'], so
// create-trip stays generic (item_type/metadata passthrough, unchanged).
// priceAmount is EUR decimal — matches the existing createTrip contract.

export interface ResolvedTripItem {
  type: TripItemType
  title: string
  scheduledAt: string | null
  endsAt: string | null
  passengerCount: number
  priceAmount: number // EUR decimal (authoritative, server-computed)
  priceCurrency: string
  metadata: TripItemMetadata | Record<string, unknown>
}

// ============================================================
// Descriptor — one per bookable type
// ============================================================

export interface TripItemDescriptor<
  Ctx extends ResolveCtx = ResolveCtx,
  Schema extends AnyZodObject = AnyZodObject,
> {
  type: BookableItemType
  /** False = door declared but not wired into the live cart yet. */
  enabled: boolean
  /**
   * Zod variant for the client submit shape. MUST be a ZodObject with a
   * `type` literal discriminator — submit-booking's discriminatedUnion is
   * built from these (lib/trip-items/registry.ts → submitItemSchema).
   */
  clientSchema: Schema
  /** PURE: resolved context → trip item. Authoritative price lives here. */
  resolve(ctx: Ctx): ResolvedTripItem
}

// ============================================================
// Exhaustiveness guard
// ============================================================
// Use in switch defaults so an unhandled type fails at COMPILE time
// (x: never) and, if it ever slips through, at RUNTIME (throw). This is
// what replaces the silent "unknown = luggage" fall-through.
export function assertNever(x: never, context = 'trip item type'): never {
  throw new Error(`Unhandled ${context}: ${JSON.stringify(x)}`)
}
