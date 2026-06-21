'use server'

import { getFerryProvider } from '@/lib/ferry'
import { resolvePort, type PortCountry } from '@/lib/ferry/ports'
import type { FerryPort } from '@/lib/ferry/provider'

/** Canonical, display-ready port for the dropdown. Numeric region ids stay
 *  server-side (the adapter resolves slug→id) — the client only ever sees slug. */
export interface CatalogPort {
  slug: string
  country: PortCountry
  name: { tr: string; en: string; el?: string }
}

/** Provider FerryPort[] → canonical CatalogPort[]; an off-catalog region (no
 *  ports.ts match) is DROPPED + warned, never shown to the user. p.name is the
 *  RAW provider display name (Dentur "BODRUM" / mock "Rhodes"), so resolvePort
 *  exercises aliases (Rhodes→rodos) and the warn logs the true region id. */
function toCatalog(ports: FerryPort[]): CatalogPort[] {
  const out: CatalogPort[] = []
  for (const p of ports) {
    const c = resolvePort(p.name)
    if (!c) { console.warn(`[ferry] off-catalog port dropped: '${p.name}' (id=${p.providerId})`); continue }
    out.push({ slug: c.slug, country: c.country, name: c.name })
  }
  return out
}

/** All departure ports (Dentur: DepartureRegion, 17 regions). */
export async function getDeparturePortsAction(): Promise<CatalogPort[]> {
  const provider = await getFerryProvider()
  return toCatalog(await provider.listPorts())
}

/** Arrival ports reachable from a departure slug (Dentur: ArrivalRegion).
 *  Returns [] for an unknown/off-catalog departure (adapter throws → caught). */
export async function getArrivalPortsAction(departureSlug: string): Promise<CatalogPort[]> {
  const provider = await getFerryProvider()
  try {
    return toCatalog(await provider.listArrivals(departureSlug))
  } catch (e) {
    if (e instanceof Error && /unknown_departure/.test(e.message)) return []
    throw e
  }
}
