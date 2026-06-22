'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from '@/i18n/routing'
import { Ship, Calendar, Users, MapPin, Clock, ChevronRight, CheckCircle, Star, Anchor, ArrowRight, ArrowLeftRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { getDeparturePortsAction, getArrivalPortsAction, type CatalogPort } from '@/lib/actions/ferry-catalog'
import { getRouteScheduleAction, type RouteAvailability } from '@/lib/actions/ferry-search'
import { PortCombobox } from '@/components/ferry/port-combobox'
import { DateRangeField } from '@/components/ferry/date-range-field'

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
  const locale = useLocale()
  const router = useRouter()
  const { state, dispatch } = useBooking()
  const [tripType, setTripType] = React.useState<'one-way' | 'round-trip'>('one-way')
  const [from, setFrom] = React.useState('bodrum')
  const [to, setTo] = React.useState('kos')
  const [date, setDate] = React.useState('')
  const [returnDate, setReturnDate] = React.useState('')
  const [returnTo, setReturnTo] = React.useState('')
  const [passengers, setPassengers] = React.useState('2')
  const [departures, setDepartures] = React.useState<CatalogPort[]>([])
  const [arrivals, setArrivals] = React.useState<CatalogPort[]>([])
  // Dönüş varış kataloğu: kalkışı = outbound varışı ('to'). Adım 2 deseni.
  const [returnArrivals, setReturnArrivals] = React.useState<CatalogPort[]>([])
  // Sefer-availability: seçili OUTBOUND hat (from→to) sezon takvimi.
  const [availability, setAvailability] = React.useState<RouteAvailability | null>(null)

  const todayAthens = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })

  // Display name by locale, with en→tr fallback (el may be a TODO in ports.ts).
  const portLabel = React.useCallback(
    (p: CatalogPort) => p.name[locale as 'tr' | 'en' | 'el'] ?? p.name.en ?? p.name.tr,
    [locale],
  )

  // Load the live departure catalog once.
  React.useEffect(() => {
    let alive = true
    getDeparturePortsAction().then((d) => { if (alive) setDepartures(d) })
    return () => { alive = false }
  }, [])

  // Dependent arrivals: refetch when departure changes; reset a now-invalid 'to'.
  React.useEffect(() => {
    let alive = true
    getArrivalPortsAction(from).then((a) => {
      if (!alive) return
      setArrivals(a)
      setTo((prev) => (a.some((p) => p.slug === prev) ? prev : a[0]?.slug ?? ''))
    })
    return () => { alive = false }
  }, [from])

  // Açık-jaw dönüş varışları: dönüş kalkışı = outbound varışı ('to').
  // Default seçim = outbound kalkışı ('from') → klasik gidiş-dönüş (byte-identical).
  React.useEffect(() => {
    if (tripType !== 'round-trip' || !to) { setReturnArrivals([]); return }
    let alive = true
    getArrivalPortsAction(to).then((a) => {
      if (!alive) return
      setReturnArrivals(a)
      setReturnTo((prev) => {
        const want = prev || from
        return a.some((p) => p.slug === want) ? want : a[0]?.slug ?? ''
      })
    })
    return () => { alive = false }
  }, [tripType, to, from])

  // Sefer-availability: seçili OUTBOUND hat (from→to) için sezon takvimi — sefersiz
  // günler kapatılır. Eager (arrivals deseni gibi) from/to değişince çeker; server
  // 5-dk cache. Round-trip MVP: dönüş bacağı ayrı hat olsa da takvim outbound'u
  // kısıtlar (dönüş rafine sonra; nearest-fallback dönüşte devrede). SALT GÖRÜNTÜ.
  React.useEffect(() => {
    if (!from || !to) { setAvailability(null); return }
    let alive = true
    getRouteScheduleAction(from, to).then((a) => { if (alive) setAvailability(a) })
    return () => { alive = false }
  }, [from, to])

  // availability → DateRangeField.disabledDates. Yokken (loading / rota yok) boş Set
  // → tüm günler açık (Adım 1 davranışı). Money-path dışı, salt takvim kısıtı.
  const disabledDateSet = React.useMemo(
    () => new Set(availability?.disabledDates ?? []),
    [availability],
  )

  // Dönüş kalkışı = outbound varışı ('to'); ayrı alan yerine returnTo etiketinde
  // satır-içi gösterilir (tek-satır form). Salt görüntü — handleSearch returnFrom'u
  // doğrudan 'to'dan türetir, money-path değişmez.
  const toName = (() => {
    const p = arrivals.find((x) => x.slug === to)
    return p ? portLabel(p) : to
  })()

  // Catalog still loading (departures empty) or no valid arrival picked → block search.
  // Round-trip → dönüş varışı da seçili olmalı (açık-jaw veya klasik).
  const canSearch =
    departures.length > 0 && !!from && !!to &&
    // Round-trip → dönüş varışı VE dönüş tarihi zorunlu (yarım-range engeli:
    // gidiş seçilip dönüş seçilmemiş aralıkla aramayı bloke eder).
    (tripType !== 'round-trip' || (!!returnTo && !!returnDate))

  const swapPorts = () => {
    // from↔to çevir; arrivals / returnArrivals / availability effect'leri (from/to
    // deps) otomatik yeniden çalışır → katalog + takvim doğru refetch. Money-path
    // dışı — yalnız mevcut UI setter'ları.
    setFrom(to)
    setTo(from)
  }

  const handleSearch = () => {
    if (!canSearch) return
    // Gerçek yeni arama → eski sepeti at (stale ferry/ekstra birikmesin). Yalnız
    // burada; adımlar arası ve results-içi gezinme sepeti korur.
    dispatch({ type: 'RESET_CART' })
    dispatch({
      type: 'SET_SEARCH_PARAMS',
      payload: {
        from,
        to,
        date,
        passengers: parseInt(passengers),
        tripType,
        returnDate: tripType === 'round-trip' ? returnDate : undefined,
        // returnFrom = outbound varışı (hep), returnTo = kullanıcı seçimi.
        // Klasik gidiş-dönüş: returnTo === from → results swap'ıyla byte-identical.
        returnFrom: tripType === 'round-trip' ? to : undefined,
        returnTo: tripType === 'round-trip' ? returnTo : undefined,
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
                <div
                  className={
                    // Tek-yön = 5 hücre (from, to, dateRange, pax, button) → tek satır.
                    // Round-trip = 6 hücre (from, to, dateRange, returnTo, pax, button);
                    //   returnFrom (=to) returnTo etiketinde satır-içi → tek satır.
                    // İki tam literal string (Tailwind JIT runtime'da birleştiremez).
                    tripType === 'one-way'
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4'
                      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4'
                  }
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('fromPort')}</label>
                    <PortCombobox
                      ports={departures}
                      value={from}
                      onChange={setFrom}
                      placeholder={t('fromPlaceholder')}
                      portLabel={portLabel}
                      defaultOpenCountry="TR"
                      countryLabels={{ TR: t('countryTurkey'), GR: t('countryGreece') }}
                    />
                  </div>
                  <div className="space-y-2 relative">
                    <label className="text-sm font-medium text-foreground">{t('toPort')}</label>
                    {/* from↔to swap — md+ (yan yana) görünür. Mobil dikey stack'te
                        swap, merged route box ile (Commit B) gelecek. Salt UI state. */}
                    <button
                      type="button"
                      onClick={swapPorts}
                      aria-label={t('swapPorts')}
                      className="hidden md:flex absolute -left-6 top-8 z-10 h-8 w-8 items-center justify-center rounded-full border border-input bg-background shadow-sm hover:bg-accent"
                    >
                      <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <PortCombobox
                      ports={arrivals}
                      value={to}
                      onChange={setTo}
                      placeholder={t('toPlaceholder')}
                      portLabel={portLabel}
                      defaultOpenCountry="GR"
                      countryLabels={{ TR: t('countryTurkey'), GR: t('countryGreece') }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      {tripType === 'round-trip'
                        ? `${t('departDate')} – ${t('returnDate')}`
                        : t('departDate')}
                    </label>
                    <DateRangeField
                      mode={tripType === 'round-trip' ? 'range' : 'single'}
                      date={date}
                      returnDate={returnDate}
                      onDateChange={setDate}
                      onReturnDateChange={setReturnDate}
                      minDate={todayAthens}
                      locale={locale}
                      placeholder={t('departDate')}
                      disabledDates={disabledDateSet}
                    />
                  </div>
                  {tripType === 'round-trip' && (
                    // Dönüş varışı: serbest seçim (getArrivalPortsAction(to)). Dönüş
                    // kalkışı (=to) etiketin başında satır-içi gösterilir (returnFrom
                    // ayrı alanı kaldırıldı → tek satır). Money-path değişmez.
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground truncate">
                        <span className="font-normal text-muted-foreground">{toName} → </span>
                        {t('returnToPort')}
                      </label>
                      <PortCombobox
                        ports={returnArrivals}
                        value={returnTo}
                        onChange={setReturnTo}
                        placeholder={t('toPlaceholder')}
                        portLabel={portLabel}
                        defaultOpenCountry="GR"
                        countryLabels={{ TR: t('countryTurkey'), GR: t('countryGreece') }}
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
                      disabled={!canSearch}
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
