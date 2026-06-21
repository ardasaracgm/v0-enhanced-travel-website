/**
 * isReversePair — the ONLY predicate that may treat two ferry legs as one
 * discounted round-trip (a single Dentur reservation). Pure/isomorphic: no
 * 'server-only', no wire. Callers (reserve grouping + pricing — Commit 4)
 * consume it; nothing here touches the money-path yet.
 *
 * `b` is a's reverse leg iff:
 *   1. same operator (the round-trip discount is one company's fare table), and
 *   2. b's route is a's route flipped — a.from↔b.to AND a.to↔b.from — compared
 *      on CANONICAL port slugs. resolvePort folds names/aliases/exonyms
 *      (rodos↔rhodes, sisam↔samos) and returns null for ports outside the
 *      catalog; any null → NOT a pair (fail safe).
 *
 * Anything else — an open-jaw return (Bodrum→Kos out, Kos→Leros back), a
 * different-operator return, or an unknown port — is NOT a pair: the two legs
 * stay independent one-ways (no discount, no single reservation).
 */
import type { FerryTrip } from './provider'
import { resolvePort } from './ports'

export function isReversePair(a: FerryTrip, b: FerryTrip): boolean {
  if (a.operator !== b.operator) return false
  const aFrom = resolvePort(a.from.id)
  const aTo = resolvePort(a.to.id)
  const bFrom = resolvePort(b.from.id)
  const bTo = resolvePort(b.to.id)
  if (!aFrom || !aTo || !bFrom || !bTo) return false
  return aTo.slug === bFrom.slug && aFrom.slug === bTo.slug
}
