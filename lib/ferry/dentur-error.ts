/**
 * DenturError + retry classifier — pure, NO 'server-only', no I/O. Extracted so the
 * retry policy is unit-testable in isolation (reconcile/group-legs pattern) and so
 * both the adapter (dentur-provider) and the orchestrator (reserve-ferry) share ONE
 * error type + ONE retry rule.
 */
export type DenturErrorKind = 'config' | 'http' | 'network' | 'timeout'

export class DenturError extends Error {
  readonly kind: DenturErrorKind
  readonly status?: number
  // Default 'config' is the SAFE (never-retry) fallback: any DenturError that forgets
  // to classify itself is treated as non-retryable, so a blind retry can never
  // double-book by accident.
  constructor(message: string, kind: DenturErrorKind = 'config', status?: number) {
    super(message)
    this.name = 'DenturError'
    this.kind = kind
    this.status = status
  }
}

/**
 * isRetryable — retry ONLY a pre-connection network failure: the request provably
 * never reached Dentur, so no booking was created. EVERYTHING else is non-retryable:
 *   • http    — a response came back ⇒ the request reached Dentur ⇒ a booking MAY exist.
 *   • timeout — the abort fired AFTER sending ⇒ a booking MAY exist (Dentur has no
 *               idempotency key, so a blind retry could double-book).
 *   • config  — a setup/data error a retry can't fix.
 */
export function isRetryable(err: unknown): boolean {
  return err instanceof DenturError && err.kind === 'network'
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * withReserveRetry — runs fn(), retrying ONLY on an isRetryable (network) throw, up to
 * maxRetries with a linear backoff. A RETURNED value (incl. a business { ok:false })
 * is passed straight through — NEVER retried. A non-retryable throw propagates
 * immediately. Pure orchestration (sleep injectable) → unit-testable without Dentur.
 */
export async function withReserveRetry<T>(
  fn: () => Promise<T>,
  opts: { maxRetries: number; backoffMs: number; sleep?: (ms: number) => Promise<void> },
): Promise<T> {
  const sleep = opts.sleep ?? defaultSleep
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt < opts.maxRetries && isRetryable(err)) {
        await sleep(opts.backoffMs * (attempt + 1)) // 300, 600, …
        continue
      }
      throw err
    }
  }
}
