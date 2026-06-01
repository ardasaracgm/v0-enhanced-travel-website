'use client'

import * as React from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Compass, Calendar, Clock, Users, MapPin, CheckCircle, Star, Ship, Camera, Sun, Waves } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { TrustBar } from '@/components/islandbee/trust-bar'
import { WhatsAppCTA } from '@/components/islandbee/whatsapp-cta'
import { TrustIndicators, SecurePaymentBanner } from '@/components/islandbee/trust-indicators'

const tours = [
  { id: 't1', price: '€89', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80', hasBadge: true },
  { id: 't2', price: '€95', image: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=600&q=80', hasBadge: true },
  { id: 't3', price: '€75', image: 'https://images.unsplash.com/photo-1500514966906-fe245eea9344?w=600&q=80', hasBadge: false },
  { id: 't4', price: '€55', image: 'https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?w=600&q=80', hasBadge: false },
  { id: 't5', price: '€85', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80', hasBadge: true },
  { id: 't6', price: '€69', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80', hasBadge: false },
]

const categories = [
  { icon: <Ship className="h-5 w-5" />, id: 'boat', count: 3 },
  { icon: <Camera className="h-5 w-5" />, id: 'cultural', count: 2 },
  { icon: <Sun className="h-5 w-5" />, id: 'sailing', count: 1 },
  { icon: <Waves className="h-5 w-5" />, id: 'adventure', count: 1 },
]

const faqKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'] as const

export default function ToursPage() {
  const t = useTranslations('toursPage')
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1920&q=80"
              alt="Beautiful Greek island coastline"
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
                <Compass className="h-4 w-4" />
                {t('hero.badge')}
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 text-balance"
              >
                {t('hero.title')}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/90 text-lg md:text-xl mb-8 text-pretty"
              >
                {t('hero.subtitle')}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-4 text-sm text-white/80"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>{t('hero.chip1')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>{t('hero.chip2')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>{t('hero.chip3')}</span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Filter Section */}
        <section className="w-full py-8 -mt-6 relative z-10">
          <div className="container px-4 md:px-6">
            <Card className="border-0 shadow-2xl bg-card">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-3">
                    {categories.map((cat) => (
                      <Button key={cat.id} variant="outline" size="sm" className="gap-2 text-foreground">
                        {cat.icon}
                        {t(`categories.${cat.id}`)}
                        <span className="text-xs text-muted-foreground">({cat.count})</span>
                      </Button>
                    ))}
                  </div>
                  <Select defaultValue="popular">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('filter.sortBy')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popular">{t('filter.sortPopular')}</SelectItem>
                      <SelectItem value="price-low">{t('filter.sortPriceLow')}</SelectItem>
                      <SelectItem value="price-high">{t('filter.sortPriceHigh')}</SelectItem>
                      <SelectItem value="duration">{t('filter.sortDuration')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Tours Grid */}
        <section className="w-full py-12 md:py-20">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {tours.map((tour, index) => (
                <motion.div
                  key={tour.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-card border-border/50 h-full">
                    <CardContent className="p-0 flex flex-col h-full">
                      <div className="relative h-56">
                        <Image
                          src={tour.image}
                          alt={t(`tours.${tour.id}.name`)}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-3 left-3 flex gap-2">
                          <span className="px-3 py-1 bg-card/90 backdrop-blur text-foreground text-xs font-medium rounded-full">
                            {t(`tours.${tour.id}.category`)}
                          </span>
                          {tour.hasBadge && (
                            <span className="px-3 py-1 bg-accent text-accent-foreground text-xs font-medium rounded-full">
                              {t(`tours.${tour.id}.badge`)}
                            </span>
                          )}
                        </div>
                        <div className="absolute top-3 right-3">
                          <span className="px-3 py-1 bg-card/90 backdrop-blur text-foreground text-xs font-medium rounded-full flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {t(`tours.${tour.id}.duration`)}
                          </span>
                        </div>
                      </div>
                      <div className="p-6 flex flex-col flex-1">
                        <h3 className="font-bold text-xl text-foreground mb-2">{t(`tours.${tour.id}.name`)}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                          <MapPin className="h-4 w-4" />
                          <span>{(t.raw(`tours.${tour.id}.islands`) as string[]).join(' • ')}</span>
                        </div>
                        <p className="text-muted-foreground text-sm mb-4 flex-1">{t(`tours.${tour.id}.desc`)}</p>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {(t.raw(`tours.${tour.id}.includes`) as string[]).map((item) => (
                            <span key={item} className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-lg">
                              {item}
                            </span>
                          ))}
                        </div>

                        <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
                          <div>
                            <span className="text-sm text-muted-foreground">{t('card.from')} </span>
                            <span className="text-2xl font-bold text-primary">{tour.price}</span>
                            <span className="text-sm text-muted-foreground">{t('card.perPerson')}</span>
                          </div>
                          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">{t('card.book')}</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <TrustIndicators />

        {/* Why Book Tours With Us */}
        <section className="w-full py-16 md:py-24 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('why.title')}</h2>
              <p className="text-muted-foreground text-lg">{t('why.intro')}</p>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="bg-card border-border/50 text-center">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{t('why.c1Title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('why.c1Desc')}</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50 text-center">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Star className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{t('why.c2Title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('why.c2Desc')}</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50 text-center">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{t('why.c3Title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('why.c3Desc')}</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50 text-center">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Compass className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{t('why.c4Title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('why.c4Desc')}</p>
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
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('faq.title')}</h2>
                <p className="text-muted-foreground text-lg">{t('faq.intro')}</p>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {faqKeys.map((q, index) => (
                  <AccordionItem key={q} value={`item-${index}`} className="border-border/50">
                    <AccordionTrigger className="text-left text-foreground hover:text-primary">
                      {t(`faq.${q}`)}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {t(`faq.a${index + 1}`)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        <SecurePaymentBanner />
        
        <WhatsAppCTA
          title={t('cta.title')}
          description={t('cta.desc')}
        />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
