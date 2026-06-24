import type { Car as CarType } from '@/lib/supabase'

export interface NormalizedCar {
  id: string
  type: string
  model: string
  modelKey?: string      // cars.model_key — havuz anahtarı (seçim/dispatch için)
  price: number          // price per day
  image: string
  features: string[]
  specs: {
    fuel: string
    seats: number | string
    transmission: string
    ac: boolean | string
  }
  badge?: string
  description?: string
  available: boolean
  comingSoon: boolean
}

/**
 * Returns the number of whole calendar days between two YYYY-MM-DD strings.
 * dateDiffInDays('2026-07-10', '2026-07-17') === 7
 * Same-day returns 0 (callers should Math.max(1, …) as needed).
 */
export function dateDiffInDays(fromDate: string, toDate: string): number {
  return Math.round((Date.parse(toDate) - Date.parse(fromDate)) / (1000 * 60 * 60 * 24))
}

function getValue(obj: unknown, key: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined
  return (obj as Record<string, unknown>)[key]
}

export function normalizeCar(car: CarType | Record<string, unknown>): NormalizedCar {
  const carRecord = car as Record<string, unknown>

  const rawSpecs = carRecord.specs
  const validSpecs =
    rawSpecs && typeof rawSpecs === 'object' && !Array.isArray(rawSpecs)
      ? (rawSpecs as { fuel?: string; seats?: number | string; transmission?: string; ac?: boolean | string })
      : null

  const getString = (key: string, fallback = '') => {
    const value = carRecord[key]
    return value === null || value === undefined ? fallback : String(value)
  }

  const getNumber = (key: string, fallback = 0) => {
    const value = carRecord[key]
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : fallback
    }
    return fallback
  }

  const fuel = validSpecs?.fuel
    ? String(validSpecs.fuel)
    : getString('fuel_type', getString('category', 'Petrol'))

  const rawSeats =
    validSpecs && (typeof validSpecs.seats === 'number' || typeof validSpecs.seats === 'string')
      ? validSpecs.seats
      : getValue(car, 'seats') ?? 4

  const seats: string | number =
    typeof rawSeats === 'number' || typeof rawSeats === 'string' ? rawSeats : 4

  const transmission = validSpecs?.transmission
    ? String(validSpecs.transmission)
    : getString('transmission', 'Manual')

  const brand = getString('brand')
  const model = getString('model', 'Unknown')
  const displayName = brand && model ? `${brand} ${model}` : model

  // Real DB column is price_per_day; fall back to price for static / legacy data
  const price = getNumber('price_per_day') || getNumber('price') || 0

  // Resim: model_key varsa convention ile /cars/<model_key>.webp (yeni filo, repo'da
  // versiyonlu — public/cars/). model_key yoksa (fallback filo) eski image_url/image →
  // Unsplash default'a düşülür.
  const modelKey = getString('model_key')
  const image = modelKey
    ? `/cars/${modelKey}.webp`
    : getString('image_url') ||
      getString('image') ||
      'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80'

  return {
    id: getString('id'),
    type: getString('category', getString('type', 'Car')),
    model: displayName,
    modelKey: modelKey || undefined,
    price,
    image,
    features: [fuel, `${seats} Seats`, transmission],
    specs: {
      fuel,
      seats,
      transmission,
      ac: validSpecs?.ac ?? true,
    },
    badge: getString('badge') || undefined,
    description: getString('description') || 'Reliable vehicle for exploring Kos Island.',
    available: carRecord.available !== false,
    comingSoon: carRecord.coming_soon === true,
  }
}

// Plakaları model_key havuzuna indir: kart başına tek model. Temsilci = ilk plaka
// (fiyat/özellik havuz içinde aynı). Dönen kartın `id` alanı model_key TAŞIR →
// downstream seçim/dispatch/availability anahtarı model_key olur. model_key'i
// olmayan satır (fallback filo) kendi id'siyle ayrı kart kalır.
export function groupByModelKey(cars: NormalizedCar[]): NormalizedCar[] {
  const seen = new Map<string, NormalizedCar>()
  for (const c of cars) {
    const key = c.modelKey || c.id
    if (!seen.has(key)) seen.set(key, { ...c, id: key })
  }
  return [...seen.values()]
}
