'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'

import { getRouteScheduleAction, type RouteAvailability } from '@/lib/actions/ferry-search'
import { addDaysISO, formatDateShort } from '@/lib/trip-items/summary'

const STRIP_DAYS = 7            // toplam tab
const HALF = 3                  // ±3 → seçili gün ortada (pencere taşmazsa)
const SEAT_THRESHOLD = 20       // koltuk < eşik → "X koltuk", değilse "X sefer"

// Kısa gün adı ("Cmt" / "Sat" / "Σαβ"), UTC sabit (formatDateShort ile aynı parse → gün kayması yok).
function weekdayShort(iso: string, locale: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' })
}

/**
 * Tarih şeridi (P3) — liste üstünde 7 günlük sticky tab şeridi. Seçili gün ortada
 * (±3); pencere minDate altına taşarsa minDate'e kaydırılır (hep 7 seçilebilir gün,
 * geçmiş kayması yok). Sefersiz (countByDate'te yok) günler gri/disabled. Kendi
 * sezon-availability'sini çeker (getRouteScheduleAction) — results'ın arama
 * effect'ine DOKUNMAZ. Tab tıklama P3c'de bağlanır (onSelectDate); yoksa salt görüntü.
 */
export function FerryDateStrip({
  from, to, selectedDate, minDate, locale,
  onSelectDate, showPrice = false, seatThreshold = SEAT_THRESHOLD,
}: {
  from: string
  to: string
  selectedDate: string                      // YYYY-MM-DD — pencere merkezi
  minDate: string                           // seçilebilir en erken gün (today / outbound günü)
  locale: string
  onSelectDate?: (date: string) => void     // P3c bağlar; yoksa render-only
  showPrice?: boolean                        // fiyat altyapısı — default false (render YOK)
  seatThreshold?: number
}) {
  const t = useTranslations('ferryResults')
  const [avail, setAvail] = React.useState<RouteAvailability | null>(null)

  // Şerit kendi sezon-availability'sini çeker (results arama effect'inden bağımsız).
  React.useEffect(() => {
    let cancelled = false
    setAvail(null)
    ;(async () => {
      const a = await getRouteScheduleAction(from, to)
      if (!cancelled) setAvail(a)
    })()
    return () => { cancelled = true }
  }, [from, to])

  // 7 gün penceresi: seçili gün ortada (±3). Pencere minDate altına taşarsa
  // minDate'e kaydırılır → hep 7 seçilebilir tab, geçmişe taşma yok.
  const base = selectedDate.slice(0, 10)
  const days = React.useMemo(() => {
    // Prerender (initial searchParams.date='') veya bozuk input → addDaysISO('')
    // RangeError. useMemo factory render'da EAGER çalışır; aşağıdaki return null'a
    // ULAŞILMADAN patlar → guard MEMO İÇİNDE de şart.
    if (base.length < 10) return []
    const idealStart = addDaysISO(base, -HALF)
    const windowStart = idealStart < minDate ? minDate : idealStart
    return Array.from({ length: STRIP_DAYS }, (_, i) => addDaysISO(windowStart, i))
  }, [base, minDate])

  // Tüm hook'lar (useTranslations/useState/useEffect/useMemo) yukarıda çağrıldı →
  // koşullu-hook ihlali yok. Geçerli tarih yoksa şerit anlamsız → render etme.
  if (days.length === 0) return null

  return (
    <div className="sticky top-24 z-30 -mx-2 bg-background/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {days.map((day) => {
          const loading = avail === null
          const isPast = day < minDate
          const count = avail?.countByDate[day] ?? 0
          const seats = avail?.seatsByDate[day] ?? 0
          const price = avail?.minPriceByDate[day]
          const hasSailing = count > 0
          const disabled = loading || isPast || !hasSailing
          const selected = day === base

          // Akıllı satır2: eşik-altı koltuk → "X koltuk", değilse sefer sayısı.
          const row2 = !hasSailing
            ? null
            : seats > 0 && seats < seatThreshold
              ? t('dateStrip.seats', { count: seats })
              : t('dateStrip.sailings', { count })

          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => { if (!disabled) onSelectDate?.(day) }}
              aria-pressed={selected}
              className={[
                'flex min-w-[4.75rem] shrink-0 flex-col items-center rounded-xl border-2 px-2.5 py-1.5 text-center transition-colors',
                selected
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                  : disabled
                    ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
                    : 'border-blue-100 bg-white text-blue-950 hover:border-blue-400',
              ].join(' ')}
            >
              {/* satır1: kısa tarih · kısa gün — "5 Tem · Cmt" */}
              <span className="whitespace-nowrap text-xs font-semibold leading-tight">
                {formatDateShort(day, locale)} · {weekdayShort(day, locale)}
              </span>
              {/* satır2: akıllı koltuk/sefer — sefer yoksa "—", yükleniyorsa "·" (yükseklik sabit) */}
              <span className={`mt-0.5 whitespace-nowrap text-[10px] leading-tight ${
                selected ? 'text-white/90' : disabled ? 'text-slate-300' : 'text-blue-600'
              }`}>
                {loading ? '·' : row2 ?? '—'}
              </span>
              {/* fiyat altyapısı — P3 kararı: showPrice=false → şimdilik render YOK */}
              {showPrice && price != null && (
                <span className={`text-[10px] font-medium leading-tight ${selected ? 'text-white' : 'text-blue-700'}`}>
                  €{price}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
