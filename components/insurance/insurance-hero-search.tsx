'use client'

import * as React from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/routing'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DateRangeField } from '@/components/ferry/date-range-field'
import { MAX_TRAVELLERS } from '@/lib/validation/insurance'
import { INSURANCE_COVERAGE_CATALOG } from '@/lib/insurance/coverage-catalog'

/**
 * Ana sayfa hero'sunun "Sigorta" sekmesine gömülen kompakt ön-seçim formu —
 * ortak "hero-inline servis formu" deseninin 3. örneği. 3 alanı (tarih aralığı +
 * yolcu + teminat) taşır → /insurance?…; hedef sayfa yolcular adımına (step 1)
 * atlar. Hero'da CANLI QUOTE YOK → teminat opsiyonu yalnız ad/tutar (35k/100k/
 * 500k) gösterir, fiyat sayfada quote dönünce çıkar. coverageId SAYISAL ID taşınır.
 */
export function InsuranceHeroSearch() {
  const t = useTranslations('insurance')
  const locale = useLocale()
  const router = useRouter()
  const todayAthens = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })

  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
  const [travellers, setTravellers] = React.useState(1)
  const [coverageId, setCoverageId] = React.useState<number | null>(null)

  const canContinue = !!dateFrom && !!dateTo // tarih şart: quote yalnız tarihle tetiklenir

  const handleSearch = () => {
    if (!canContinue) return
    const params = new URLSearchParams()
    params.set('dateFrom', dateFrom)
    params.set('dateTo', dateTo)
    params.set('travellers', String(travellers))
    if (coverageId != null) params.set('coverage', String(coverageId))
    router.push(`/insurance?${params.toString()}`)
  }

  return (
    <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
      {/* Tarih — geniş (lg 2 kolon); align="end" → takvim kart içinde kalır */}
      <div className="space-y-1.5 lg:col-span-2">
        <Label className="text-xs">{t('labels.dates')}</Label>
        <DateRangeField
          mode="range"
          date={dateFrom}
          returnDate={dateTo}
          onDateChange={setDateFrom}
          onReturnDateChange={setDateTo}
          minDate={todayAthens}
          locale={locale}
          placeholder={t('datesPlaceholder')}
          align="end"
          alignOffset={0}
          triggerClassName="rounded-xl"
        />
      </div>

      {/* Yolcu sayısı 1..MAX_TRAVELLERS */}
      <div className="space-y-1.5">
        <Label htmlFor="ins-hero-travellers" className="text-xs">{t('labels.travellers')}</Label>
        <Select value={String(travellers)} onValueChange={(v) => setTravellers(Number(v))}>
          <SelectTrigger id="ins-hero-travellers" className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Array.from({ length: MAX_TRAVELLERS }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Teminat — Select (RadioGroup hero barına sığmaz). Fiyat YOK (quote sayfada) */}
      <div className="space-y-1.5">
        <Label htmlFor="ins-hero-coverage" className="text-xs">{t('coverageHeading')}</Label>
        <Select value={coverageId != null ? String(coverageId) : ''} onValueChange={(v) => setCoverageId(Number(v))}>
          <SelectTrigger id="ins-hero-coverage" className="h-10 rounded-xl">
            <SelectValue placeholder={t('coverageHeading')} />
          </SelectTrigger>
          <SelectContent>
            {INSURANCE_COVERAGE_CATALOG.map((cat) => (
              <SelectItem key={cat.coverageId} value={String(cat.coverageId)}>
                {t('coverageLabel', { coverage: cat.coverageValue.toLocaleString(locale) })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-end">
        <Button
          onClick={handleSearch}
          disabled={!canContinue}
          className="h-10 w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {t('nav.goPassengers')}
        </Button>
      </div>
    </div>
  )
}
