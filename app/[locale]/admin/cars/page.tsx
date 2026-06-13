import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getAvailabilityForDates, computeEndDate, addDaysUtc, getAvailabilityCalendar } from '@/lib/car-availability'
import type { AvailabilityCalendar as CalData } from '@/lib/car-availability'
import { normalizeCar, dateDiffInDays } from '@/lib/normalize-car'
import { Link } from '@/i18n/routing'
import { AvailabilityCalendar } from '@/components/admin/availability-calendar'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

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

  // occupied = total − remaining. remaining motorun otoritesi (her car için döner, :126-129).
  // İsim = normalizeCar(...).model (brand+model birleşik; NormalizedCar'da displayName YOK, :90).
  const rows = (rawCars ?? []).map((c: Record<string, unknown>) => {
    const total = Number(c.quantity ?? 0)
    const remaining = availability ? (availability[c.id as string] ?? total) : total
    return {
      id: c.id as string,
      name: normalizeCar(c).model,
      location: (c.location as string) || '—',
      total,
      occupied: Math.max(0, total - remaining),
      remaining,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Car Availability</h1>
        <Link
          href={`/admin/trips/new?pickup=${pickup}&dropoff=${dropoff}`}
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          + New reservation
        </Link>
      </div>

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
          <AvailabilityCalendar data={calendar} today={todayAthens} />
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
          <div className="rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Car</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Occupied</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No cars.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-foreground">{r.name}</TableCell>
                      <TableCell className="text-muted-foreground">{r.location}</TableCell>
                      <TableCell className="text-right">{r.total}</TableCell>
                      <TableCell className="text-right">{r.occupied}</TableCell>
                      <TableCell className="text-right">
                        {r.remaining === 0 ? <Badge variant="destructive">0</Badge> : r.remaining}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.remaining > 0 ? (
                          <Link
                            href={`/admin/trips/new?carId=${r.id}&pickup=${pickup}&dropoff=${dropoff}`}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            Book
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
