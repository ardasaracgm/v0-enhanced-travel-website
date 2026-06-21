/**
 * Canonical port catalog — SINGLE source for the ferry port dropdown grouping
 * (country tabs) + cross-language/name-variant resolution. Covers all 17 Dentur
 * regions (DepartureRegion probe, 2026-06-21). Dentur returns NO country field
 * (verified: region objects carry only regionID/regionName/code), so the TR/GR
 * split lives here as an explicit map — same pattern as timezone.ts.
 *
 * Key = the Dentur region name run through util.ts slug() (Türkçe-folded). This
 * file IMPORTS slug() — never re-implements it — so a catalog key can never drift
 * from the adapter's port resolution. `aliases` close known name mismatches the
 * fold alone can't (rhodes↔rodos, samos↔sisam, chios↔sakız) — resolvePort folds
 * each alias at lookup time, so aliases are written as readable names.
 *
 * Pure/isomorphic (no 'server-only'): safe in client dropdown + server alike.
 */
import { slug } from './util'

export type PortCountry = 'TR' | 'GR'

export interface Port {
  /** util.slug() of the Dentur region name — the canonical key. */
  slug: string
  country: PortCountry
  /** Display names. el optional: omitted (with TODO) where the Greek exonym is
   *  not confidently known — never invented. Consumer falls back to tr/en. */
  name: { tr: string; en: string; el?: string }
  /** Readable name variants (other languages / app slugs) that must resolve to
   *  this port. Folded via slug() at lookup; need not be pre-slugged. */
  aliases?: string[]
}

/** All 17 Dentur regions. Order: TR side first, then GR side. */
export const PORTS: Port[] = [
  // ----- Türkiye (TR) -----
  { slug: 'bodrum',      country: 'TR', name: { tr: 'Bodrum',      en: 'Bodrum',      el: 'Μπόντρουμ' } },
  { slug: 'turgutreis',  country: 'TR', name: { tr: 'Turgutreis',  en: 'Turgutreis'  /* TODO(el) */ } },
  { slug: 'fethiye',     country: 'TR', name: { tr: 'Fethiye',     en: 'Fethiye'     /* TODO(el) */ } },
  { slug: 'cesme',       country: 'TR', name: { tr: 'Çeşme',       en: 'Cesme',       el: 'Τσεσμές' } },
  { slug: 'ayvalik',     country: 'TR', name: { tr: 'Ayvalık',     en: 'Ayvalik',     el: 'Αϊβαλί' }, aliases: ['Ayvali'] },
  { slug: 'kusadasi',    country: 'TR', name: { tr: 'Kuşadası',    en: 'Kusadasi'    /* TODO(el) */ } },
  { slug: 'dikili',      country: 'TR', name: { tr: 'Dikili',      en: 'Dikili'      /* TODO(el) */ } },
  { slug: 'seferihisar', country: 'TR', name: { tr: 'Seferihisar', en: 'Seferihisar' /* TODO(el) */ } },
  { slug: 'aliaga',      country: 'TR', name: { tr: 'Aliağa',      en: 'Aliaga'      /* TODO(el) */ } },

  // ----- Ελλάδα / Yunanistan (GR) -----
  { slug: 'kos',           country: 'GR', name: { tr: 'Kos',      en: 'Kos',      el: 'Κως' },      aliases: ['İstanköy'] },
  { slug: 'kalymnos',      country: 'GR', name: { tr: 'Kalimnos', en: 'Kalymnos', el: 'Κάλυμνος' }, aliases: ['Kalimnos'] },
  { slug: 'samos',         country: 'GR', name: { tr: 'Sisam',    en: 'Samos',    el: 'Σάμος' },    aliases: ['Sisam'] },
  { slug: 'rodos',         country: 'GR', name: { tr: 'Rodos',    en: 'Rhodes',   el: 'Ρόδος' },    aliases: ['Rhodes', 'Rodi'] },
  { slug: 'leros',         country: 'GR', name: { tr: 'Leros',    en: 'Leros',    el: 'Λέρος' } },
  { slug: 'chios-(sakiz)', country: 'GR', name: { tr: 'Sakız',    en: 'Chios',    el: 'Χίος' },     aliases: ['Chios', 'Sakız', 'Sakiz'] },
  { slug: 'midilli',       country: 'GR', name: { tr: 'Midilli',  en: 'Lesvos',   el: 'Λέσβος' },   aliases: ['Lesvos', 'Mytilene', 'Mitilini', 'Lesbos'] },
  { slug: 'patmos',        country: 'GR', name: { tr: 'Patmos',   en: 'Patmos',   el: 'Πάτμος' } },
]

/**
 * Lookup index: canonical slug + every alias (folded), built once. A real
 * canonical slug is never clobbered by an alias collision (slugs win).
 */
const LOOKUP = new Map<string, Port>()
for (const p of PORTS) {
  LOOKUP.set(p.slug, p)
  for (const a of p.aliases ?? []) {
    const k = slug(a)
    if (!LOOKUP.has(k)) LOOKUP.set(k, p)
  }
}

/**
 * Resolve a raw port/region name (Dentur name, app slug, or a language variant)
 * to its canonical Port. Folds the input through slug() then matches a canonical
 * slug or alias. Returns null for an unknown port (e.g. "marmaris" — not in the
 * Dentur catalog); the caller drops it into an "Other" group + warns (next step).
 */
export function resolvePort(rawName: string): Port | null {
  return LOOKUP.get(slug(rawName)) ?? null
}
