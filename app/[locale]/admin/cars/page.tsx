import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getAvailabilityForDates, computeEndDate } from '@/lib/car-availability'
import { normalizeCar, dateDiffInDays } from '@/lib/normalize-car'
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

export default async function AdminCarsPage({
  searchParams,
}: {
  searchParams: Promise<{ pickup?: string; dropoff?: string }>
}) {
  const { pickup: pickupParam, dropoff: dropoffParam } = await searchParams

  // Atina günü = public car-rental sayfasıyla aynı (page.tsx:102).
  const todayAthens = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })
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
      <h1 className="text-2xl font-bold text-foreground">Car Availability</h1>

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
          Geçersiz tarih aralığı — bırakış tarihi alış tarihinden önce olamaz.
        </p>
      ) : carsErr ? (
        <p className="text-sm text-destructive">Failed to load cars: {carsErr.message}</p>
      ) : availErr ? (
        <p className="text-sm text-destructive">Availability failed: {availErr}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {pickup} → {dropoff} · {days} gün
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
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
