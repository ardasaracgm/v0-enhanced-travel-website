import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { normalizeCar } from '@/lib/normalize-car'

// ============================================================
// TravelBeez · car-rental · müsaitlik / çakışma kontrolü
// ============================================================
// Bir aracın belirli tarih aralığında kaç adedinin boşta olduğunu
// server-side hesaplar. Client'a yalnızca sonuç döner; envanter
// kararı asla client'ta verilmez.
//
// Çakışma modeli: her booking [start_date, end_date] KAPALI aralık
// (iki uç da dahil). pickup + (days-1) = son dolu gün.
// İki kapalı aralık çakışır ⇔ start <= pEnd AND end >= pStart.
// (daterange && operatörü supabase-js sorgu kurucusuyla ifade
//  edilemediği için skaler eşdeğerine çevrildi — anlamı aynı.)
// ============================================================

// 'held' rezervasyonun ömrü: bundan eski held kayıtları (ödenmemiş
// sepet) çakışma sayılmaz, adedi serbest bırakır.
const HOLD_EXPIRY_MINUTES = 10

// Aktif booking filtresi (or-string): confirmed VEYA süresi dolmamış held.
// TEK KAYNAK — getAvailableQuantity + getAvailabilityForDates + getAvailabilityCalendar
// üçü de bunu kullanır (predicate kopyası yok). holdThreshold her çağrıda "now".
function buildActiveBookingOrFilter(): string {
  const holdThreshold = new Date(Date.now() - HOLD_EXPIRY_MINUTES * 60_000).toISOString()
  return `state.eq.confirmed,and(state.eq.held,created_at.gt.${holdThreshold})`
}

