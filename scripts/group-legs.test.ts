/**
 * Pure unit test for lib/ferry/group-legs.ts — no golden, no I/O. Locks the
 * reservation-grouping decision (Commit 4b consumes it): classic round-trip →
 * ONE group (byte-identical to today), open-jaw / different-operator / plain
 * one-way → independent one-way groups. Run: npx tsx scripts/group-legs.test.ts
 */
import { groupFerryLegs, type GroupableLeg } from '../lib/ferry/group-legs'
import type { FerryItemMetadata } from '../lib/supabase'

let failures = 0
function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want)
  if (g === w) console.log(`✔ ${name}`)
  else { failures++; console.error(`✘ ${name}\n   got:  ${g}\n   want: ${w}`) }
}

const leg = (
  id: string,
  direction: 'outbound' | 'return' | undefined,
  operator: string | undefined,
  fromPort: string,
  toPort: string,
): GroupableLeg => ({
  id,
  meta: { from_port: fromPort, to_port: toPort, operator, direction,
    departure_time: '', arrival_time: '' } as FerryItemMetadata,
})

// project to a comparable shape (ids only)
const proj = (gs: ReturnType<typeof groupFerryLegs>) =>
  gs.map((g) => ({ kind: g.kind, anchor: g.anchor.id, legs: g.legs.map((l) => l.id) }))

// 1. classic round-trip → ONE round_trip group, outbound anchor, [out, ret]
eq('classic round-trip → 1 round_trip group',
  proj(groupFerryLegs([
    leg('OUT', 'outbound', 'DENTUR', 'bodrum', 'kos'),
    leg('RET', 'return', 'DENTUR', 'kos', 'bodrum'),
  ])),
  [{ kind: 'round_trip', anchor: 'OUT', legs: ['OUT', 'RET'] }])

// 2. open-jaw (return lands elsewhere) → TWO one_way groups
eq('open-jaw → 2 one_way groups',
  proj(groupFerryLegs([
    leg('OUT', 'outbound', 'DENTUR', 'bodrum', 'kos'),
    leg('RET', 'return', 'DENTUR', 'kos', 'leros'),
  ])),
  [{ kind: 'one_way', anchor: 'OUT', legs: ['OUT'] },
   { kind: 'one_way', anchor: 'RET', legs: ['RET'] }])

// 3. plain one-way (no return) → ONE one_way group
eq('one-way only → 1 one_way group',
  proj(groupFerryLegs([leg('OUT', 'outbound', 'DENTUR', 'bodrum', 'kos')])),
  [{ kind: 'one_way', anchor: 'OUT', legs: ['OUT'] }])

// 4. reverse route but DIFFERENT operator → NOT paired → 2 one_way groups
eq('different-operator reverse → 2 one_way groups',
  proj(groupFerryLegs([
    leg('OUT', 'outbound', 'DENTUR', 'bodrum', 'kos'),
    leg('RET', 'return', 'OTHER', 'kos', 'bodrum'),
  ])),
  [{ kind: 'one_way', anchor: 'OUT', legs: ['OUT'] },
   { kind: 'one_way', anchor: 'RET', legs: ['RET'] }])

// 5. exonym reverse (rodos ⇄ rhodes, same op) → ONE round_trip group
eq('exonym reverse Rodos⇄Rhodes → 1 round_trip group',
  proj(groupFerryLegs([
    leg('OUT', 'outbound', 'DENTUR', 'bodrum', 'rodos'),
    leg('RET', 'return', 'DENTUR', 'rhodes', 'bodrum'),
  ])),
  [{ kind: 'round_trip', anchor: 'OUT', legs: ['OUT', 'RET'] }])

// 6. operator UNDEFINED on both → guard blocks the pair → 2 one_way groups
eq('operator-undefined both → NOT paired → 2 one_way groups',
  proj(groupFerryLegs([
    leg('OUT', 'outbound', undefined, 'bodrum', 'kos'),
    leg('RET', 'return', undefined, 'kos', 'bodrum'),
  ])),
  [{ kind: 'one_way', anchor: 'OUT', legs: ['OUT'] },
   { kind: 'one_way', anchor: 'RET', legs: ['RET'] }])

console.log(failures ? `\n${failures} FAIL` : `\nALL PASS`)
process.exit(failures ? 1 : 0)
