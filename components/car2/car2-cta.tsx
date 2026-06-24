'use client'

import { useLocale, useTranslations } from 'next-intl'
import { MessageCircle, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { buildCar2WhatsAppLink, getCar2WhatsAppDisplay } from '@/lib/car2-contact'

export function Car2Cta() {
  const t = useTranslations('car2')
  const locale = useLocale()
  return (
    <section className="w-full bg-gradient-to-r from-primary to-primary/80 py-16 md:py-24">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
          <div className="text-center md:text-left">
            <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">{t('ctaTitle')}</h2>
            <p className="max-w-xl text-lg text-primary-foreground/90">{t('ctaDescription')}</p>
            <p className="mt-4 text-sm text-primary-foreground/80">
              {t('ctaSupportLabel')} · {getCar2WhatsAppDisplay(locale)}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              size="lg"
              variant="secondary"
              className="gap-2 bg-card text-foreground hover:bg-card/90"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <Search className="h-5 w-5" />
              {t('ctaSearchButton')}
            </Button>
            <a href={buildCar2WhatsAppLink(locale)} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="w-full gap-2 bg-[#25D366] text-white hover:bg-[#25D366]/90">
                <MessageCircle className="h-5 w-5" />
                {t('ctaWhatsappButton')}
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
