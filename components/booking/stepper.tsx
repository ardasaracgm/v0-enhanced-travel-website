'use client'

import * as React from 'react'
import { CheckCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

// İki rezervasyon akışı: feribot (4 adım) ve araç-only (3 adım). Adım anahtarları
// ortak `steps` namespace'inden çevrilir; href ise tamamlanmış adıma geri tıklama.
type Flow = 'ferry' | 'car'

const FLOWS: Record<Flow, { key: string; href: string }[]> = {
  ferry: [
    { key: 'selectFerry', href: '/ferry/results' },
    { key: 'extras', href: '/ferry/extras' },
    { key: 'passengers', href: '/ferry/passenger-details' },
    { key: 'payment', href: '/checkout' },
  ],
  car: [
    { key: 'selectCar', href: '/car-rental' },
    { key: 'driver', href: '/car-rental/driver' },
    { key: 'payment', href: '/checkout' },
  ],
}

interface BookingStepperProps {
  flow: Flow
  /** Aktif adımın key'i (ör. 'extras'). Akış listesindeki konumu belirler. */
  current: string
}

// Tek paylaşılan stepper — dört+ sayfadaki kopya-yapıştır inline markup'ın yerine.
// Tamamlanan adımlar (current'tan önce) o adımın route'una Link; current + ileri
// kilitli düz <div>. Görsel: done=CheckCircle, current=dolu daire, future=boş.
export function BookingStepper({ flow, current }: BookingStepperProps) {
  const t = useTranslations('steps')
  const steps = FLOWS[flow]
  const currentIdx = steps.findIndex((s) => s.key === current)

  return (
    <section className="w-full py-4 border-b border-border/50 bg-card">
      <div className="container px-4 md:px-6">
        <div className="flex items-center justify-center gap-6 flex-wrap">
          {steps.map((step, i) => {
            const done = i < currentIdx
            const isCurrent = i === currentIdx
            const circleClass = done
              ? 'bg-primary/20 text-primary'
              : isCurrent
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            const labelClass = isCurrent ? 'text-primary font-medium' : 'text-muted-foreground'

            const node = (
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${circleClass}`}>
                  {done ? <CheckCircle className="h-5 w-5" /> : i + 1}
                </div>
                <span className={`text-sm ${labelClass}`}>{t(step.key)}</span>
              </div>
            )

            return (
              <React.Fragment key={step.key}>
                {done ? (
                  <Link href={step.href} className="cursor-pointer hover:opacity-80 transition-opacity">
                    {node}
                  </Link>
                ) : (
                  node
                )}
                {i < steps.length - 1 && (
                  <div className={`w-10 h-0.5 ${i < currentIdx ? 'bg-primary' : 'bg-border'}`} />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </section>
  )
}
