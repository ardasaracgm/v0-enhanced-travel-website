'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { ENTRY_POINTS, VESSEL_TYPES } from '@/lib/validation/visa'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * Ana sayfa hero'sunun "Vize" sekmesine gömülen kompakt ön-seçim formu —
 * ortak "hero-inline servis formu" deseninin ilk örneği (sonraki turlarda
 * car/transfer/insurance aynı kalıpla).
 *
 * Değerler slug (kutsal); label/option metinleri visaPage.form anahtarlarından
 * (visa/page.tsx hero mini-formuyla birebir aynı desen). Submit → /visa?…
 * (yalnız DOLU alanlar encode edilir). Hedef sayfa useSearchParams ile okuyup
 * VisaWizard prefill'ine map eder (wizard merge boş değeri ezmez; @/i18n/routing
 * useRouter locale prefix'i otomatik ekler).
 */
export function VisaHeroSearch() {
  const tForm = useTranslations('visaPage.form')
  const tHero = useTranslations('hero')
  const router = useRouter()

  const [form, setForm] = React.useState({
    firstName: '', lastName: '', entryPoint: '', vesselType: '', birthDate: '',
  })
  const update = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleStart = () => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(form)) {
      if (v) params.set(k, v)
    }
    const qs = params.toString()
    router.push(qs ? `/visa?${qs}` : '/visa')
  }

  return (
    <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
      <div className="space-y-1.5">
        <Label htmlFor="visa-hero-firstName" className="text-xs">{tForm('labels.firstName')}</Label>
        <Input
          id="visa-hero-firstName"
          value={form.firstName}
          onChange={(e) => update('firstName', e.target.value)}
          className="h-10 rounded-xl"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="visa-hero-lastName" className="text-xs">{tForm('labels.lastName')}</Label>
        <Input
          id="visa-hero-lastName"
          value={form.lastName}
          onChange={(e) => update('lastName', e.target.value)}
          className="h-10 rounded-xl"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="visa-hero-birthDate" className="text-xs">{tForm('labels.birthDate')}</Label>
        <Input
          id="visa-hero-birthDate"
          type="date"
          value={form.birthDate}
          onChange={(e) => update('birthDate', e.target.value)}
          className="h-10 rounded-xl"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="visa-hero-entryPoint" className="text-xs">{tForm('labels.entryPoint')}</Label>
        <Select value={form.entryPoint} onValueChange={(v) => update('entryPoint', v)}>
          <SelectTrigger id="visa-hero-entryPoint" className="h-10 rounded-xl">
            <SelectValue placeholder={tForm('selectPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {ENTRY_POINTS.map((val) => (
              <SelectItem key={val} value={val}>{tForm(`options.entryPoint.${val}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="visa-hero-vesselType" className="text-xs">{tForm('labels.vesselType')}</Label>
        <Select value={form.vesselType} onValueChange={(v) => update('vesselType', v)}>
          <SelectTrigger id="visa-hero-vesselType" className="h-10 rounded-xl">
            <SelectValue placeholder={tForm('selectPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {VESSEL_TYPES.map((val) => (
              <SelectItem key={val} value={val}>{tForm(`options.vesselType.${val}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end">
        <Button
          onClick={handleStart}
          size="lg"
          className="h-10 w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {tHero('serviceCta.visaButton')}
        </Button>
      </div>
    </div>
  )
}
