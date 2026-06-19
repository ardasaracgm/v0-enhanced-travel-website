/**
 * Canonical port slug — SINGLE source. Both the search action's query slugging
 * and the Dentur adapter's port resolution use THIS exact function, so they can
 * never drift (a divergent copy would silently produce dentur_unknown_departure).
 * Pure/isomorphic: no 'server-only', safe anywhere.
 */
export const slug = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-')
