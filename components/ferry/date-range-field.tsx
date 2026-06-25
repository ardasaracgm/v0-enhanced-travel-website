'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { tr, enUS, el } from 'date-fns/locale'
import type { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

type CalendarProps = React.ComponentProps<typeof Calendar>

interface DateRangeFieldProps {
  /** one-way → 'single', round-trip → 'range'. */
  mode: 'single' | 'range'
  /** YYYY-MM-DD ('' = seçilmedi). searchParams.date ile birebir. */
  date: string
  /** YYYY-MM-DD ('' = seçilmedi). searchParams.returnDate ile birebir (range modunda). */
  returnDate: string
  onDateChange: (date: string) => void          // birebir setDate
  onReturnDateChange: (date: string) => void     // birebir setReturnDate
  /** Seçilebilir en erken gün (YYYY-MM-DD) — todayAthens. */
  minDate: string
  /** UI dili — takvim lokalizasyonu (tr/en/el). */
  locale: string
  /** Boşken trigger metni. */
  placeholder?: string
  /**
   * Popover'ın yatay (align ekseni) offset'i, px. Default 0 → ferry davranışı
   * AYNEN korunur. Dikey kart bağlamlarında (car-rental hero/kart) takvim ızgarası
   * (Calendar p-2 = 8px iç boşluk) input metniyle (px-3 = 12px) hizalansın diye
   * +4 geçilir. Radix Content.alignOffset'e iletilir.
   */
  alignOffset?: number

  // ─── Adım 2 hazırlığı: opsiyonel passthrough. Adım 1'de GEÇİLMEZ → davranış değişmez. ───
  /** Verilirse bu günler disabled (sefer yok). undefined → tüm günler açık (Adım 1). */
  disabledDates?: Set<string>
  /** Calendar modifiers passthrough — Adım 2'de "sefer var" işareti/sayısı için. */
  dayModifiers?: CalendarProps['modifiers']
  dayModifiersClassNames?: CalendarProps['modifiersClassNames']
}

const LOCALES = { tr, en: enUS, el } as const

/**
 * Gidiş (single) / gidiş+dönüş (range) tarih seçici — Popover + shadcn Calendar.
 * ÇIKTI SÖZLEŞMESİ: yalnız date/returnDate string'lerini (YYYY-MM-DD, YEREL format —
 * toISOString DEĞİL, UTC kayması olmasın) besler → searchParams/handleSearch/money-path
 * DEĞİŞMEZ. PortCombobox deseni. disabledDates/dayModifiers Adım 2 için imzada hazır;
 * Adım 1'de geçilmediği için Calendar'a undefined gider, no-op.
 */
export function DateRangeField({
  mode, date, returnDate, onDateChange, onReturnDateChange,
  minDate, locale, placeholder, alignOffset = 0,
  disabledDates, dayModifiers, dayModifiersClassNames,
}: DateRangeFieldProps) {
  const [open, setOpen] = React.useState(false)
  // Popover oturumunun İLK tıkını işaretler (Bug 2): yeni açılışta true, ilk
  // onSelect'te tüketilir. Önceden DOLU seçim varken oturumun ilk tıkı eski
  // aralığı uzatmak yerine tıklanan günde taze {t,t} başlatır.
  const freshSessionRef = React.useRef(false)
  const dfLocale = LOCALES[locale as keyof typeof LOCALES] ?? enUS
  const fmt = (s: string) => format(parseISO(s), 'd MMM', { locale: dfLocale })

  // Geçmiş günler + (Adım 2) sefersiz günler kapalı. disabledDates yoksa sadece geçmiş.
  const disabled: CalendarProps['disabled'] = [
    { before: parseISO(minDate) },
    ...(disabledDates ? [(d: Date) => disabledDates.has(format(d, 'yyyy-MM-dd'))] : []),
  ]

  const label =
    mode === 'range'
      ? date
        ? `${fmt(date)}${returnDate ? ` – ${fmt(returnDate)}` : ' – …'}`
        : placeholder
      : date
        ? fmt(date)
        : placeholder

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (o) freshSessionRef.current = true // yeni oturum: ilk tık reset adayı
        setOpen(o)
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            !date && 'text-muted-foreground',
          )}
        >
          <span className="line-clamp-1">{label}</span>
          <CalendarIcon className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" alignOffset={alignOffset} collisionPadding={8} className="w-auto p-0">
        {mode === 'range' ? (
          <Calendar
            mode="range"
            locale={dfLocale}
            disabled={disabled}
            numberOfMonths={2}
            selected={{
              from: date ? parseISO(date) : undefined,
              to: returnDate ? parseISO(returnDate) : undefined,
            }}
            onSelect={(r: DateRange | undefined, triggerDate: Date) => {
              // Bug 2: bu popover oturumunun İLK tıkı VE önceden DOLU bir seçim
              // (aynı-gün {X,X} VEYA çok-gün {X,Y} fark etmez) varsa, react-day-picker
              // addToRange eski aralığı uzatır/uca yapıştırır → gidişi değiştirmek çift
              // tık ister. Onu yok sayıp tıklanan günde taze {t,t} başlatıyoruz (popover
              // açık kalır; kullanıcı uzatır ya da aynı günü onaylar). Bayrak oturumun
              // ilk tıkını ayırt eder: oturum-İÇİ 2. tık bu daldan geçmez → çok-gün ileri
              // akış (boş→X→Y) ve taze aynı-gün→uzak-gün uzatması korunur.
              const firstPickOfSession = freshSessionRef.current
              freshSessionRef.current = false
              if (firstPickOfSession && date && returnDate && triggerDate) {
                const t = format(triggerDate, 'yyyy-MM-dd')
                onDateChange(t)
                onReturnDateChange(t)
                return
              }
              // Aynı-gün gidiş-dönüş (günübirlik feribot) geçerli senaryo → from===to
              // seçilebilmeli. min={1} KALDIRILDI: onunla ilk tık to:undefined bırakıp
              // aynı güne 2. tık seçimi siliyordu (from===to yapısal imkânsızdı). min=0
              // (varsayılan) ile ilk tık {from:X,to:X} kurar.
              //
              // Auto-close net kuralı (sezgisel sayım değil — r'den türetilir, bkz.
              // addToRange/useRange kaynağı):
              //  • r={from,to}, from!==to → çok-gün tamam → kapat.
              //  • r={from,to}, from===to → tek-gün yeni kuruldu → AÇIK kal (ikinci gün
              //    tıklayıp uzatılabilsin VEYA aynı gün onaylanabilsin).
              //  • r=undefined → min=0'da yalnız "aynı-gün hücresine 2. tık" bunu üretir
              //    → onay say: seçimi KORU + kapat (silme).
              if (r?.from && r?.to) {
                const fromStr = format(r.from, 'yyyy-MM-dd')
                const toStr = format(r.to, 'yyyy-MM-dd')
                onDateChange(fromStr)
                onReturnDateChange(toStr)
                if (fromStr !== toStr) setOpen(false)
              } else if (date && returnDate && date === returnDate) {
                setOpen(false) // aynı-gün hücresine 2. tık = onay → seçim sabit, kapat
              } else {
                onDateChange('')
                onReturnDateChange('')
              }
            }}
            modifiers={dayModifiers}
            modifiersClassNames={dayModifiersClassNames}
            autoFocus
          />
        ) : (
          <Calendar
            mode="single"
            locale={dfLocale}
            disabled={disabled}
            selected={date ? parseISO(date) : undefined}
            onSelect={(d: Date | undefined) => {
              onDateChange(d ? format(d, 'yyyy-MM-dd') : '')
              setOpen(false)
            }}
            modifiers={dayModifiers}
            modifiersClassNames={dayModifiersClassNames}
            autoFocus
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
