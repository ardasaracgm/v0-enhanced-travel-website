import { BadgeEuro, Headphones, MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Card, CardContent } from '@/components/ui/card'

const CARDS = [
  { Icon: MapPin, key: 'why1' }, // Kos Limanı'nda Kolay Teslim
  { Icon: Headphones, key: 'why2' }, // Türkçe Destek
  { Icon: BadgeEuro, key: 'why3' }, // Şeffaf Fiyatlandırma
] as const

export function Car2WhyUs() {
  const t = useTranslations('car2')
  return (
    <section className="w-full bg-secondary/30 py-16 md:py-24">
      <div className="container px-4 md:px-6">
        <h2 className="mb-12 text-center text-3xl font-bold text-foreground md:text-4xl">{t('whyTitle')}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {CARDS.map(({ Icon, key }) => (
            <Card key={key} className="border-border/50">
              <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{t(`${key}Title`)}</h3>
                <p className="text-muted-foreground">{t(`${key}Desc`)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
