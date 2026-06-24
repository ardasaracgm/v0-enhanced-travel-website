import { checkModelAvailability } from '@/lib/actions/car-availability-action'

type Result = Awaited<ReturnType<typeof checkModelAvailability>>

// Fleet cards query availability independently. When the hero "Search" re-seeds
// every card to the same dates, they fire identical requests at once — this
// collapses concurrent identical (pickup, days) calls into a single in-flight
// promise and briefly caches the result, so N cards cost one round-trip.
const TTL_MS = 15_000
const inflight = new Map<string, Promise<Result>>()
const cache = new Map<string, { at: number; value: Result }>()

export function getCachedModelAvailability(pickupDate: string, days: number): Promise<Result> {
  const key = `${pickupDate}_${days}`

  const cached = cache.get(key)
  if (cached && Date.now() - cached.at < TTL_MS) return Promise.resolve(cached.value)

  const existing = inflight.get(key)
  if (existing) return existing

  const p = checkModelAvailability(pickupDate, days)
    .then((value) => {
      cache.set(key, { at: Date.now(), value })
      inflight.delete(key)
      return value
    })
    .catch((err) => {
      inflight.delete(key)
      throw err
    })
  inflight.set(key, p)
  return p
}
