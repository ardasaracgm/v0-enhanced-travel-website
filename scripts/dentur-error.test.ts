/**
 * Pure unit test for lib/ferry/dentur-error.ts — no I/O, no server-only, no Dentur.
 * Locks the retry POLICY (Commit 4d): retry ONLY a pre-connection network failure;
 * NEVER an http/timeout/config error (a response or an abort means the request may
 * have created a booking — Dentur has no idempotency key → blind retry double-books).
 * Run: npx tsx scripts/dentur-error.test.ts   (exit 1 on any failure)
 */
import { DenturError, isRetryable, withReserveRetry } from '../lib/ferry/dentur-error'

let failures = 0
function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want)
  if (g === w) console.log(`✔ ${name}`)
  else { failures++; console.error(`✘ ${name}\n   got:  ${g}\n   want: ${w}`) }
}

// ---- DenturError construction ----
eq('default kind = config (safe non-retry)', new DenturError('x').kind, 'config')
eq('http carries status', new DenturError('x', 'http', 502).status, 502)
eq('name is DenturError', new DenturError('x').name, 'DenturError')

// ---- isRetryable: ONLY network ----
eq('network → retryable', isRetryable(new DenturError('x', 'network')), true)
eq('http 503 → NOT retryable', isRetryable(new DenturError('x', 'http', 503)), false)
eq('http 400 → NOT retryable', isRetryable(new DenturError('x', 'http', 400)), false)
eq('timeout → NOT retryable', isRetryable(new DenturError('x', 'timeout')), false)
eq('config → NOT retryable', isRetryable(new DenturError('x', 'config')), false)
eq('plain Error → NOT retryable', isRetryable(new Error('x')), false)

// ---- withReserveRetry (sleep stubbed; no real backoff) ----
const noSleep = async () => {}
const opts = { maxRetries: 2, backoffMs: 0, sleep: noSleep }

async function run() {
  // network twice then success → 3 calls total (2 retries), returns the success value
  let calls = 0
  const r1 = await withReserveRetry(async () => {
    calls++; if (calls < 3) throw new DenturError('net', 'network'); return { ok: true }
  }, opts)
  eq('network→success: calls', calls, 3)
  eq('network→success: result', r1, { ok: true })

  // network always → exhausts (maxRetries=2 ⇒ 3 calls) then throws
  calls = 0; let threw = false
  try { await withReserveRetry(async () => { calls++; throw new DenturError('net', 'network') }, opts) }
  catch { threw = true }
  eq('network exhausted: calls', calls, 3)
  eq('network exhausted: threw', threw, true)

  // timeout → 0 retries (1 call) then throws (double-book guard)
  calls = 0; threw = false
  try { await withReserveRetry(async () => { calls++; throw new DenturError('to', 'timeout') }, opts) }
  catch { threw = true }
  eq('timeout NOT retried: calls', calls, 1)
  eq('timeout NOT retried: threw', threw, true)

  // http 5xx → 0 retries (double-book guard)
  calls = 0; threw = false
  try { await withReserveRetry(async () => { calls++; throw new DenturError('5xx', 'http', 503) }, opts) }
  catch { threw = true }
  eq('http 5xx NOT retried: calls', calls, 1)
  eq('http 5xx NOT retried: threw', threw, true)

  // business { ok:false } is RETURNED (not thrown) → 1 call, no retry, passthrough
  calls = 0
  const br = await withReserveRetry(async () => { calls++; return { ok: false, error: 'reject' } }, opts)
  eq('business reject NOT retried: calls', calls, 1)
  eq('business reject passthrough', br, { ok: false, error: 'reject' })

  // happy path → 1 call, no retry
  calls = 0
  await withReserveRetry(async () => { calls++; return { ok: true } }, opts)
  eq('happy path single call', calls, 1)

  console.log(failures ? `\n${failures} FAIL` : `\nALL PASS`)
  process.exit(failures ? 1 : 0)
}
run()
