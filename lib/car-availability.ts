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

// Bir plaka tek birimdir: müsait "adet" 1 (boşta) ya da 0 (maintenance/retired veya
// tarih çakışması). quantity kolonu ARTIK OKUNMAZ — kapasite status'tan gelir.
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

  // 1) Plakanın durumu. Yalnız 'active' kiralanabilir; maintenance/retired → 0.
  const { data: car, error: carErr } = await supabase
    .from('cars')
    .select('status')
    .eq('id', carId)
    .maybeSingle()
  if (carErr) throw carErr
  if (!car || car.status !== 'active') return 0

  // 2) Çakışan aktif booking var mı? state='confirmed' VEYA süresi dolmamış 'held'.
  //    Çakışma: start_date <= endDate AND end_date >= pickupDate. Tek plaka → ≥1 = dolu.
  const { count, error: bookErr } = await supabase
    .from('car_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('car_id', carId)
    .lte('start_date', endDate)
    .gte('end_date', pickupDate)
    .or(buildActiveBookingOrFilter())
  if (bookErr) throw bookErr

  return count && count > 0 ? 0 : 1
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

  // 1) retired HARİÇ tüm plakalar + durumları (quantity okunmaz; plaka = 1 birim).
  const { data: cars, error: carsErr } = await supabase
    .from('cars')
    .select('id, status')
    .neq('status', 'retired')
  if (carsErr) throw carsErr

  // 2) Çakışan + aktif TÜM booking'ler tek sorguda (per-plaka ile aynı predicate).
  const { data: bookings, error: bookErr } = await supabase
    .from('car_bookings')
    .select('car_id')
    .lte('start_date', endDate)
    .gte('end_date', pickupDate)
    .or(buildActiveBookingOrFilter())
  if (bookErr) throw bookErr

  // 3) Dolu plakalar (≥1 aktif çakışan booking).
  const busy = new Set<string>()
  for (const b of bookings ?? []) busy.add(b.car_id)

  // 4) Plaka müsait ⇔ status='active' ve dolu değil → 1, aksi halde 0.
  //    maintenance plakalar 0 döner (listede ama kiralanamaz).
  const result: Record<string, number> = {}
  for (const car of cars ?? []) {
    result[car.id] = car.status === 'active' && !busy.has(car.id) ? 1 : 0
  }
  return result
}

// Havuz (model_key) başına müsait aktif plaka SAYISI. Public listeleme model_key
// kart başına tek satır gösterir; bu sayı o modelin kaç plakasının boşta olduğudur.
export async function getModelAvailability(
  pickupDate: string,
  days: number,
): Promise<Record<string, number>> {
  if (!Number.isInteger(days) || days < 1) {
    throw new RangeError(`car-availability: days must be a positive integer, got ${days}`)
  }
  const supabase = getSupabaseAdmin()
  const endDate = computeEndDate(pickupDate, days)

  const { data: cars, error: carsErr } = await supabase
    .from('cars')
    .select('id, model_key')
    .eq('status', 'active')
  if (carsErr) throw carsErr

  const { data: bookings, error: bookErr } = await supabase
    .from('car_bookings')
    .select('car_id')
    .lte('start_date', endDate)
    .gte('end_date', pickupDate)
    .or(buildActiveBookingOrFilter())
  if (bookErr) throw bookErr

  const busy = new Set((bookings ?? []).map((b) => b.car_id))
  const result: Record<string, number> = {}
  for (const c of cars ?? []) {
    if (!c.model_key) continue
    result[c.model_key] = (result[c.model_key] ?? 0) + (busy.has(c.id) ? 0 : 1)
  }
  return result
}

// SIRALI ATAMA: bir model_key havuzunda, status='active' ve tarih çakışması olmayan
// plakalardan EN DÜŞÜK priority'liyi seçer (eşitlikte id ile deterministik). Boşta
// plaka yoksa null. Müşteri model_key seçer; sunucu burada somut plakayı atar (Parça 4).
export async function assignPlate(
  modelKey: string,
  pickupDate: string,
  days: number,
): Promise<string | null> {
  if (!Number.isInteger(days) || days < 1) {
    throw new RangeError(`car-availability: days must be a positive integer, got ${days}`)
  }
  const supabase = getSupabaseAdmin()
  const endDate = computeEndDate(pickupDate, days)

  const { data: plates, error: platesErr } = await supabase
    .from('cars')
    .select('id, priority')
    .eq('model_key', modelKey)
    .eq('status', 'active')
    .order('priority', { ascending: true })
    .order('id', { ascending: true })
  if (platesErr) throw platesErr
  if (!plates?.length) return null

  const { data: bookings, error: bookErr } = await supabase
    .from('car_bookings')
    .select('car_id')
    .in('car_id', plates.map((p) => p.id))
    .lte('start_date', endDate)
    .gte('end_date', pickupDate)
    .or(buildActiveBookingOrFilter())
  if (bookErr) throw bookErr

  const busy = new Set((bookings ?? []).map((b) => b.car_id))
  for (const p of plates) if (!busy.has(p.id)) return p.id // priority sırasıyla ilk boş
  return null
}

export interface CarCalendarRow {
  id: string
  name: string
  quantity: number // plaka kapasitesi: 1 (active) / 0 (maintenance). quantity kolonu DEĞİL.
  remainingByDay: number[] // days[] ile aynı sıra; remaining = capacity − used
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

  // 1) Filo — retired HARİÇ (maintenance görünür, kiralanamaz). normalizeCar iki şekli çözer.
  const { data: cars, error: carsErr } = await supabase
    .from('cars')
    .select('*')
    .neq('status', 'retired')
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
    // Kapasite plaka başına 1 (active) / 0 (maintenance) — quantity OKUNMAZ.
    const capacity = c.status === 'active' ? 1 : 0
    const used = usedByCar.get(c.id as string)
    const remainingByDay = days.map((_, i) => Math.max(0, capacity - (used ? used[i] : 0)))
    return { id: c.id as string, name: normalizeCar(c).model, quantity: capacity, remainingByDay }
  })

  return { days, cars: rows }
}
