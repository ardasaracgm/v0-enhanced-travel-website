/**
 * Trip Item Registry — single source for bookable item types
 * ==========================================================
 * One object keyed by BookableItemType. Each descriptor carries, in ONE place:
 *   - clientSchema: the Zod variant for the client submit shape
 *   - resolve:      the pure server price/title/metadata transform
 *
 * Consumers look types up here instead of hard-coding if/else chains:
 *   - submit-booking builds its discriminatedUnion from `submitItemSchema`
 *     (derived from the descriptors — no hand-maintained list)
 *   - submit-booking's resolve loop calls TRIP_ITEM_REGISTRY[type].resolve
 *
 * `satisfies Record<BookableItemType, TripItemDescriptor>` gives compile-time
 * exhaustiveness (every bookable type needs an entry) WITHOUT widening each
 * descriptor's precise schema/ctx types — so the parsed item union stays
 * precisely typed downstream.
 *
 * Do NOT enable a planned type (insurance/esim/…) here — that is Kademe B+.
 */

import { z } from 'zod'
import type {
  BookableItemType,
  TripItemDescriptor,
  FerryResolveCtx,
  CarResolveCtx,
  LuggageResolveCtx,
} from './types'
import {
  resolveFerryItem,
  resolveCarRentalItem,
  resolveLuggageItem,
} from './resolvers'

// date >= today in Greece timezone prevents bookings for past departures.
// (moved verbatim from submit-booking with the ferry schema.)
function isDateInFuture(date: string): boolean {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })
  return date >= today
}

// ============================================================
// Client submit schemas — verbatim from submit-booking (L7)
// ============================================================

const ferrySchema = z.object({
  type:    z.literal('ferry'),
  leg:     z.enum(['outbound', 'return']),
  ferryId: z.string().min(1),
  date:    z.string().refine(isDateInFuture, { message: 'Ferry date must be in the future' }),
})

const carSchema = z.object({
  type:      z.literal('car_rental'),
  carId:     z.string().min(1),
  days:      z.number().int().positive().max(90),
  pickupAt:  z.string().optional(),
  dropoffAt: z.string().optional(),
})

// Luggage drop-off. Client sends only the selection (per-size counts/dates/
// location); the price is computed server-side by the resolver — never trusted
// from the client. Dates are shape-checked here; calendar/order validity is
// enforced by calculateLuggageTotalCents inside resolveLuggageItem.
const luggageCountField = z.number().int().min(0).max(5)
const luggageSchema = z.object({
  type:        z.literal('luggage'),
  counts: z
    .object({ small: luggageCountField, medium: luggageCountField, large: luggageCountField })
    .refine((c) => c.small + c.medium + c.large >= 1, {
      message: 'At least one luggage piece required',
    }),
  dropOffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dropOffDate must be YYYY-MM-DD'),
  pickupDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'pickupDate must be YYYY-MM-DD'),
  location:    z.string().min(1).max(64),
})

// ============================================================
// Descriptors — `satisfies` preserves each precise schema/ctx type
// ============================================================

const ferryDescriptor = {
  type: 'ferry',
  enabled: true,
  clientSchema: ferrySchema,
  resolve: resolveFerryItem,
} satisfies TripItemDescriptor<FerryResolveCtx, typeof ferrySchema>

const carRentalDescriptor = {
  type: 'car_rental',
  enabled: true,
  clientSchema: carSchema,
  resolve: resolveCarRentalItem,
} satisfies TripItemDescriptor<CarResolveCtx, typeof carSchema>

const luggageDescriptor = {
  type: 'luggage',
  enabled: true,
  clientSchema: luggageSchema,
  resolve: resolveLuggageItem,
} satisfies TripItemDescriptor<LuggageResolveCtx, typeof luggageSchema>

/**
 * The registry. `satisfies Record<BookableItemType, …>` = compile-time
 * exhaustiveness; a new BookableItemType without an entry will not type-check.
 */
export const TRIP_ITEM_REGISTRY = {
  ferry: ferryDescriptor,
  car_rental: carRentalDescriptor,
  luggage: luggageDescriptor,
} satisfies Record<BookableItemType, TripItemDescriptor>

export function getTripItemDescriptor(
  type: BookableItemType,
): TripItemDescriptor {
  return TRIP_ITEM_REGISTRY[type]
}

// ============================================================
// submitItemSchema — discriminatedUnion derived from the registry
// ============================================================
// No hand-maintained list: the members come from the descriptors. The cast
// asserts a non-empty tuple (the registry always has ≥1 entry); element types
// stay precise (ferry|car|luggage) so the parsed union is precisely typed.
const itemSchemas = Object.values(TRIP_ITEM_REGISTRY).map((d) => d.clientSchema)
type ItemSchema = (typeof itemSchemas)[number]

export const submitItemSchema = z.discriminatedUnion(
  'type',
  itemSchemas as [ItemSchema, ...ItemSchema[]],
)
