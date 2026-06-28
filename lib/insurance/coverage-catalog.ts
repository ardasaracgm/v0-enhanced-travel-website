/**
 * Sigorta teminat kataloğu — Adım 0'da AÇILIŞTA (tarih/yolcu seçilmeden) gri
 * "tahmini" satırları göstermek için statik referans. Gerçek fiyat + seçilebilirlik
 * canlı Auras quote'tan (/api/insurance/quote → getInsuranceQuote) gelir; bu katalog
 * yalnızca quote dönene kadarki açılış placeholder'ı.
 *
 * coverageId/coverageValue CANLI get_offers ile birebir (2026-06-28 read-only probe,
 * https://api.insurs.net/b1, company 366): 7=35k, 8=100k, 9=500k EUR. estimateOneDay =
 * tek-yetişkin 1-günlük get_price (EUR), lineer per-day. coverageId YANLIŞ olursa submit
 * server re-price 'invalid_insurance' döner → bu ID'ler canlı API'ye kilitli.
 *
 * SADECE VERİ — stil/Tailwind YOK (gri/disabled görünümü wizard'da). server-only DEĞİL.
 */
export interface InsuranceCoverageCatalogEntry {
  coverageId: number     // Auras get_offers coverage_id (submit'in eşleştirdiği)
  coverageValue: number  // teminat tutarı (EUR) — UI etiketi
  estimateOneDay: number // tek-yetişkin 1-günlük tahmini fiyat (EUR), açılış placeholder
}

export const INSURANCE_COVERAGE_CATALOG: readonly InsuranceCoverageCatalogEntry[] = [
  { coverageId: 7, coverageValue: 35000,  estimateOneDay: 1.5 },
  { coverageId: 8, coverageValue: 100000, estimateOneDay: 2 },
  { coverageId: 9, coverageValue: 500000, estimateOneDay: 3 },
]
