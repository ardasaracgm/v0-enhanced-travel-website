'use server'

import { getFerryProvider } from '@/lib/ferry'
import { slug } from '@/lib/ferry/util'
import type { FerryTrip } from '@/lib/ferry/provider'

export interface FerrySearchActionInput {
  from: string
  to: string
  date: string
  pax?: { adults: number; children: number; infants: number }
}

/**
 * Client → provider boundary. Client components call THIS, never
 * getFerryProvider() (which can pull the server-only Dentur module). from/to are
 * slugged with the shared slug() so they match the Dentur adapter's port lookup.
 */
export async function searchFerriesAction(input: FerrySearchActionInput): Promise<FerryTrip[]> {
  const provider = await getFerryProvider()
  return provider.search({
    from: slug(input.from),
    to: slug(input.to),
    date: input.date,
    pax: input.pax,
  })
}
