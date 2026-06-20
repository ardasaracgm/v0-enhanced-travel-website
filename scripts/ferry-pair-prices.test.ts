/**
 * Pure unit test for ferryPairPrices (lib/ferry/display.ts) — no I/O, no
 * server-only. This is THE single split shared by the client cart reprice
 * (booking-context) and the server money-path (submit-booking §2b), so locking
 * it here proves both call paths produce identical, charge-accurate amounts.
 * Covers: one-way per-type sum, round-trip same-operator integer-cent split
 * (even + odd cent → outbound), mock fallback (2×oneWay), and the forward-compat
 * DIFFERENT-operator branch (no discount, pair=false → no round_trip_pair tag).
 * Run: npx tsx scripts/ferry-pair-prices.test.ts   (exit 1 on any failure)
 */
import { ferryPairPrices } from '../lib/ferry/display'
import type { FerryTrip, FerryFare } from '../lib/ferry/provider'
import type { PassengerType } from '../lib/supabase'

let failures = 0
function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want)
  if (g === w) console.log(`✔ ${name}`)
  else { failures++; console.error(`✘ ${name}\n   got:  ${g}\n   want: ${w}`) }
}

const fare = (
  passengerType: PassengerType, oneWay: number,
  returnSameDay?: number, returnDifferentDay?: number,
): FerryFare => ({ passengerType, oneWay, returnSameDay, returnDifferentDay, currency: 'EUR' })

// Only operator + fares are read by ferryPairPrices; cast a minimal shape.
const trip = (operator: string, fares: FerryFare[]): FerryTrip =>
  ({ operator, fares } as unknown as FerryTrip)

// --- one-way: each pax's own-type one-way fare; return null; pair false ---
const owTrip = trip('OP', [fare('adult', 25, 35, 40), fare('child', 20, 28, 32)])
eq('one-way 1 adult',        ferryPairPrices(owTrip, null, ['adult'], false),            { outbound: 25, return: null, pair: false })
eq('one-way adult+child sum', ferryPairPrices(owTrip, null, ['adult', 'child'], false),  { outbound: 45, return: null, pair: false })

// --- round-trip, SAME operator: single fare split in integer cents ---
const rtTrip = trip('OP', [fare('adult', 25, 35, 40)])
eq('rt same-day 35 → 17.50/17.50',  ferryPairPrices(rtTrip, rtTrip, ['adult'], true),  { outbound: 17.5, return: 17.5, pair: true })
eq('rt diff-day 40 → 20/20',        ferryPairPrices(rtTrip, rtTrip, ['adult'], false), { outbound: 20, return: 20, pair: true })

// odd cent → outbound (locks the rounding direction, money-path parity)
const oddTrip = trip('OP', [fare('adult', 17.51, 17.51, 17.51)])
eq('rt odd cent 17.51 → 8.76/8.75', ferryPairPrices(oddTrip, oddTrip, ['adult'], true), { outbound: 8.76, return: 8.75, pair: true })

// mock fallback: no returnSameDay/DifferentDay → ferryRoundTripTotal = 2×oneWay
const mockTrip = trip('OP', [fare('adult', 25)])
eq('rt mock fallback 2×25 → 25/25', ferryPairPrices(mockTrip, mockTrip, ['adult'], true), { outbound: 25, return: 25, pair: true })

// --- forward-compat: DIFFERENT operators → no round-trip discount, pair FALSE ---
const opA = trip('OP-A', [fare('adult', 25, 35, 40)]) // would be 35 if it were a pair
const opB = trip('OP-B', [fare('adult', 30, 38, 44)])
eq('diff-operator → two one-ways, no discount', ferryPairPrices(opA, opB, ['adult'], true),
   { outbound: 25, return: 30, pair: false })

console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED')
process.exit(failures ? 1 : 0)
