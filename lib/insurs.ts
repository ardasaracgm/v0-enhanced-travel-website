import 'server-only'

/**
 * Auras travel insurance — insurs.net API (Kademe A0: mock scaffold).
 * Vendor: auras.insure / API insurs.net. NOT auraspay.com (kripto), NOT
 * esimaccess (e-SIM). Ayrı firma.
 *
 * Alan yapısı docs/handover/Auras_Insurance_API_documentation_Avia__Airlines__
 * Tickets.pdf'ten (satır ref inline). A0 DURUMU: INSURS_API_KEY yok + response
 * yapısı canlı API'ye karşı doğrulanmadı + DOB'un fiyata etkisi Auras teyidi
 * bekliyor → gerçek fetch kodu YAZILI ama USE_MOCK_QUOTE arkasında KAPALI.
 * Key + cevap gelince flag açılıp gerçek API'ye karşı test edilecek.
 */

// A1: canlı get_offers + get_price (INSURS_API_KEY Vercel+local'de hazır).
// Mock'a dönmek için true yap (o zaman fiyat 0 döner, UI fiyat göstermez).
const USE_MOCK_QUOTE = false

// Sabitler (doc:17-18,21-22,27-28,52,57,96,376,533-534).
const PRODUCT_ID = 1
const COMPANY_ID = 366
const FRANCHISE_ID = 1
const TYPE_OF_TRAVEL = 1          // 1 = Calm (doc:96)
const LOCALITY_COVERAGE = [208]   // 208 = Europe (Schengen) (doc:376)

// API her turist için date_birth ister (doc:30-33,61). DOB fiyatı CİDDİ etkiler
// (probe: bebek ×1.8, çocuk ×1.6, 18-65 baz, 75y ×1.3, 85y ×1.5) → gerçek akışta
// gerçek yolcu DOB'ları geçilir (InsuranceQuoteInput.tourists). Bu sabit yalnız
// DOB henüz yokken (opt-in Adım 2, passenger-details Adım 3 öncesi) fallback'tir.
const DEFAULT_TOURIST_DOB = '1990-01-01' // fallback — gerçek DOB yokken

function getInsursConfig(): { apiBase: string; apiKey: string } {
  // API Endpoint Base (doc:8); get_price tam yolu base + /services/api/get_price.
  const apiBase = process.env.INSURS_API_BASE ?? 'http://test-api.insurs.net/b1'
  const apiKey = process.env.INSURS_API_KEY
  if (!apiKey) throw new Error('[insurs] Missing INSURS_API_KEY')
  return { apiBase, apiKey }
}

export interface InsuranceQuoteInput {
  dateFrom: string      // YYYY-MM-DD
  dateTo: string        // YYYY-MM-DD (inclusive — ferry bitiş tarihi olduğu gibi; +1 EKLENMEZ)
  touristCount: number
  // Gerçek yolcu DOB'ları — fiyatı CİDDİ etkiler (bkz. getInsuranceQuote).
  // Verilmezse touristCount + DEFAULT_TOURIST_DOB fallback'ine düşülür.
  tourists?: Array<{ dateBirth: string }>
}

// get_offers coverage satırı (probe: 7=35000 EUR, 8=100000 EUR).
export interface InsuranceCoverage {
  coverageId: number     // coverage_id
  coverageValue: number  // coverage_value (teminat tutarı, EUR)
  currency: string       // currency (company 366 daima EUR)
}

export interface InsuranceTariff {
  coverageId: number     // get_offers coverage_id (UI ayrımı bununla)
  coverageValue: number  // get_offers coverage_value (35000/100000) — UI bunu gösterir
  tariffId: number       // doc:68,86 tariff_id (integer)
  tariffName: string     // doc:69,87 tariff_name (API "Standard" döner; UI'da gösterilmez)
  priceAmount: number    // doc:70,88 total_amount (A0: mock 0; EUR 1:1 kuralı sonra)
  sourceCurrency: string // doc:71,89 currency
}

// A0 mock — gerçek API ikisine de tariff_name "Standard" döner (probe teyidi);
// ayrım coverageValue ile (7=35k, 8=100k). Fiyat 0 (UI fiyat göstermez).
const MOCK_TARIFFS: InsuranceTariff[] = [
  { coverageId: 7, coverageValue: 35000,  tariffId: 7, tariffName: 'Standard', priceAmount: 0, sourceCurrency: 'EUR' },
  { coverageId: 8, coverageValue: 100000, tariffId: 8, tariffName: 'Standard', priceAmount: 0, sourceCurrency: 'EUR' },
]

/**
 * get_offers (probe teyidi) — mevcut coverage'ları döner. data BİR DİZİ:
 * [{ company_id, coverages_list:[{coverage_id, coverage_value, currency}], ... }].
 * company 366 → coverage 7=35000 EUR, 8=100000 EUR. Değerler hardcode DEĞİL,
 * runtime'dan alınır.
 */
