/**
 * Service visual resolver — maps a BookingItem to its checkout thumbnail + a
 * pastel tone token. Pure & client-safe (resolvePort is isomorphic). Returns a
 * `tone` token, NOT a Tailwind class: tailwind.config content does not scan
 * lib/, so the bg class literals must live in the consuming component.
 *
 * Görsel mantığı summarizeItem'a EKLENMEZ (confirmation/breakdown'a sızmasın) —
 * yalnız checkout satır render'ı tüketir.
 */
import { resolvePort } from '@/lib/ferry/ports'
import type { BookingItem } from '@/lib/booking-context'

export type ServiceTone = 'ferry' | 'transfer' | 'car' | 'luggage' | 'none'

export interface ServiceVisual {
  /** public/ image path; null → no thumbnail (insurance/unknown/eksik asset). */
  src: string | null
  /** Tek seferlik degrade hedefi (car: koscar). onError'da consumer swap eder. */
  fallbackSrc?: string
  /** Generic alt; render localized row.title'ı tercih edebilir. */
  alt: string
  /** Pastel zemin token'ı → class consumer'da çözülür. */
  tone: ServiceTone
}

export function serviceVisual(item: BookingItem): ServiceVisual {
  switch (item.type) {
    case 'ferry': {
      // from/to canonical slug (FerryPort.id) → resolvePort → TR/GR.
      const a = resolvePort(item.ferry.from.id)?.country
      const b = resolvePort(item.ferry.to.id)?.country
      const src =
        a && b ? `/services/ferry-${a.toLowerCase()}-${b.toLowerCase()}.webp` : null
      return { src, alt: 'Ferry', tone: 'ferry' }
    }
    case 'transfer': {
      // İlk dolu bacaktan araç tipi (round-trip iki bacak aynı bölge).
      const v = item.outbound?.vehicleId ?? item.return?.vehicleId
      return { src: transferVehicleVisual(v), alt: 'Transfer', tone: 'transfer' }
    }
    case 'car_rental':
      return {
        src: item.modelKey ? `/cars/${item.modelKey}.webp` : '/cars/koscar.webp',
        fallbackSrc: '/cars/koscar.webp',
        alt: 'Car rental',
        tone: 'car',
      }
    case 'luggage': {
      // Aktif boyutlar (adet>0) → tek boyut tekil görsel, 2+ karışık. extras kartı
      // local state'ten, bu dal item.counts'tan aynı luggageVisual'ı tüketir.
      // counts tipte zorunlu ama sessionStorage hydrasyonu bozuk veri üretebilir:
      // defansif (?.[s] ?? 0) → counts eksikse aktif yok → null → tone korunur, crash yok.
      const c = item.counts
      const active = (['small', 'medium', 'large'] as const).filter(s => (c?.[s] ?? 0) > 0)
      return { src: luggageVisual(active), alt: 'Luggage storage', tone: 'luggage' }
    }
    case 'insurance':
    default:
      // insurance + ileride eklenecek tipler: görsel yok, mevcut zemin korunur.
      return { src: null, alt: '', tone: 'none' }
  }
}

// Transfer thumbnail path'i — seçili araç tipinden (vito/sprinter) türer.
// Hem checkout serviceVisual transfer dalı (item bacağından) hem extras kartı
// (local seçim state'inden) tek kaynaktan tüketir. Salt path mantığı.
// isOpen=false → kapalı kapı görseli (default); true → açık kapı (hero hover vb.).
export function transferVehicleVisual(
  vehicleId: string | null | undefined,
  isOpen = false,
): string | null {
  return vehicleId === 'vito' || vehicleId === 'sprinter'
    ? `/services/transfer-${vehicleId}-${isOpen ? 'open' : 'close'}.webp`
    : null
}

// Luggage thumbnail path'i — aktif boyutlardan (adet>0) türer. 0 boyut→null
// (görsel gizli), tek boyut→o boyutun görseli, 2+ →karışık sizes.webp. Hem extras
// kartı (local counts) hem serviceVisual luggage dalı (item.counts) tek kaynaktan.
export function luggageVisual(activeSizes: readonly string[]): string | null {
  if (activeSizes.length === 0) return null
  if (activeSizes.length === 1) return `/services/luggage-${activeSizes[0]}.webp`
  return '/services/luggage-sizes.webp'
}
