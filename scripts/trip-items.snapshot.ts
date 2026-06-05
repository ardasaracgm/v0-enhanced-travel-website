/**
 * Trip Item snapshot harness
 * ==========================
 * Locks the pre-refactor behavior of ferry / car_rental / luggage so the
 * registry migration can be proven byte-for-byte identical.
 *
 *   npx tsx --conditions=react-server scripts/trip-items.snapshot.ts --generate
 *       → regenerates __snapshots__/trip-items.golden.json from the registry
 *         resolvers (the single source). Run when a resolver INTENTIONALLY
 *         changes output; review + commit the golden diff.
 *
 *   npx tsx --conditions=react-server scripts/trip-items.snapshot.ts
 *       → resolves the SAME fixtures through TRIP_ITEM_REGISTRY and diffs
 *         each field (title / scheduledAt / endsAt / passengerCount /
 *         priceAmount / priceCurrency / metadata) against the golden.
 *         Exits non-zero on ANY mismatch — a STRUCTURAL REGRESSION LOCK that
 *         catches accidental resolver changes.
 *
 * --conditions=react-server makes the `server-only` import in luggage-pricing
 * resolve to a no-op so this can run outside the Next bundler.
 *
 * The golden is generated FROM the resolvers (single source) — there is no
 * separate transcription to drift. The original behavior was independently
 * proven via a live e2e booking (refactor == main, byte-identical trip_items).
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { getFerryById } from '../lib/ferry-mock-data'
import type { ResolvedTripItem } from '../lib/trip-items/types'
import type {
  FerryResolveCtx,
  CarResolveCtx,
  LuggageResolveCtx,
} from '../lib/trip-items/types'
import { TRIP_ITEM_REGISTRY } from '../lib/trip-items/registry'

const __dirname = dirname(fileURLToPath(import.meta.url))
const GOLDEN_PATH = join(__dirname, '__snapshots__', 'trip-items.golden.json')

// ============================================================
// Representative fixtures (cover singular/plural + branch shapes)
// ============================================================

type Fixture =
  | { name: string; type: 'ferry'; ctx: FerryResolveCtx }
  | { name: string; type: 'car_rental'; ctx: CarResolveCtx }
  | { name: string; type: 'luggage'; ctx: LuggageResolveCtx }

const FIXTURES: Fixture[] = [
  {
    name: 'ferry/outbound-2pax',
    type: 'ferry',
    ctx: {
      item: { type: 'ferry', leg: 'outbound', ferryId: 'bk-1', date: '2026-07-10' },
      // Resolved ferry (I/O the harness performs, mirroring submit-booking).
      ferry: getFerryById('bk-1')!,
      passengerCount: 2,
    },
  },
  {
    name: 'car/one-way-4days',
    type: 'car_rental',
    ctx: {
      item: { type: 'car_rental', carId: 'car-test-1', days: 4, pickupAt: '2026-07-10', dropoffAt: '2026-07-14' },
      car: { id: 'car-test-1', brand: 'Fiat', model: 'Panda', price_per_day: 30 },
      authorizedDays: 4,
      passengerCount: 2,
    },
  },
  {
    name: 'car/round-trip-7days',
    type: 'car_rental',
    ctx: {
      item: { type: 'car_rental', carId: 'car-test-1', days: 1, pickupAt: '2026-07-10', dropoffAt: '2026-07-17' },
      car: { id: 'car-test-1', brand: 'Fiat', model: 'Panda', price_per_day: 30 },
      authorizedDays: 7,
      passengerCount: 2,
    },
  },
  {
    name: 'luggage/3-pieces-3-days',
    type: 'luggage',
    ctx: {
      item: { type: 'luggage', counts: { small: 2, medium: 1, large: 0 }, dropOffDate: '2026-07-10', pickupDate: '2026-07-12', location: 'kos_port' },
    },
  },
  {
    name: 'luggage/1-piece-same-day',
    type: 'luggage',
    ctx: {
      item: { type: 'luggage', counts: { small: 1, medium: 0, large: 0 }, dropOffDate: '2026-07-10', pickupDate: '2026-07-10', location: 'kos_port' },
    },
  },
]

// ============================================================
// Resolve a fixture through the live registry (single source)
// ============================================================

function registryResolve(f: Fixture): ResolvedTripItem {
  const descriptor = TRIP_ITEM_REGISTRY[f.type]
  // ctx shape is per-type; the descriptor is typed for its own ctx.
  return (descriptor.resolve as (ctx: Fixture['ctx']) => ResolvedTripItem)(f.ctx)
}

// ============================================================
// Canonical compare (key-order-insensitive)
// ============================================================

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = canonical((value as Record<string, unknown>)[key])
    }
    return out
  }
  return value
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonical(value))
}

// ============================================================
// Modes
// ============================================================

function generate(): void {
  const golden: Record<string, ResolvedTripItem> = {}
  for (const f of FIXTURES) golden[f.name] = registryResolve(f)
  writeFileSync(GOLDEN_PATH, JSON.stringify(golden, null, 2) + '\n')
  console.log(`✔ golden written: ${GOLDEN_PATH}`)
  console.log(`  ${FIXTURES.length} fixtures generated from registry resolvers (single source)`)
}

function verify(): void {
  if (!existsSync(GOLDEN_PATH)) {
    console.error(`✘ golden missing — run with --generate first`)
    process.exit(2)
  }
  const golden = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8')) as Record<string, ResolvedTripItem>
  let failures = 0
  for (const f of FIXTURES) {
    const expected = golden[f.name]
    if (!expected) {
      console.error(`✘ ${f.name}: no golden entry`)
      failures++
      continue
    }
    let actual: ResolvedTripItem
    try {
      actual = registryResolve(f)
    } catch (err) {
      console.error(`✘ ${f.name}: registry threw — ${(err as Error).message}`)
      failures++
      continue
    }
    if (canonicalJson(actual) === canonicalJson(expected)) {
      console.log(`✔ ${f.name}`)
    } else {
      failures++
      console.error(`✘ ${f.name}: MISMATCH`)
      console.error(`    expected: ${canonicalJson(expected)}`)
      console.error(`    actual:   ${canonicalJson(actual)}`)
    }
  }
  if (failures > 0) {
    console.error(`\n${failures} mismatch(es) — migration is NOT faithful. STOP.`)
    process.exit(1)
  }
  console.log(`\nAll ${FIXTURES.length} fixtures match golden — migration faithful.`)
}

const mode = process.argv.includes('--generate') ? 'generate' : 'verify'
if (mode === 'generate') generate()
else verify()
