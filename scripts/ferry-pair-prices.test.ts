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

// operator + from/to + fares are read (isReversePair needs canonical port ids).
const trip = (operator: string, from: string, to: string, fares: FerryFare[]): FerryTrip =>
  ({ operator, from: { id: from }, to: { id: to }, fares } as unknown as FerryTrip)

// --- one-way: each pax's own-type one-way fare; return null; pair false ---
const owTrip = trip('OP', 'bodrum', 'kos', [fare('adult', 25, 35, 40), fare('child', 20, 28, 32)])
eq('one-way 1 adult',        ferryPairPrices(owTrip, null, ['adult'], false),            { outbound: 25, return: null, pair: false })
eq('one-way adult+child sum', ferryPairPrices(owTrip, null, ['adult', 'child'], false),  { outbound: 45, return: null, pair: false })

// --- round-trip REVERSE PAIR (same operator + flipped route): single fare split ---
const rtOut = trip('OP', 'bodrum', 'kos', [fare('adult', 25, 35, 40)])
const rtRet = trip('OP', 'kos', 'bodrum', [fare('adult', 25, 35, 40)])
eq('rt same-day 35 → 17.50/17.50',  ferryPairPrices(rtOut, rtRet, ['adult'], true),  { outbound: 17.5, return: 17.5, pair: true })
eq('rt diff-day 40 → 20/20',        ferryPairPrices(rtOut, rtRet, ['adult'], false), { outbound: 20, return: 20, pair: true })

// odd cent → outbound (locks the rounding direction, money-path parity)
const oddOut = trip('OP', 'bodrum', 'kos', [fare('adult', 17.51, 17.51, 17.51)])
const oddRet = trip('OP', 'kos', 'bodrum', [fare('adult', 17.51, 17.51, 17.51)])
eq('rt odd cent 17.51 → 8.76/8.75', ferryPairPrices(oddOut, oddRet, ['adult'], true), { outbound: 8.76, return: 8.75, pair: true })

// mock fallback: no returnSameDay/DifferentDay → ferryRoundTripTotal = 2×oneWay
const mockOut = trip('OP', 'bodrum', 'kos', [fare('adult', 25)])
const mockRet = trip('OP', 'kos', 'bodrum', [fare('adult', 25)])
eq('rt mock fallback 2×25 → 25/25', ferryPairPrices(mockOut, mockRet, ['adult'], true), { outbound: 25, return: 25, pair: true })

// --- DIFFERENT operators (reverse route but operator gate) → no discount, pair FALSE ---
const opA = trip('OP-A', 'bodrum', 'kos', [fare('adult', 25, 35, 40)]) // would be 35 if it were a pair
const opB = trip('OP-B', 'kos', 'bodrum', [fare('adult', 30, 38, 44)])
eq('diff-operator → two one-ways, no discount', ferryPairPrices(opA, opB, ['adult'], true),
   { outbound: 25, return: 30, pair: false })

// --- OPEN-JAW: same operator, return is NOT the reverse route (Kos→Turgutreis) ---
// The €10 discount bug: operator-only logic priced this as a 40 round-trip; the fix
// treats it as two independent one-ways (25+25=50), pair=false → no round_trip_pair
// tag → consistent with groupFerryLegs booking two separate reservations.
const ojOut = trip('OP', 'bodrum', 'kos', [fare('adult', 25, 35, 40)])
const ojRet = trip('OP', 'kos', 'turgutreis', [fare('adult', 25, 35, 40)])
eq('open-jaw same-operator diff-arrival → 25/25, no discount, pair=false',
   ferryPairPrices(ojOut, ojRet, ['adult'], true), { outbound: 25, return: 25, pair: false })

console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED')
process.exit(failures ? 1 : 0)
