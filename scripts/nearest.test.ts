/**
 * Pure unit test for lib/ferry/nearest.ts — no golden, no I/O, no server-only.
 * Run: npx tsx scripts/nearest.test.ts   (exit 1 on any failure)
 */
import { nearestCandidateDates, NEAREST_WINDOW_DAYS } from '../lib/ferry/nearest'
import type { FerryTrip } from '../lib/ferry/provider'

let failures = 0
function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want)
  if (g === w) console.log(`✔ ${name}`)
  else { failures++; console.error(`✘ ${name}\n   got:  ${g}\n   want: ${w}`) }
}
const trip = (date: string, seats = 10): FerryTrip =>
  ({ date, passengerSeatsAvailable: seats } as unknown as FerryTrip)

const today = '2026-06-19'
const target = '2026-06-25'

eq('tie → forward first',
  nearestCandidateDates([trip('2026-06-23'), trip('2026-06-27')], target, today),
  ['2026-06-27', '2026-06-23'])           // both dist 2 → forward (27) first

eq('nearest ordering',
  nearestCandidateDates([trip('2026-06-28'), trip('2026-06-26'), trip('2026-06-23')], target, today),
  ['2026-06-26', '2026-06-23', '2026-06-28'])  // dist 1, 2, 3

eq('excludes target itself',
  nearestCandidateDates([trip(target), trip('2026-06-26')], target, today),
  ['2026-06-26'])

eq('excludes past (before today)',
  nearestCandidateDates([trip('2026-06-15'), trip('2026-06-26')], target, today),
  ['2026-06-26'])

eq('respects ±window',
  nearestCandidateDates([trip('2026-07-20'), trip('2026-06-26')], target, today),  // 07-20 = 25d > 14
  ['2026-06-26'])

eq('filters sold-out (seats 0)',
  nearestCandidateDates([trip('2026-06-26', 0), trip('2026-06-27', 3)], target, today),
  ['2026-06-27'])

eq('dedupes multiple sailings same day',
  nearestCandidateDates([trip('2026-06-26'), trip('2026-06-26')], target, today),
  ['2026-06-26'])

console.log(failures ? `\n${failures} FAIL` : `\nALL PASS (window=${NEAREST_WINDOW_DAYS})`)
process.exit(failures ? 1 : 0)