export async function getOffers(): Promise<InsuranceCoverage[]> {
  const { apiBase, apiKey } = getInsursConfig()
  const res = await fetch(`${apiBase}/services/api/get_offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, product_id: PRODUCT_ID, currency: 'EUR' }),
  })
  if (!res.ok) throw new Error(`[insurs] get_offers HTTP ${res.status}`)

  const json = (await res.json()) as {
    success?: boolean
    data?: Array<{
      company_id: number
      coverages_list?: Array<{ coverage_id: number; coverage_value: number; currency: string }>
    }>
  }
  if (!json.success) throw new Error('[insurs] get_offers success=false')

  const company = (json.data ?? []).find((c) => c.company_id === COMPANY_ID) ?? json.data?.[0]
  return (company?.coverages_list ?? []).map((c) => ({
    coverageId: c.coverage_id,
    coverageValue: c.coverage_value,
    currency: c.currency,
  }))
}

/**
 * Quote akışı (flag açılınca): getOffers() → her coverage_id için get_price.
 * company 366 SADECE EUR döner (probe teyidi) → çeviri yok; currency!=='EUR'
 * yalnızca savunma amaçlı loglanır.
 * date_to inclusive; same-day (date_from==date_to) desteklenir (~1 günlük fiyat).
 * A0: USE_MOCK_QUOTE=true → gerçek fetch atlanır, MOCK_TARIFFS döner.
 */
export async function getInsuranceQuote(input: InsuranceQuoteInput): Promise<InsuranceTariff[]> {
  if (USE_MOCK_QUOTE) {
    // A0: gerçek API'ye gidilmez. Key + Auras cevabı gelince flag açılacak.
    return MOCK_TARIFFS
  }

  // --- Gerçek çağrı (A0'da DEVRE DIŞI; flag açılınca canlıya karşı test edilecek) ---
  const { apiBase, apiKey } = getInsursConfig()

  // 1) Mevcut coverage'ları al (coverage_id + coverage_value runtime'dan).
  const coverages = await getOffers()

  // 2) Turist DOB'ları: gerçek yolcular varsa onları kullan (fiyat DOB'a duyarlı:
  //    bebek ×1.8, çocuk ×1.6, 18-65 baz, 75y ×1.3, 85y ×1.5), yoksa fallback.
  const tourists = input.tourists?.length
    ? input.tourists.map((t) => ({ date_birth: t.dateBirth }))
    : Array.from({ length: input.touristCount }, () => ({ date_birth: DEFAULT_TOURIST_DOB }))

  // 3) Her coverage için ayrı get_price (coverage_id ZORUNLU — yoksa error_code 101).
  return Promise.all(
    coverages.map(async (cov) => {
      const res = await fetch(`${apiBase}/services/api/get_price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          product_id: PRODUCT_ID,
          company_id: COMPANY_ID,
          locality_coverage: LOCALITY_COVERAGE,
          additional_services: [],
          params: {
            date_from: input.dateFrom,
            date_to: input.dateTo,
            franchise_id: FRANCHISE_ID,
            type_of_travel: TYPE_OF_TRAVEL,
            currency: 'EUR',
            coverage_id: cov.coverageId,
            tourists,
          },
        }),
      })
      if (!res.ok) throw new Error(`[insurs] get_price HTTP ${res.status}`)

      const json = (await res.json()) as {
        success?: boolean
        data?: Array<{ tariff_id: number; tariff_name: string; total_amount: number | string; currency: string }>
      }
      if (!json.success) throw new Error('[insurs] get_price success=false')

      const row = json.data?.[0]
      if (!row) throw new Error(`[insurs] get_price no data for coverage ${cov.coverageId}`)
      if (row.currency !== 'EUR') {
        console.warn(`[insurs] tariff ${row.tariff_id} currency=${row.currency} shown EUR 1:1 (no conversion)`)
      }
      return {
        coverageId: cov.coverageId,
        coverageValue: cov.coverageValue,
        tariffId: row.tariff_id,
        tariffName: row.tariff_name,
        priceAmount: Number(row.total_amount),
        sourceCurrency: row.currency,
      }
    }),
  )
}

// ============================================================
// Kademe B — imza + TODO (gövde YOK). Param şekilleri PDF'ten.
// ============================================================

/** add_contract (doc §2, satır 380-467). order_id/police_num döner (doc:453-459). */
export interface AddContractInput {
  tariffId: number
  dateFrom: string
  dateTo: string
  insurer: { firstName: string; lastName: string; phone: string; email: string; dateBirth: string; passport: string }
  tourists: Array<{ firstName: string; lastName: string; dateBirth: string; passport: string }>
}
export interface AddContractResult { orderId: number; policeNum: string; totalAmount: number; currency: string }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function addContract(_input: AddContractInput): Promise<AddContractResult> {
  // TODO(Kademe B): doc:385-417 gövdesini POST et, doc:453-459 yanıtını eşle.
  throw new Error('[insurs] addContract — Kademe B (payment_id pending)')
}

/** confirm_contract (doc §3, satır 470-496). payment_id ZORUNLU (doc:479,490)
 *  → Viva ödeme kimliği (Kademe 4) gelene kadar çağrılamaz. */
export interface ConfirmContractInput { orderId: number; paymentId: number }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function confirmContract(_input: ConfirmContractInput): Promise<{ orderId: number }> {
  // TODO(Kademe B): doc:475-480 gövdesini POST et.
  throw new Error('[insurs] confirmContract — Kademe B (payment_id pending)')
}

/** get_print_form (doc §4, satır 503-527). Poliçe PDF buffer'ı; ödeme onayından sonra. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getPrintForm(_input: { orderId: number }): Promise<never> {
  // TODO(Kademe B): doc:507-523 — { "<buffer>": PDF } döner.
  throw new Error('[insurs] getPrintForm — Kademe B (payment_id pending)')
}
