'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// 3-adımlı wizard: 1) tarih+teminat (B2), 2) yolcular (B3), 3) özet+öde (B4).
// B1 = yalnız iskelet: step state + ileri/geri + adım göstergesi. Alanlar/quote/
// submit sıradaki commit'lerde. i18n baştan ('insurance' namespace).
const TOTAL_STEPS = 3
const STEP_KEYS = ['dates', 'travellers', 'review'] as const

export function InsuranceWizard() {
  const t = useTranslations('insurance')
  const [step, setStep] = React.useState(0)
  const isLast = step === TOTAL_STEPS - 1

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t('heroTitle')}</h1>
        <p className="mt-2 text-muted-foreground">{t('heroSubtitle')}</p>
      </div>

      {/* Adım göstergesi */}
      <ol className="flex items-center justify-center gap-1 sm:gap-2">
        {STEP_KEYS.map((key, i) => (
          <li key={key} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`hidden text-sm sm:inline ${
                i === step ? 'font-medium text-foreground' : 'text-muted-foreground'
              }`}
            >
              {t(`steps.${key}`)}
            </span>
            {i < TOTAL_STEPS - 1 && <span className="mx-1 h-px w-4 bg-border sm:w-6" />}
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="p-6">
          {/* Adım gövdeleri B2–B4'te gelecek (stepPlaceholder o zaman kalkar). */}
          <p className="text-sm text-muted-foreground">{t('stepPlaceholder')}</p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          {t('nav.back')}
        </Button>
        <Button
          type="button"
          onClick={() => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))}
          disabled={isLast}
        >
          {isLast ? t('nav.pay') : t('nav.next')}
        </Button>
      </div>
    </div>
  )
}
