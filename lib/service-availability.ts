/**
 * Service availability by destination island — single source.
 * ===========================================================
 * Hangi ekstra hizmet hangi varış adasında sunulur. Extras gate'i (ve sepet
 * temizliği) BURADAN sorar — dağınık `if (to === 'kos')` yok.
 *
 * Anahtar = searchParams.to (LOWERCASE port kodu: 'kos'/'rhodes'/'samos').
 * Değer = 'all' (her destinasyon) | string[] (yalnız bu port kodları).
 *
 * Genişletme: yeni ada = diziye port kodu ekle; yeni hizmet = yeni anahtar.
 * Kod değişmez. Ferry API (Kademe 7) gerçek port kodlarını getirince buraya.
 */

// Gate edilen hizmetler (değerler TripItemType ile aynı string'ler).
export type GateableService = 'car_rental' | 'luggage' | 'insurance' | 'esim'

export const SERVICE_AVAILABILITY: Record<GateableService, 'all' | readonly string[]> = {
  car_rental: ['kos'], // araç filosu yalnız Kos'ta
  luggage:    ['kos'], // emanet ofisi yalnız Kos'ta
  insurance:  'all',   // poliçe destinasyondan bağımsız (insurance kartı feat/insurance-auras'ta)
  esim:       'all',   // e-SIM destinasyondan bağımsız (kart henüz yok — ileri uyum)
}

/** destination = searchParams.to. 'all' olmayan hizmet, listede yoksa gizli. */
export function isServiceAvailable(service: GateableService, destination: string): boolean {
  const rule = SERVICE_AVAILABILITY[service]
  if (rule === 'all') return true
  return rule.includes(destination.toLowerCase())
}
