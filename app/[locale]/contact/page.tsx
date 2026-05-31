'use client'

import * as React from 'react'
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

import { Card, CardContent } from '@/components/ui/card'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { TrustBar } from '@/components/islandbee/trust-bar'
import { ContactForm } from '@/components/islandbee/contact-form'

export default function ContactPage() {
  const t = useTranslations('contactPage')
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-16 md:py-24 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="container px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-2xl mx-auto"
            >
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
                {t('title')}
              </h1>
              <p className="text-muted-foreground text-lg">
                {t('subtitle')}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Contact Info */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
              >
                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-[#25D366]/10 rounded-xl">
                        <MessageCircle className="h-6 w-6 text-[#25D366]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{t('whatsappTitle')}</h3>
                        <p className="text-muted-foreground text-sm mb-2">{t('whatsappDesc')}</p>
                        <a 
                          href="https://wa.me/302242050009" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary font-medium hover:underline"
                        >
                          +30 22420 5009
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <Phone className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{t('phoneCardTitle')}</h3>
                        <p className="text-muted-foreground text-sm mb-2">{t('phoneDesc')}</p>
                        <a 
                          href="tel:+302242050008" 
                          className="text-primary font-medium hover:underline"
                        >
                          +30 22420 5008
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <Mail className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{t('emailTitle')}</h3>
                        <p className="text-muted-foreground text-sm mb-2">{t('emailDesc')}</p>
                        <a
                          href="mailto:info@travelbeez.gr"
                          className="text-primary font-medium hover:underline"
                        >
                          info@travelbeez.gr
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

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
              </motion.div>

              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-2"
              >
                <Card className="border-border/50">
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
          </div>
        </section>

        {/* Map Section */}
        <section className="w-full py-12 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">{t('mapTitle')}</h2>
              <p className="text-muted-foreground">{t('mapSubtitle')}</p>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <iframe
                src="https://www.google.com/maps?q=36.897895,27.287188&z=17&output=embed"
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={t('mapTitle')}
              />
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
