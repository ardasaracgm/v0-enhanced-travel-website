/**
 * Pure unit test for lib/ferry/reverse-pair.ts — no golden, no I/O, no
 * server-only. Locks the predicate that (in Commit 4) gates whether two legs
 * are ONE discounted Dentur round-trip reservation vs two independent one-ways.
 * Run: npx tsx scripts/reverse-pair.test.ts   (exit 1 on any failure)
 */
import { isReversePair } from '../lib/ferry/reverse-pair'
import type { FerryTrip } from '../lib/ferry/provider'

let failures = 0
function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want)
  if (g === w) console.log(`✔ ${name}`)
  else { failures++; console.error(`✘ ${name}\n   got:  ${g}\n   want: ${w}`) }
}

// Minimal FerryTrip fixture — only operator + from.id/to.id matter to the
// predicate; the rest is valid filler so the shape stays honest.
const trip = (operator: string, fromId: string, toId: string): FerryTrip => ({
  id: `test:${fromId}-${toId}`,
  provider: 'dentur',
  from: { id: fromId, name: fromId },
  to: { id: toId, name: toId },
  date: '2026-07-01',
  departureTime: '09:00',
  arrivalTime: '10:00',
  durationMinutes: 60,
  operator,
  vessel: 'TEST',
  passengerSeatsAvailable: 10,
  fares: [{ passengerType: 'adult', oneWay: 25, currency: 'EUR' }],
})

// 1. classic reverse, same operator → true
eq('classic Bodrum→Kos vs Kos→Bodrum (same op) → true',
  isReversePair(trip('DENTUR', 'bodrum', 'kos'), trip('DENTUR', 'kos', 'bodrum')), true)

// 2. open-jaw (return lands elsewhere) → false
eq('open-jaw Bodrum→Kos vs Kos→Leros → false',
  isReversePair(trip('DENTUR', 'bodrum', 'kos'), trip('DENTUR', 'kos', 'leros')), false)

// 3. reverse route but DIFFERENT operator → false (discount is one company's fare)
eq('different-operator reverse → false',
  isReversePair(trip('DENTUR', 'bodrum', 'kos'), trip('OTHER', 'kos', 'bodrum')), false)

// 4. unrelated legs → false
eq('unrelated Bodrum→Kos vs Leros→Kalymnos → false',
  isReversePair(trip('DENTUR', 'bodrum', 'kos'), trip('DENTUR', 'leros', 'kalymnos')), false)

// 5. unknown port (marmaris not in catalog → resolvePort null) → false (fail safe)
eq('unknown port marmaris → false',
  isReversePair(trip('DENTUR', 'bodrum', 'marmaris'), trip('DENTUR', 'marmaris', 'bodrum')), false)

// 6. exonym normalization: rodos (canonical) ⇄ rhodes (alias) → same Port → true
eq('exonym Bodrum→Rodos vs Rhodes→Bodrum → true',
  isReversePair(trip('DENTUR', 'bodrum', 'rodos'), trip('DENTUR', 'rhodes', 'bodrum')), true)

console.log(failures ? `\n${failures} FAIL` : `\nALL PASS`)
process.exit(failures ? 1 : 0)