// YYYY-MM-DD + gün → YYYY-MM-DD (UTC, saat yok). luggage-pricing ile
// aynı UTC-epoch kalıbı; yerel TZ kaymasına kapalı.
export function addDaysUtc(dateStr: string, add: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!m) throw new RangeError(`car-availability: invalid date "${dateStr}", expected YYYY-MM-DD`)
  const base = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const d = new Date(base + add * 86_400_000)
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${d.getUTCFullYear()}-${mm}-${dd}`
}

// Kapalı aralığın son (dahil) günü: pickup + (days-1). TEK KAYNAK —
// submit-booking car_bookings.end_date'i de buradan türetir (DRY).
export function computeEndDate(pickup: string, days: number): string {
  return addDaysUtc(pickup, days - 1)
}

// İki YYYY-MM-DD arası tam-gün farkı (UTC). windowStart=0 referansıyla gün index'i.
// normalize-car dateDiffInDays ile AYNI sonuç (her ikisi de UTC-gece-yarısı epoch farkı).
function dayIndexUtc(windowStart: string, date: string): number {
  const a = Date.UTC(+windowStart.slice(0, 4), +windowStart.slice(5, 7) - 1, +windowStart.slice(8, 10))
  const b = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10))
  return Math.round((b - a) / 86_400_000)
}

export async function getAvailableQuantity(
  carId: string,
  pickupDate: string,
  days: number,
): Promise<number> {
  if (!Number.isInteger(days) || days < 1) {
    throw new RangeError(`car-availability: days must be a positive integer, got ${days}`)
  }
  const supabase = getSupabaseAdmin()

  // Kapalı aralığın son günü: pickup + (days-1).
  const endDate = computeEndDate(pickupDate, days)

  // 1) Aracın toplam adedi.
  const { data: car, error: carErr } = await supabase
    .from('cars')
    .select('quantity')
    .eq('id', carId)
    .maybeSingle()
  if (carErr) throw carErr
  const quantity = Number(car?.quantity ?? 0)
  if (quantity <= 0) return 0

  // 2) Çakışan booking sayısı.
  //    state='confirmed' VEYA (state='held' ve süresi dolmamış)
  //    Çakışma: start_date <= endDate AND end_date >= pickupDate
  const { count, error: bookErr } = await supabase
    .from('car_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('car_id', carId)
    .lte('start_date', endDate)
    .gte('end_date', pickupDate)
    .or(buildActiveBookingOrFilter())
  if (bookErr) throw bookErr

  return Math.max(0, quantity - (count ?? 0))
}

export async function isAvailable(
  carId: string,
  pickupDate: string,
  days: number,
): Promise<boolean> {
  return (await getAvailableQuantity(carId, pickupDate, days)) > 0
}

// Tüm araçların müsait adedini TEK turda hesaplar (liste UX için). Per-araç
// getAvailableQuantity ile AYNI overlap + state kuralı; sadece toplu sorgu.
// Dönen Record her aracın id'sini içerir: { [carId]: kalan_adet }.
export async function getAvailabilityForDates(
  pickupDate: string,
  days: number,
): Promise<Record<string, number>> {
  if (!Number.isInteger(days) || days < 1) {
    throw new RangeError(`car-availability: days must be a positive integer, got ${days}`)
  }
  const supabase = getSupabaseAdmin()

  // computeEndDate → addDaysUtc pickupDate formatını da doğrular (YYYY-MM-DD).
  const endDate = computeEndDate(pickupDate, days)

  // 1) Tüm araçların toplam adedi.
  const { data: cars, error: carsErr } = await supabase
    .from('cars')
    .select('id, quantity')
  if (carsErr) throw carsErr

  // 2) Çakışan + aktif TÜM booking'ler tek sorguda (per-araç ile aynı predicate).
  const { data: bookings, error: bookErr } = await supabase
    .from('car_bookings')
    .select('car_id')
    .lte('start_date', endDate)
    .gte('end_date', pickupDate)
    .or(buildActiveBookingOrFilter())
  if (bookErr) throw bookErr

  // 3) car_id'ye göre çakışmayı say.
  const usedByCar = new Map<string, number>()
  for (const b of bookings ?? []) {
    usedByCar.set(b.car_id, (usedByCar.get(b.car_id) ?? 0) + 1)
  }

  const result: Record<string, number> = {}
  for (const car of cars ?? []) {
    const quantity = Number(car.quantity ?? 0)
    result[car.id] = Math.max(0, quantity - (usedByCar.get(car.id) ?? 0))
  }
  return result
}

export interface CarCalendarRow {
  id: string
  name: string
  quantity: number
  remainingByDay: number[] // days[] ile aynı sıra; remaining = quantity − used
}
export interface AvailabilityCalendar {
  days: string[] // YYYY-MM-DD, windowStart..+numDays-1
  cars: CarCalendarRow[]
}

// Aylık takvim için TEK pencere sorgusu (gün başına 30 çağrı DEĞİL). Tüm çakışan
// aktif booking'leri bir kez çeker, bellekte gün-gün dağıtır. Overlap + aktiflik
// kuralı getAvailabilityForDates ile AYNI (buildActiveBookingOrFilter paylaşımı).
export async function getAvailabilityCalendar(
  windowStart: string,
  numDays = 30,
): Promise<AvailabilityCalendar> {
  if (!Number.isInteger(numDays) || numDays < 1) {
    throw new RangeError(`car-availability: numDays must be a positive integer, got ${numDays}`)
  }
  const supabase = getSupabaseAdmin()

  // Pencere günleri (addDaysUtc windowStart formatını da YYYY-MM-DD doğrular).
  const days: string[] = []
  for (let i = 0; i < numDays; i++) days.push(addDaysUtc(windowStart, i))
  const windowEnd = days[days.length - 1]

  // 1) Filo (admin: available filtresi YOK). normalizeCar flat/specs iki şekli de çözer.
  const { data: cars, error: carsErr } = await supabase
    .from('cars')
    .select('*')
    .order('price_per_day', { ascending: true })
  if (carsErr) throw carsErr

  // 2) Pencereyle çakışan + aktif TÜM booking'ler — TEK sorgu.
  //    overlap: start_date <= windowEnd AND end_date >= windowStart.
  const { data: bookings, error: bookErr } = await supabase
    .from('car_bookings')
    .select('car_id, start_date, end_date')
    .lte('start_date', windowEnd)
    .gte('end_date', windowStart)
    .or(buildActiveBookingOrFilter())
  if (bookErr) throw bookErr

  // 3) Gün-gün dağıt. Pencereyi TAŞAN booking'ler clamp'lenir:
  //    start<windowStart → 0'dan, end>windowEnd → numDays-1'e kadar (kenar doğru).
  const usedByCar = new Map<string, number[]>()
  for (const b of bookings ?? []) {
    let arr = usedByCar.get(b.car_id)
    if (!arr) {
      arr = new Array(numDays).fill(0)
      usedByCar.set(b.car_id, arr)
    }
    const startIdx = Math.max(0, dayIndexUtc(windowStart, b.start_date))
    const endIdx = Math.min(numDays - 1, dayIndexUtc(windowStart, b.end_date))
    for (let i = startIdx; i <= endIdx; i++) arr[i]++
  }

  const rows: CarCalendarRow[] = (cars ?? []).map((c: Record<string, unknown>) => {
    const quantity = Number(c.quantity ?? 0)
    const used = usedByCar.get(c.id as string)
    const remainingByDay = days.map((_, i) => Math.max(0, quantity - (used ? used[i] : 0)))
    return { id: c.id as string, name: normalizeCar(c).model, quantity, remainingByDay }
  })

  return { days, cars: rows }
}
