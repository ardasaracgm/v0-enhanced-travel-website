'use client'

/**
 * Visa draft application lifecycle (client-side).
 * ===============================================
 * Vize (redesign) Faz 1. The visa wizard creates its `visa_applications` row
 * LAZILY — not when the form opens, but on the first document upload. Documents
 * need a real `application_id` to attach to (presign/confirm), so the very first
 * upload calls `ensureDraft()`, which POSTs /api/visa/draft once and caches the
 * returned id in sessionStorage for the rest of the session.
 *
 * sessionStorage (not state) so the id survives client navigation between wizard
 * steps and a slot mounted on step 2 sees the draft a slot on step 1 created.
 *
 * `clearDraft()` is called after a successful final submit (wired in a later
 * part) so the next visa application starts fresh instead of reusing the
 * now-finalised draft.
 */

const APP_ID_KEY = 'visa_draft_application_id'
const IDEMPOTENCY_KEY = 'visa_draft_idempotency_key'

/** Module-level guard: collapse concurrent first-upload races into one POST. */
let inflight: Promise<string> | null = null

function hasWindow(): boolean {
  return typeof window !== 'undefined'
}

function newKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'idk-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/**
 * Stable per-session idempotency key for the draft POST. Persisted alongside the
 * id so a retry after a failed/raced create (no id stored yet) still dedups
 * server-side against the same key instead of spawning a second draft.
 */
function getOrCreateIdempotencyKey(): string {
  const existing = sessionStorage.getItem(IDEMPOTENCY_KEY)
  if (existing) return existing
  const key = newKey()
  sessionStorage.setItem(IDEMPOTENCY_KEY, key)
  return key
}

/** The cached draft id for this session, or null if none has been created yet. */
export function getDraftId(): string | null {
  if (!hasWindow()) return null
  return sessionStorage.getItem(APP_ID_KEY)
}

/**
 * Return the session's draft application id, creating the draft on first call.
 * Idempotent: returns the cached id on subsequent calls and de-dupes concurrent
 * callers (two slots whose first uploads overlap) onto a single in-flight POST.
 */
export async function ensureDraft(locale?: string): Promise<string> {
  if (!hasWindow()) {
    throw new Error('ensureDraft() must run in the browser')
  }

  const cached = sessionStorage.getItem(APP_ID_KEY)
  if (cached) return cached
  if (inflight) return inflight

  inflight = (async () => {
    const res = await fetch('/api/visa/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locale,
        idempotency_key: getOrCreateIdempotencyKey(),
      }),
    })
    if (!res.ok) throw new Error(`draft create failed: ${res.status}`)
    const { application_id } = (await res.json()) as { application_id: string }
    sessionStorage.setItem(APP_ID_KEY, application_id)
    return application_id
  })()

  try {
    return await inflight
  } finally {
    inflight = null
  }
}

/** Forget the session draft (call after a successful final submit). */
export function clearDraft(): void {
  if (!hasWindow()) return
  sessionStorage.removeItem(APP_ID_KEY)
  sessionStorage.removeItem(IDEMPOTENCY_KEY)
}
