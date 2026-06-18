// ============================================================
// TravelBeez · transfer · bölge/rota/araç tarifeleri — TEK KAYNAK
// ============================================================
// server-only DEĞİL: hem server (transfer-pricing cents toplar) hem client
// (transfer kartı display + gate availability) buradan okur. Sunucu yine
// authoritative — client'ın gösterdiği fiyat yalnız görüntüdür.
//
// Veri-güdümlü: yeni transfer firması = yeni region anahtarı; yeni araç =
// vehicles[] satırı; yeni rota = routes[] satırı. KOD DEĞİŞMEZ. Şekil ileride
// DB satırına uyacak (partner-admin Kademe 5 geçişini kırmadan).
//
// Fiyatlar CENTS (EUR). Kaynak: docs/handover/FERİBOT TRANSFER.xlsx —
// "BODRUM TRANSFER FİYAT LİSTESİ" (1 May 2026–15 Eki 2026; KDV HARİÇ).
// Araç kapasiteleri sayfada yok — operasyonel değer (Vito 7, Sprinter 16).
// ============================================================

export const TRANSFER_REGIONS = {
  bodrum: {
    operator: 'Milas Transfer',
    pickupLabel: 'Bodrum Merkez',
    vehicles: [
      { id: 'vito',     label: 'Mercedes Vito (VIP)', capacity: 7 },
      { id: 'sprinter', label: 'Mercedes Sprinter',   capacity: 16 },
    ],
    routes: [
      { id: 'akyarlar',    label: 'Akyarlar',                      prices: { vito: 3750, sprinter: 4700 } },
      { id: 'bitez',       label: 'Bitez',                         prices: { vito: 2800, sprinter: 3750 } },
      { id: 'ciftlik',     label: 'Çiftlik Mahallesi',             prices: { vito: 2800, sprinter: 3750 } },
      { id: 'gulluk',      label: 'Güllük',                        prices: { vito: 4200, sprinter: 5000 } },
      { id: 'gumbet',      label: 'Gümbet',                        prices: { vito: 2800, sprinter: 3300 } },
      { id: 'gumusluk',    label: 'Gümüşlük',                      prices: { vito: 3300, sprinter: 3750 } },
      { id: 'gundogan',    label: 'Gündoğan',                      prices: { vito: 2800, sprinter: 3750 } },
      { id: 'guvercinlik', label: 'Güvercinlik',                   prices: { vito: 2800, sprinter: 3750 } },
      { id: 'ortakent',    label: 'Ortakent Yahşi',                prices: { vito: 3300, sprinter: 3750 } },
      { id: 'torba',       label: 'Torba',                         prices: { vito: 2500, sprinter: 3300 } },
      { id: 'turgutreis',  label: 'Turgutreis',                    prices: { vito: 3750, sprinter: 4200 } },
      { id: 'turkbuku',    label: 'Türkbükü',                      prices: { vito: 3750, sprinter: 4200 } },
      { id: 'yalikavak',   label: 'Yalıkavak',                     prices: { vito: 3750, sprinter: 4200 } },
      { id: 'bjv',         label: 'Bodrum-Milas Havalimanı (BJV)', prices: { vito: 4700, sprinter: 5600 } },
    ],
  },
} as const

export type TransferRegionId = keyof typeof TRANSFER_REGIONS
