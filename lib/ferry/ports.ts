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
  /** UN/LOCODE (city level). Canonical, provider-independent identity. */
  unlocode?: string
  /** Canonical berth identity — UNLOCODE-NNNN. First berth = -0001, numbered by
   *  the API that first defined the port (Dentur). Multi-berth cities (e.g.
   *  Bodrum Kale vs Cruise) add -0002… when a 2nd provider/berth lands. */
  berthId?: string
  /** UI grouping key (= unlocode). Berths of the same city share it once
   *  multi-berth grouping is needed; today one berth/city so unused in UI. */
  cityGroup?: string
  /** Provider code mapping (e.g. { dentur: '19' }). NOT yet load-bearing —
   *  Dentur regionID is resolved live by name today; populated when a 2nd ferry
   *  API integrates and static disambiguation is required. */
  providerIds?: Record<string, string>
}

/** All 17 Dentur regions. Order: TR side first, then GR side. */
export const PORTS: Port[] = [
  // ----- Türkiye (TR) -----
  { slug: 'bodrum',      country: 'TR', name: { tr: 'Bodrum',      en: 'Bodrum',      el: 'Μπόντρουμ' }, unlocode: 'TRBXN', berthId: 'TRBXN-0001', cityGroup: 'TRBXN' },
  { slug: 'turgutreis',  country: 'TR', name: { tr: 'Turgutreis',  en: 'Turgutreis'  /* TODO(el) */ }, unlocode: 'TRTUR', berthId: 'TRTUR-0001', cityGroup: 'TRTUR' },
  { slug: 'fethiye',     country: 'TR', name: { tr: 'Fethiye',     en: 'Fethiye'     /* TODO(el) */ }, unlocode: 'TRFET', berthId: 'TRFET-0001', cityGroup: 'TRFET' },
  { slug: 'cesme',       country: 'TR', name: { tr: 'Çeşme',       en: 'Cesme',       el: 'Τσεσμές' }, unlocode: 'TRCES', berthId: 'TRCES-0001', cityGroup: 'TRCES' },
  { slug: 'ayvalik',     country: 'TR', name: { tr: 'Ayvalık',     en: 'Ayvalik',     el: 'Αϊβαλί' }, aliases: ['Ayvali'], unlocode: 'TRAYV', berthId: 'TRAYV-0001', cityGroup: 'TRAYV' },
  { slug: 'kusadasi',    country: 'TR', name: { tr: 'Kuşadası',    en: 'Kusadasi'    /* TODO(el) */ }, unlocode: 'TRKUS', berthId: 'TRKUS-0001', cityGroup: 'TRKUS' },
  { slug: 'dikili',      country: 'TR', name: { tr: 'Dikili',      en: 'Dikili'      /* TODO(el) */ }, unlocode: 'TRDIK', berthId: 'TRDIK-0001', cityGroup: 'TRDIK' },
  { slug: 'seferihisar', country: 'TR', name: { tr: 'Seferihisar', en: 'Seferihisar' /* TODO(el) */ }, unlocode: 'TRSFH', berthId: 'TRSFH-0001', cityGroup: 'TRSFH' },
  { slug: 'aliaga',      country: 'TR', name: { tr: 'Aliağa',      en: 'Aliaga'      /* TODO(el) */ }, unlocode: 'TRALI', berthId: 'TRALI-0001', cityGroup: 'TRALI' },

  // ----- Ελλάδα / Yunanistan (GR) -----
  { slug: 'kos',           country: 'GR', name: { tr: 'Kos',      en: 'Kos',      el: 'Κως' },      aliases: ['İstanköy'], unlocode: 'GRKGS', berthId: 'GRKGS-0001', cityGroup: 'GRKGS' },
  { slug: 'kalymnos',      country: 'GR', name: { tr: 'Kalimnos', en: 'Kalymnos', el: 'Κάλυμνος' }, aliases: ['Kalimnos'], unlocode: 'GRKMI', berthId: 'GRKMI-0001', cityGroup: 'GRKMI' },
  { slug: 'samos',         country: 'GR', name: { tr: 'Sisam',    en: 'Samos',    el: 'Σάμος' },    aliases: ['Sisam'], unlocode: 'GRSMI', berthId: 'GRSMI-0001', cityGroup: 'GRSMI' },
  { slug: 'rodos',         country: 'GR', name: { tr: 'Rodos',    en: 'Rhodes',   el: 'Ρόδος' },    aliases: ['Rhodes', 'Rodi'], unlocode: 'GRRHO', berthId: 'GRRHO-0001', cityGroup: 'GRRHO' },
  { slug: 'leros',         country: 'GR', name: { tr: 'Leros',    en: 'Leros',    el: 'Λέρος' }, unlocode: 'GRLRS', berthId: 'GRLRS-0001', cityGroup: 'GRLRS' },
  { slug: 'chios-(sakiz)', country: 'GR', name: { tr: 'Sakız',    en: 'Chios',    el: 'Χίος' },     aliases: ['Chios', 'Sakız', 'Sakiz'], unlocode: 'GRJKH', berthId: 'GRJKH-0001', cityGroup: 'GRJKH' },
  { slug: 'midilli',       country: 'GR', name: { tr: 'Midilli',  en: 'Lesvos',   el: 'Λέσβος' },   aliases: ['Lesvos', 'Mytilene', 'Mitilini', 'Lesbos'], unlocode: 'GRMJT', berthId: 'GRMJT-0001', cityGroup: 'GRMJT' },
  { slug: 'patmos',        country: 'GR', name: { tr: 'Patmos',   en: 'Patmos',   el: 'Πάτμος' }, unlocode: 'GRPMS', berthId: 'GRPMS-0001', cityGroup: 'GRPMS' },
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
