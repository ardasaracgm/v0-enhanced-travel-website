'use client'

import * as React from 'react'
import Image from 'next/image'
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslations, useLocale } from 'next-intl'
import { buildWhatsAppLink, getWhatsAppDisplay, getLandline } from '@/lib/contact'

import { Card, CardContent } from '@/components/ui/card'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { TrustBar } from '@/components/islandbee/trust-bar'
import { ContactForm } from '@/components/islandbee/contact-form'

export default function ContactPage() {
  const t = useTranslations('contactPage')
  const locale = useLocale()
  const landline = getLandline()
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero — car2 idiom: full-photo, soldan beyaz fade, sol blok (başlık+form), sağ kanal panelleri */}
        <section className="relative w-full overflow-hidden py-8 md:py-12">
          <div className="absolute inset-0">
            <Image
              src="/travelbeez-kos-office.webp"
              alt={t('title')}
              fill
              className="object-cover"
              priority
            />
            {/* soldan beyaz → sağ şeffaf (car2/ferry/insurance ailesi birebir) */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-white/20 to-transparent" />
          </div>

          <div className="container relative px-4 md:px-6">
            <div className="grid items-start gap-10 lg:grid-cols-[30rem_minmax(0,1fr)]">
              {/* SOL (30rem): eyebrow + başlık + subtitle → altına Form (car2 sol blok deseni) */}
              <div className="max-w-[30rem] space-y-6">
                <div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-blue-950"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t('eyebrow')}
                  </motion.div>
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-3 text-balance text-3xl font-bold text-blue-950 md:text-4xl lg:text-5xl"
                  >
                    {t('title')}
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-pretty text-lg text-blue-950/70 md:text-xl"
                  >
                    {t('subtitle')}
                  </motion.p>
                </div>

                {/* Form — car2 form kartı idiomu, opaklık /48 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="border-0 shadow-2xl bg-card/48 backdrop-blur">
                    <CardContent className="p-6 md:p-8">
                      <h2 className="text-2xl font-bold text-foreground mb-2">{t('formTitle')}</h2>
                      <p className="text-muted-foreground mb-6">
                        {t('formIntro')}
                      </p>
                      <ContactForm />
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* SAĞ (1fr): WhatsApp + Telefon + E-posta — cam+amber panel (insurance:549/transfer:438 birebir) */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className="space-y-4 max-w-sm"
              >
                {/* WhatsApp */}
                <div className="flex items-start gap-3 rounded-2xl bg-gradient-to-r from-white/40 to-transparent px-4 py-3 backdrop-blur-sm">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 shadow-sm">
                    <MessageCircle className="h-5 w-5 text-amber-500" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-950">{t('whatsappTitle')}</h3>
                    <p className="text-xs text-blue-950/70">{t('whatsappDesc')}</p>
                    <a
                      href={buildWhatsAppLink(locale)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {getWhatsAppDisplay(locale)}
                    </a>
                  </div>
                </div>

                {/* Telefon */}
                <div className="flex items-start gap-3 rounded-2xl bg-gradient-to-r from-white/40 to-transparent px-4 py-3 backdrop-blur-sm">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 shadow-sm">
                    <Phone className="h-5 w-5 text-amber-500" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-950">{t('phoneCardTitle')}</h3>
                    <p className="text-xs text-blue-950/70">{t('phoneDesc')}</p>
                    <a href={landline.href} className="text-sm font-medium text-primary hover:underline">
                      {landline.display}
                    </a>
                  </div>
                </div>

                {/* E-posta */}
                <div className="flex items-start gap-3 rounded-2xl bg-gradient-to-r from-white/40 to-transparent px-4 py-3 backdrop-blur-sm">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 shadow-sm">
                    <Mail className="h-5 w-5 text-amber-500" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-950">{t('emailTitle')}</h3>
                    <p className="text-xs text-blue-950/70">{t('emailDesc')}</p>
                    <a href="mailto:info@travelbeez.gr" className="text-sm font-medium text-primary hover:underline">
                      info@travelbeez.gr
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Map + Ofisimiz (Adres + Saatler) */}
        <section className="w-full py-12 md:py-16 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">{t('mapTitle')}</h2>
              <p className="text-muted-foreground">{t('mapSubtitle')}</p>
            </div>
            <div className="grid lg:grid-cols-3 gap-8 items-start">
              {/* Adres + Saatler — foto üstünde değil, opak kalır */}
              <div className="space-y-6">
                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <MapPin className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{t('addressTitle')}</h3>
                        <p className="text-muted-foreground text-sm mb-2">{t('officeDesc')}</p>
                        <p className="text-foreground text-sm">
                          {t('officeAddress')}<br />
                          <span className="text-muted-foreground">{t('officeNote')}</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <Clock className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{t('hoursTitle')}</h3>
                        <p className="text-muted-foreground text-sm mb-2">{t('hoursSeason')}</p>
                        <p className="text-foreground text-sm">
                          {t('hoursValue')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Map (2/3) */}
              <div className="lg:col-span-2 rounded-2xl overflow-hidden shadow-lg">
                <iframe
                  src="https://www.google.com/maps?q=36.897895,27.287188&z=17&output=embed"
                  width="100%"
                  height="400"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={t('mapTitle')}
                  className="h-full min-h-[400px]"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
