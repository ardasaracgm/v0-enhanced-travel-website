import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireFullAdmin } from '@/lib/auth/require-admin'
import { getAvailabilityForDates, computeEndDate, addDaysUtc, getAvailabilityCalendar } from '@/lib/car-availability'
import type { AvailabilityCalendar as CalData } from '@/lib/car-availability'
import { normalizeCar, dateDiffInDays } from '@/lib/normalize-car'
import { Link } from '@/i18n/routing'
import { AvailabilityCalendar } from '@/components/admin/availability-calendar'
import { CarFleetTable, type ModelGroup } from '@/components/admin/car-fleet-table'
import { AddCarForm } from '@/components/admin/add-car-form'

export const dynamic = 'force-dynamic'

// İki YYYY-MM-DD'den geç olanı (lexicographic = kronolojik). Prev clamp için.
function maxStr(a: string, b: string): string {
  return a >= b ? a : b
}

export default async function AdminCarsPage({
  searchParams,
}: {
  searchParams: Promise<{ pickup?: string; dropoff?: string; start?: string }>
}) {
  const { pickup: pickupParam, dropoff: dropoffParam, start: startParam } = await searchParams

  // cars_only bu sayfaya GİREBİLİR ama rezervasyon AÇAMAZ (walk-in → /admin/trips/*
  // full-admin gerektirir). Rezervasyon linklerini gizle — enforcement zaten
  // trips/new notFound + createReservation gate'inde; bu yalnız UX temizliği.
  const canReserve = (await requireFullAdmin()).ok

  // Atina günü = public car-rental sayfasıyla aynı (page.tsx:102).
  const todayAthens = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })

  // ── Takvim 30-gün kayan pencere. start default bugün; geçmişe + geçersize karşı clamp.
  //    GÜVENLİK: ?start=garbage lexicographic'te bugünü geçebilir → addDaysUtc throw eder;
  //    regex guard ile geçersiz/geçmiş start sessizce bugüne düşer (sayfa patlamaz).
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
  const WINDOW = 30
  const start = startParam && DATE_RE.test(startParam) && startParam >= todayAthens ? startParam : todayAthens
  const prevStart = start > todayAthens ? maxStr(todayAthens, addDaysUtc(start, -WINDOW)) : null
  const nextStart = addDaysUtc(start, WINDOW)

  let calendar: CalData | null = null
  let calErr: string | null = null
  try {
    calendar = await getAvailabilityCalendar(start, WINDOW)
  } catch (e) {
    calErr = e instanceof Error ? e.message : 'Calendar failed'
  }
  // Default GEÇERLİ aralık: bugün → bugün+2 (3 gün). computeEndDate(today,3)=today+2.
  const pickup = pickupParam || todayAthens
  const dropoff = dropoffParam || computeEndDate(todayAthens, 3)

  // validRange = public sayfa mantığı (page.tsx:113-115): bırakış alıştan ÖNCE olamaz;
  // aynı gün (diff 0) geçerli → days = diff+1. Geçersizse motoru ÇAĞIRMA (days<1 throw eder).
  const validRange = !!pickup && !!dropoff && dateDiffInDays(pickup, dropoff) >= 0
  const days = validRange ? dateDiffInDays(pickup, dropoff) + 1 : 0

  // Tüm filo — `available` filtresi YOK (admin envanteri, public'ten farkı bu).
  // select('*') public getAvailableCars ile aynı (supabase.ts:569); quantity/location 013 flat kolonları.
  const supabase = getSupabaseAdmin()
  const { data: rawCars, error: carsErr } = await supabase
    .from('cars')
    .select('*')
    .order('price_per_day', { ascending: true })

  // Müsaitlik motoru server-only; RSC doğrudan çağırır (client köprüsü checkCarAvailability'e gerek yok).
  let availability: Record<string, number> | null = null
  let availErr: string | null = null
  if (validRange) {
    try {
      availability = await getAvailabilityForDates(pickup, days)
    } catch (e) {
      availErr = e instanceof Error ? e.message : 'Availability failed'
    }
  }

  // Plakalar model_key havuzlarına gruplanır (retired hariç). Havuz başlık satırı +
  // plaka alt-satırları. remaining = havuzdaki müsait aktif plaka sayısı (motordan).
  const groupMap = new Map<string, ModelGroup>()
  for (const c of rawCars ?? []) {
    if ((c.status as string) === 'retired') continue
    const key = (c.model_key as string) || (c.id as string)
    let g = groupMap.get(key)
    if (!g) {
      g = {
        modelKey: key,
        label: normalizeCar(c).model,
        category: (c.category as string) || '—',
        price: Number.POSITIVE_INFINITY, // havuzdaki min ile doldurulur (aşağıda)
        plateCount: 0,
        remaining: 0,
        plates: [],
      }
      groupMap.set(key, g)
    }
    const status: 'active' | 'maintenance' =
      (c.status as string) === 'maintenance' ? 'maintenance' : 'active'
    const rem = availability ? (availability[c.id as string] ?? 0) : status === 'active' ? 1 : 0
    g.plates.push({
      id: c.id as string,
      plate: (c.plate as string) || '—',
      model: normalizeCar(c).model,
      priority: Number(c.priority ?? 1),
      status,
      comingSoon: c.coming_soon === true,
      remaining: rem,
    })
    g.plateCount += 1
    g.remaining += rem
    // Havuz fiyatı = min(price_per_day) — public car-rental de .order(asc) ile en
    // düşük plakayı temsilci tutuyor; admin gösterimi public ile birebir olsun.
    const rowPrice = Number(c.price_per_day) || 0
    if (rowPrice > 0) g.price = Math.min(g.price, rowPrice)
  }
  const groups = [...groupMap.values()]
  for (const g of groups) {
    if (!Number.isFinite(g.price)) g.price = 0 // fiyatsız havuz (olmamalı) → 0
    g.plates.sort((a, b) => a.priority - b.priority || a.plate.localeCompare(b.plate))
  }
  groups.sort((a, b) => a.label.localeCompare(b.label))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Car Availability</h1>
        {canReserve && (
          <Link
            href={`/admin/trips/new?pickup=${pickup}&dropoff=${dropoff}`}
            className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            + New reservation
          </Link>
        )}
      </div>

      {/* ── Yeni araç ekle (aktif plaka insert; envanter yaşam döngüsünün "ekle" ucu) ── */}
      <AddCarForm />

      {/* ── Aylık dolu/boş takvim (30-gün pencere, seçimsiz default) ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {start} → {addDaysUtc(start, WINDOW - 1)} · {WINDOW} days
          </p>
          <div className="flex gap-2">
            {prevStart ? (
              <Link
                href={`/admin/cars?start=${prevStart}`}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              >
                ← Prev
              </Link>
            ) : (
              <span className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground opacity-50">
                ← Prev
              </span>
            )}
            <Link
              href={`/admin/cars?start=${nextStart}`}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Next →
            </Link>
          </div>
        </div>
        {calErr ? (
          <p className="text-sm text-destructive">Calendar failed: {calErr}</p>
        ) : calendar ? (
          <AvailabilityCalendar data={calendar} today={todayAthens} canReserve={canReserve} />
        ) : null}
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-500/40" />
            Free
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-amber-500/40" />
            Partial
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-red-500/40" />
            Full
          </span>
        </div>
      </section>

      {/* ── Mevcut tek-aralık checker (aynen korunur, ALTTA) ── */}
      {/* Tarih aralığı — düz GET form (RSC, client JS yok); searchParams'ı besler. */}
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="pickup" className="text-xs uppercase tracking-wide text-muted-foreground">
            Pickup
          </label>
          <input
            id="pickup"
            name="pickup"
            type="date"
            defaultValue={pickup}
            min={todayAthens}
            max="2099-12-31"
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dropoff" className="text-xs uppercase tracking-wide text-muted-foreground">
            Dropoff
          </label>
          <input
            id="dropoff"
            name="dropoff"
            type="date"
            defaultValue={dropoff}
            min={pickup}
            max="2099-12-31"
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
        </div>
        <button
          type="submit"
          className="h-10 rounded-md border px-4 text-sm font-medium hover:bg-muted"
        >
          Update
        </button>
      </form>

      {!validRange ? (
        <p className="text-sm text-destructive">
          Invalid date range — dropoff cannot be before pickup.
        </p>
      ) : carsErr ? (
        <p className="text-sm text-destructive">Failed to load cars: {carsErr.message}</p>
      ) : availErr ? (
        <p className="text-sm text-destructive">Availability failed: {availErr}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {pickup} → {dropoff} · {days} days
          </p>
          <CarFleetTable groups={groups} pickup={pickup} dropoff={dropoff} canReserve={canReserve} />
        </>
      )}
    </div>
  )
}
