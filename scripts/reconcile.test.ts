/**
 * Pure unit test for lib/ferry/reconcile.ts — no golden, no I/O, no server-only.
 * Locks the round-trip per-leg voucher reconcile (the MONEY PATH): integer-cents
 * group/sum, total-preservation guard, per-leg redistribution, mismatch flagging,
 * and the ferry_id→expeditionID parse the whole leg↔voucher match hinges on.
 * Run: npx tsx scripts/reconcile.test.ts   (exit 1 on any failure)
 */
import { reconcileVoucherSplit, expeditionIdFromFerryId, type ReconcileLeg } from '../lib/ferry/reconcile'
import type { FerryItemMetadata } from '../lib/supabase'

let failures = 0
function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want)
  if (g === w) console.log(`✔ ${name}`)
  else { failures++; console.error(`✘ ${name}\n   got:  ${g}\n   want: ${w}`) }
}
function throws(name: string, fn: () => unknown) {
  try { fn(); failures++; console.error(`✘ ${name}\n   expected throw, got none`) }
  catch { console.log(`✔ ${name}`) }
}

// leg/voucher fixture builders. meta only needs ferry_id for the reconcile.
const leg = (id: string, expId: number, priceCents: number): ReconcileLeg =>
  ({ id, meta: { ferry_id: `dentur:${expId}` } as FerryItemMetadata, priceCents })
const v = (expeditionId: number, amount: number) => ({ expeditionId, amount })

// project the result to a JSON-comparable shape (Map → plain object).
const proj = (r: ReturnType<typeof reconcileVoucherSplit>) => ({
  isRoundTrip: r.isRoundTrip, haveSplit: r.haveSplit, everyLegMatched: r.everyLegMatched,
  totalsMatch: r.totalsMatch, provisionalCents: r.provisionalCents, realCents: r.realCents,
  // undefined → null so an unmatched leg survives JSON.stringify (which drops
  // undefined-valued keys); the Map itself holds the leg id → undefined.
  corrected: Object.fromEntries([...r.correctedCentsByItemId].map(([k, v]) => [k, v ?? null])),
  mismatch: r.mismatch ?? null,
})

// A. same-day RT, equal real fares 17.50/17.50 → 1750/1750, total preserved.
eq('same-day RT 17.50/17.50 → 1750/1750 totalsMatch',
  proj(reconcileVoucherSplit(
    [leg('OUT', 13064, 1750), leg('RET', 13277, 1750)],
    [v(13064, 17.50), v(13277, 17.50)])),
  { isRoundTrip: true, haveSplit: true, everyLegMatched: true, totalsMatch: true,
    provisionalCents: 3500, realCents: 3500, corrected: { OUT: 1750, RET: 1750 }, mismatch: null })

// B. different-day RT, 20.00/20.00 → 2000/2000, total 4000.
eq('diff-day RT 20.00/20.00 → 2000/2000 totalsMatch',
  proj(reconcileVoucherSplit(
    [leg('OUT', 13064, 2000), leg('RET', 13290, 2000)],
    [v(13064, 20.00), v(13290, 20.00)])),
  { isRoundTrip: true, haveSplit: true, everyLegMatched: true, totalsMatch: true,
    provisionalCents: 4000, realCents: 4000, corrected: { OUT: 2000, RET: 2000 }, mismatch: null })

// C. REDISTRIBUTION — provisional equal 1750/1750 but real uneven 20.00/15.00;
//    total 3500 preserved ⇒ split applies, legs corrected to the real fares.
eq('RT redistribution 20.00/15.00 (total preserved) → 2000/1500',
  proj(reconcileVoucherSplit(
    [leg('OUT', 13064, 1750), leg('RET', 13277, 1750)],
    [v(13064, 20.00), v(13277, 15.00)])),
  { isRoundTrip: true, haveSplit: true, everyLegMatched: true, totalsMatch: true,
    provisionalCents: 3500, realCents: 3500, corrected: { OUT: 2000, RET: 1500 }, mismatch: null })

