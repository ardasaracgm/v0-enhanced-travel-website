'use client'

/**
 * Hero → wizard prefill bridge (client-side).
 * ===========================================
 * The visa landing hero carries a 5-field mini-form (name, entry point, vessel
 * type, birth date). On submit its values are stashed in sessionStorage and the
 * page scrolls to the full wizard, which hydrates its initial form state from
 * this stash on mount — then clears it, so the prefill is one-shot and a later
 * manual reset (or a second visit to the wizard) starts clean.
 *
 * sessionStorage (same `visa_*` namespace as use-draft-application) so the
 * handoff survives the in-page scroll without threading props through the
 * fully-client page tree.
 */

const KEY = 'visa_hero_prefill'

export type HeroPrefill = {
  firstName: string
  lastName: string
  entryPoint: string
  vesselType: string
  birthDate: string
}

function hasWindow(): boolean {
  return typeof window !== 'undefined'
}

/** Stash the hero mini-form values for the wizard to pick up on mount. */
export function setHeroPrefill(v: HeroPrefill): void {
  if (!hasWindow()) return
  sessionStorage.setItem(KEY, JSON.stringify(v))
}

/** The pending hero prefill, or null if none / corrupt. Does not clear it. */
export function readHeroPrefill(): HeroPrefill | null {
  if (!hasWindow()) return null
  const raw = sessionStorage.getItem(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as HeroPrefill
  } catch {
    return null
  }
}

/** Forget the pending prefill (call right after a one-shot hydrate). */
export function clearHeroPrefill(): void {
  if (!hasWindow()) return
  sessionStorage.removeItem(KEY)
}
