'use client'

import * as React from 'react'
import Image from 'next/image'
import { Ship, Calendar, Users, MapPin, Clock, CheckCircle, Star, Anchor, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { WhatsAppCTA } from '@/components/islandbee/whatsapp-cta'
import { TrustIndicators, SecurePaymentBanner } from '@/components/islandbee/trust-indicators'
import { FerrySearchForm } from '@/components/ferry/ferry-search-form'
import { slug } from '@/lib/ferry/util'

const routes = [
  { from: 'Bodrum', to: 'Kos', duration: '1 hour', price: '€35', frequency: 'Daily', operator: 'Bodrum Express Lines' },
  { from: 'Turgutreis', to: 'Kos', duration: '40 min', price: '€30', frequency: 'Daily', operator: 'Turgutreis Lines' },
  { from: 'Marmaris', to: 'Rhodes', duration: '50 min', price: '€45', frequency: 'Daily', operator: 'Marmaris Ferries' },
  { from: 'Kusadasi', to: 'Samos', duration: '1.5 hours', price: '€40', frequency: 'Daily', operator: 'Meander Travel' },
]

// FAQ content lives in i18n (ferryPage.faq{n}Q / faq{n}A).
const FAQ_COUNT = 6

export default function FerryTicketsPage() {
  const t = useTranslations('ferryPage')
  // Routes kartı "Book" → arama formunu from/to ile ön-doldur. Form state'i kendi
  // içinde (extract sonrası); key-remount + initial ile mount anında beslenir.
  const [routeKey, setRouteKey] = React.useState(0)
  const [searchInitial, setSearchInitial] = React.useState<{ from?: string; to?: string }>()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1500514966906-fe245eea9344?w=1920&q=80"
              alt={t('heroImageAlt')}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/40" />
          </div>
          <div className="container relative px-4 md:px-6">
            <div className="max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary-foreground text-sm font-medium mb-6"
              >
                <Ship className="h-4 w-4" />
                {t('heroBadge')}
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 text-balance"
              >
                {t('title')}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/90 text-lg md:text-xl mb-8 text-pretty"
              >
                {t('subtitle')}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-4 text-sm text-white/80"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>{t('bullet1')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>{t('bullet2')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>{t('bullet3')}</span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Search Section */}
        <section className="w-full py-12 md:py-16 -mt-8 relative z-10">
          <div className="container px-4 md:px-6">
            <FerrySearchForm key={routeKey} initial={searchInitial} />
          </div>
        </section>

        {/* Popular Routes */}
        <section className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('popularRoutes')}</h2>
              <p className="text-muted-foreground text-lg">{t('popularRoutesSubtitle')}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {routes.map((route, index) => (
                <motion.div
                  key={`${route.from}-${route.to}`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card border-border/50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <MapPin className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{route.from}</p>
                            <p className="text-xs text-muted-foreground">{t('countryTurkey')}</p>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-primary" />
                        <div className="text-right">
                          <p className="font-bold text-foreground">{route.to}</p>
                          <p className="text-xs text-muted-foreground">{t('countryGreece')}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-4 border-t border-b border-border/50 mb-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{route.duration}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{route.frequency}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-muted-foreground">{t('fromPrice')} </span>
                          <span className="text-2xl font-bold text-primary">{route.price}</span>
                          <span className="text-sm text-muted-foreground">{t('perPerson')}</span>
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          onClick={() => {
                            // slug() = mevcut .toLowerCase() ile byte-identical (ASCII
                            // tek-kelime isimler) + Türkçe/boşluk için sağlam. Marmaris→
                            // Rhodes bugünkü gibi katalog-dışı kalır (form to'yu boşaltır).
                            setSearchInitial({ from: slug(route.from), to: slug(route.to) })
                            setRouteKey((k) => k + 1)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                        >
                          {t('bookButton')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <TrustIndicators />

        {/* Why Book With Us */}
        <section className="w-full py-16 md:py-24 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('whyTitle')}</h2>
              <p className="text-muted-foreground text-lg">{t('whySubtitle')}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-card border-border/50 text-center">
                <CardContent className="p-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Star className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{t('why1Title')}</h3>
                  <p className="text-muted-foreground">{t('why1Desc')}</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50 text-center">
                <CardContent className="p-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Anchor className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{t('why2Title')}</h3>
                  <p className="text-muted-foreground">{t('why2Desc')}</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50 text-center">
                <CardContent className="p-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{t('why3Title')}</h3>
                  <p className="text-muted-foreground">{t('why3Desc')}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('faqTitle')}</h2>
                <p className="text-muted-foreground text-lg">{t('faqSubtitle')}</p>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {Array.from({ length: FAQ_COUNT }, (_, i) => i + 1).map((n) => (
                  <AccordionItem key={n} value={`item-${n}`} className="border-border/50">
                    <AccordionTrigger className="text-left text-foreground hover:text-primary">
                      {t(`faq${n}Q`)}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {t(`faq${n}A`)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        <SecurePaymentBanner />
        
        <WhatsAppCTA
          title={t('ctaTitle')}
          description={t('ctaDescription')}
        />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
