'use client'

import * as React from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { FileText, MessageCircle, Clock, Calendar, AlertCircle, Shield, Users, Star, Phone, Mail, Building2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslations, useLocale } from 'next-intl'
import { getWhatsAppDisplay, getLandline } from '@/lib/contact'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { VisaWizard, type WizardPrefill } from './visa-wizard'
import { ENTRY_POINTS, VESSEL_TYPES } from '@/lib/validation/visa'
import { upperName } from '@/lib/text/uppercase'

type Stat = { key: string; number?: string; icon?: React.ComponentType<{ className?: string }> }

const stats: Stat[] = [
  { number: '2,400+', key: 'travelers' },
  { number: '95%', key: 'approval' },
  { number: '6+', key: 'experience' },
  { icon: MessageCircle, key: 'support' },
]

function VisaSupportPageInner() {
  const tForm = useTranslations('visaPage.form')
  const tm = useTranslations('visaPage.marketing')
  const locale = useLocale()
  const landline = getLandline()

  // Ana sayfa hero'sunun "Vize" sekmesi /visa?firstName=…&entryPoint=slug…
  // ile buraya gelir. URL query'sini oku → hem sayfa-içi hero mini-form'u
  // hem wizard prefill'ini besle. Slug'lar kutsal; boş/eksik alan okunmaz.
  const searchParams = useSearchParams()
  const heroFromUrl = React.useMemo(
    () => ({
      firstName: searchParams.get('firstName') ?? '',
      lastName: searchParams.get('lastName') ?? '',
      entryPoint: searchParams.get('entryPoint') ?? '',
      vesselType: searchParams.get('vesselType') ?? '',
      birthDate: searchParams.get('birthDate') ?? '',
    }),
    [searchParams],
  )

  // Hero mini-form — wizard'a köprü (state-lift). Value'lar slug (kutsal);
  // label/option metinleri visaPage.form anahtarlarından (locale-aware, reuse).
  // Başlangıç değeri URL'den (ana sayfa hero'su → prefill).
  const [hero, setHero] = React.useState(heroFromUrl)
  const updateHero = (k: keyof typeof hero, v: string) =>
    // Name fields uppercase as-typed so the hero shows — and the wizard prefill
    // carries — the passport shape (same upperName as the wizard/companion forms).
    setHero((h) => ({ ...h, [k]: k === 'firstName' || k === 'lastName' ? upperName(v) : v }))

  // Wizard'a geçen lifted prefill. URL'de ön-seçim varsa mount'ta set edilir,
  // yoksa Başlat'a basınca. Wizard useEffect([prefill]) mevcut form'a merge
  // eder (boş ezmez; nationality default TR korunur).
  const [prefill, setPrefill] = React.useState<WizardPrefill | null>(
    Object.values(heroFromUrl).some(Boolean) ? heroFromUrl : null,
  )

  const scrollToForm = () => {
    document
      .getElementById('visa-application-form')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // URL'de ön-seçim (en az 1 dolu param) varsa mount'ta forma kaydır — ana
  // sayfa hero'sundan /visa?…&entryPoint=… ile gelince. Param YOKSA scroll YOK
  // → normal sayfa davranışı (üst hero yerinde kalır). Hedef statik
  // #visa-application-form; prefill mount'ta zaten set (:78-80). rAF ile ilk
  // paint sonrası ateşle ki scrollIntoView hedefi ıskalamasın.
  React.useEffect(() => {
    if (!Object.values(heroFromUrl).some(Boolean)) return
    const raf = requestAnimationFrame(() => scrollToForm())
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Lift → scroll. sessionStorage YOK: hero+wizard aynı sayfada eşzamanlı mount.
  const handleHeroStart = () => {
    setPrefill(hero)
    scrollToForm()
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section — car2/insurance idiomu: açık sol-fade + blue-950 + amber */}
        <section className="hero-compact hero-compact-tight relative w-full overflow-hidden py-16 md:py-24">
          <div className="absolute inset-0">
            <Image
              src="/visa-hero.webp"
              alt="Schengen vize"
              fill
              className="object-cover"
              priority
            />
            {/* sol kenar hafif beyaz, orta/sağ canlı (insurance :294 deseni) */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/70 via-white/30 to-transparent" />
          </div>
          <div className="container relative px-4 md:px-6">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              {/* SOL: eyebrow + başlık + alt metin + mini-form */}
              <div className="max-w-xl space-y-6">
                {/* Eyebrow + fiyat rozeti yan yana (flex-wrap: mobilde dikey yığılır) */}
                <div className="flex flex-wrap items-center gap-3">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-blue-950"
                  >
                    <FileText className="h-4 w-4" />
                    {tm('hero.badge')}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-950 px-4 py-2 text-sm font-medium text-white"
                  >
                    {tm('hero.priceBadge')}
                    <span className="font-bold text-amber-400">90€</span>
                  </motion.div>
                </div>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-balance text-4xl font-bold text-blue-950 md:text-5xl lg:text-6xl"
                >
                  {tm('hero.title')}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-pretty text-lg text-blue-950/80 md:text-xl"
                >
                  {tm('hero.subtitle')}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="border-0 shadow-2xl bg-card/90 backdrop-blur">
                    <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="hero-firstName" className="text-blue-950">{tForm('labels.firstName')}</Label>
                        <Input
                          id="hero-firstName"
                          value={hero.firstName}
                          onChange={(e) => updateHero('firstName', e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hero-lastName" className="text-blue-950">{tForm('labels.lastName')}</Label>
                        <Input
                          id="hero-lastName"
                          value={hero.lastName}
                          onChange={(e) => updateHero('lastName', e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hero-entryPoint" className="text-blue-950">{tForm('labels.entryPoint')}</Label>
                        <Select value={hero.entryPoint} onValueChange={(v) => updateHero('entryPoint', v)}>
                          <SelectTrigger id="hero-entryPoint" className="h-11 rounded-xl">
                            <SelectValue placeholder={tForm('selectPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            {ENTRY_POINTS.map((val) => (
                              <SelectItem key={val} value={val}>{tForm(`options.entryPoint.${val}`)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hero-vesselType" className="text-blue-950">{tForm('labels.vesselType')}</Label>
                        <Select value={hero.vesselType} onValueChange={(v) => updateHero('vesselType', v)}>
                          <SelectTrigger id="hero-vesselType" className="h-11 rounded-xl">
                            <SelectValue placeholder={tForm('selectPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            {VESSEL_TYPES.map((val) => (
                              <SelectItem key={val} value={val}>{tForm(`options.vesselType.${val}`)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="hero-birthDate" className="text-blue-950">{tForm('labels.birthDate')}</Label>
                        <Input
                          id="hero-birthDate"
                          type="date"
                          value={hero.birthDate}
                          onChange={(e) => updateHero('birthDate', e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <Button
                        onClick={handleHeroStart}
                        className="h-11 w-full bg-amber-400 text-blue-950 hover:bg-amber-500 sm:col-span-2"
                      >
                        {tm('hero.start')}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* SAĞ: görsel zaten arka planda; bu kolon foto'nun sağını açar (fade) */}
              <div className="hidden lg:block" aria-hidden />
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="w-full py-12 -mt-8 relative z-10">
          <div className="container px-4 md:px-6">
            <Card className="border-0 shadow-2xl bg-card">
              <CardContent className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {stats.map((stat) => (
                    <div key={stat.key} className="text-center">
                      {stat.icon ? (
                        <stat.icon className="mx-auto mb-1 h-9 w-9 text-primary" />
                      ) : (
                        <p className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.number}</p>
                      )}
                      <p className="text-sm text-muted-foreground">{tm(`stats.${stat.key}`)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Visa Application Form */}
        <section id="visa-application-form" className="w-full pb-10 md:pb-12 scroll-mt-20 bg-gradient-to-b from-sky-50 via-blue-50/60 to-white">
          <div className="container px-4 md:px-6">
            <VisaWizard prefill={prefill} />
          </div>
        </section>

        {/* How It Works */}
        <section className="w-full py-16 md:py-24 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{tm('how.title')}</h2>
              <p className="text-muted-foreground text-lg">{tm('how.subtitle')}</p>
            </div>
            <div className="grid md:grid-cols-4 gap-8">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-primary">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">{tm(`how.steps.${i}.title`)}</h3>
                    <p className="text-sm text-muted-foreground">{tm(`how.steps.${i}.description`)}</p>
                  </div>
                  {i < 3 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-[40%] h-px bg-border" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <TrustIndicators />

        {/* Important Notice */}
        <section className="w-full py-12">
          <div className="container px-4 md:px-6">
            <Card className="bg-accent/10 border-accent/30">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <AlertCircle className="h-6 w-6 text-accent shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{tm('notice.title')}</h3>
                    <p className="text-muted-foreground text-sm">
                      {tm('notice.body')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">{tm('why.title')}</h2>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl h-fit">
                      <Star className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{tm('why.items.0.title')}</h3>
                      <p className="text-muted-foreground">{tm('why.items.0.body')}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl h-fit">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{tm('why.items.1.title')}</h3>
                      <p className="text-muted-foreground">{tm('why.items.1.body')}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl h-fit">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{tm('why.items.2.title')}</h3>
                      <p className="text-muted-foreground">{tm('why.items.2.body')}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl h-fit">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{tm('why.items.3.title')}</h3>
                      <p className="text-muted-foreground">{tm('why.items.3.body')}</p>
                    </div>
                  </div>
                </div>
              </div>
              <Card className="bg-card border-border/50">
                <CardContent className="p-8">
                  <h3 className="font-bold text-xl text-foreground mb-6">{tm('contact.title')}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <MessageCircle className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">WhatsApp</p>
                        <p className="font-medium text-foreground">{getWhatsAppDisplay(locale)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <Phone className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">{tm('contact.phone')}</p>
                        <p className="font-medium text-foreground">{landline.display}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <Mail className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">{tm('contact.email')}</p>
                        <p className="font-medium text-foreground">visa@travelbeez.gr</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">{tm('contact.responseTime')}</p>
                        <p className="font-medium text-foreground">{tm('contact.responseValue')}</p>
                      </div>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={scrollToForm}
                  >
                    {tm('contact.cta')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="w-full py-16 md:py-24 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{tm('faq.title')}</h2>
                <p className="text-muted-foreground text-lg">{tm('faq.subtitle')}</p>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="border-border/50">
                    <AccordionTrigger className="text-left text-foreground hover:text-primary">
                      {tm(`faq.items.${i}.question`)}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {tm(`faq.items.${i}.answer`)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        <SecurePaymentBanner />
        
        <WhatsAppCTA 
          title={tm('cta.title')}
          description={tm('cta.description')}
        />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}

// useSearchParams App Router'da Suspense sınırı ister (yoksa build kırılır —
// login/page.tsx aynı desen). Sayfa gövdesini sarmalıyoruz.
export default function VisaClient() {
  return (
    <React.Suspense fallback={null}>
      <VisaSupportPageInner />
    </React.Suspense>
  )
}
