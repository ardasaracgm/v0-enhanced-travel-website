'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from '@/i18n/routing'
import { Ship, Calendar, Users, MapPin, Clock, ChevronRight, CheckCircle, Star, Anchor, ArrowRight, ArrowLeftRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
import { WhatsAppCTA } from '@/components/islandbee/whatsapp-cta'
import { TrustIndicators, SecurePaymentBanner } from '@/components/islandbee/trust-indicators'
import { useBooking } from '@/lib/booking-context'

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
  const router = useRouter()
  const { state, dispatch } = useBooking()
  const [tripType, setTripType] = React.useState<'one-way' | 'round-trip'>('one-way')
  const [from, setFrom] = React.useState('bodrum')
  const [to, setTo] = React.useState('kos')
  const [date, setDate] = React.useState('')
  const [returnDate, setReturnDate] = React.useState('')
  const [passengers, setPassengers] = React.useState('2')

  const todayAthens = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })

  const handleSearch = () => {
    dispatch({
      type: 'SET_SEARCH_PARAMS',
      payload: {
        from,
        to,
        date,
        passengers: parseInt(passengers),
        tripType,
        returnDate: tripType === 'round-trip' ? returnDate : undefined,
      },
    })
    router.push('/ferry/results')
  }

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
            <Card className="border-0 shadow-2xl bg-card">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <h2 className="text-xl font-bold text-foreground">{t('searchTitle')}</h2>
                  <RadioGroup
                    value={tripType}
                    onValueChange={(value) => setTripType(value as 'one-way' | 'round-trip')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="one-way" id="one-way" />
                      <Label htmlFor="one-way" className="cursor-pointer">{t('oneWay')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="round-trip" id="round-trip" />
                      <Label htmlFor="round-trip" className="cursor-pointer flex items-center gap-1">
                        <ArrowLeftRight className="h-4 w-4" />
                        {t('roundTrip')}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('fromPort')}</label>
                    <Select value={from} onValueChange={setFrom}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('fromPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bodrum">{t('portBodrum')}</SelectItem>
                        <SelectItem value="turgutreis">{t('portTurgutreis')}</SelectItem>
                        <SelectItem value="marmaris">{t('portMarmaris')}</SelectItem>
                        <SelectItem value="kusadasi">{t('portKusadasi')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('toPort')}</label>
                    <Select value={to} onValueChange={setTo}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('toPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kos">{t('portKos')}</SelectItem>
                        <SelectItem value="rhodes">{t('portRhodes')}</SelectItem>
                        <SelectItem value="samos">{t('portSamos')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('departDate')}</label>
                    <Input
                      type="date"
                      className="h-10"
                      min={todayAthens}
                      max="2099-12-31"
                      value={date}
                      onChange={(e) => {
                        const newDate = e.target.value
                        setDate(newDate)
                        // Clear a now-invalid return date — the min attribute
                        // won't retroactively wipe an already-selected value.
                        if (returnDate && returnDate < newDate) setReturnDate('')
                      }}
                    />
                  </div>
                  {tripType === 'round-trip' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t('returnDate')}</label>
                      <Input
                        type="date"
                        className="h-10"
                        min={date || todayAthens}
                        max="2099-12-31"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('passengersLabel')}</label>
                    <Select value={passengers} onValueChange={setPassengers}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('passengersLabel')} />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {t('passengerOption', { count: n })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">&nbsp;</label>
                    <Button
                      className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={handleSearch}
                    >
                      {t('searchButton')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                            setFrom(route.from.toLowerCase())
                            setTo(route.to.toLowerCase())
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