// D. FLOAT-SAFETY — 20.10 + 19.90 = 40.00; naive float ×100 drifts (2009.999…),
//    Math.round to integer cents keeps the total exact ⇒ totalsMatch holds.
eq('RT float-safety 20.10/19.90 → 2010/1990 (Math.round, no drift)',
  proj(reconcileVoucherSplit(
    [leg('OUT', 13064, 2000), leg('RET', 13290, 2000)],
    [v(13064, 20.10), v(13290, 19.90)])),
  { isRoundTrip: true, haveSplit: true, everyLegMatched: true, totalsMatch: true,
    provisionalCents: 4000, realCents: 4000, corrected: { OUT: 2010, RET: 1990 }, mismatch: null })

// E. MULTI-PAX — vouchers are per-passenger-per-leg; two per leg must SUM by expId.
eq('RT multi-pax sums per leg (20+10 each) → 3000/3000',
  proj(reconcileVoucherSplit(
    [leg('OUT', 13064, 3000), leg('RET', 13277, 3000)],
    [v(13064, 20.00), v(13064, 10.00), v(13277, 20.00), v(13277, 10.00)])),
  { isRoundTrip: true, haveSplit: true, everyLegMatched: true, totalsMatch: true,
    provisionalCents: 6000, realCents: 6000, corrected: { OUT: 3000, RET: 3000 }, mismatch: null })

// F. MISMATCH — real total (4000) ≠ charged (3500) ⇒ NO split, flag charged/dentur.
eq('RT mismatch real≠provisional → totalsMatch false + flag',
  proj(reconcileVoucherSplit(
    [leg('OUT', 13064, 1750), leg('RET', 13277, 1750)],
    [v(13064, 20.00), v(13277, 20.00)])),
  { isRoundTrip: true, haveSplit: true, everyLegMatched: true, totalsMatch: false,
    provisionalCents: 3500, realCents: 4000, corrected: { OUT: 2000, RET: 2000 },
    mismatch: { charged_cents: 3500, dentur_cents: 4000 } })

// G. MISSING VOUCHER — return leg unmatched ⇒ everyLegMatched false, no split, flagged.
eq('RT missing return voucher → everyLegMatched false + flag',
  proj(reconcileVoucherSplit(
    [leg('OUT', 13064, 1750), leg('RET', 13277, 1750)],
    [v(13064, 17.50)])),
  { isRoundTrip: true, haveSplit: true, everyLegMatched: false, totalsMatch: false,
    provisionalCents: 3500, realCents: 1750, corrected: { OUT: 1750, RET: null },
    mismatch: { charged_cents: 3500, dentur_cents: 1750 } })

// H. ONE-WAY — single leg is already exact: never round-trip, never split, never flagged.
eq('one-way single leg → isRoundTrip false, no split, no flag',
  proj(reconcileVoucherSplit(
    [leg('OUT', 13064, 1750)],
    [v(13064, 17.50)])),
  { isRoundTrip: false, haveSplit: true, everyLegMatched: true, totalsMatch: false,
    provisionalCents: 1750, realCents: 1750, corrected: { OUT: 1750 }, mismatch: null })

// --- expeditionIdFromFerryId: the parse the whole leg↔voucher match hinges on ---
eq('parse dentur:13064 → 13064', expeditionIdFromFerryId('dentur:13064'), 13064)
eq('parse bare 13277 → 13277', expeditionIdFromFerryId('13277'), 13277)
eq('parse case-insensitive prefix SKY:99 → 99', expeditionIdFromFerryId('SKY:99'), 99)
// Empty/undefined → 0 (Number('')===0, finite): fails SAFE — no voucher has
// tripID 0, so the leg goes unmatched (mismatch flagged, no split) and Dentur
// rejects expeditionID:0. Locked here as the real behavior; harden separately.
eq('parse empty string → 0 (fails safe, no throw)', expeditionIdFromFerryId(''), 0)
eq('parse undefined → 0 (fails safe, no throw)', expeditionIdFromFerryId(undefined), 0)
throws('parse non-numeric dentur:abc throws (NaN)', () => expeditionIdFromFerryId('dentur:abc'))

console.log(failures ? `\n${failures} FAIL` : `\nALL PASS`)
process.exit(failures ? 1 : 0)
