'use client'

import * as React from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import {
  Package,
  MapPin,
  Bell,
  CheckCircle,
  Shield,
  MessageCircle,
  Globe,
  Camera,
  Users,
  Clock,
  Box,
  Calendar,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const storageOptions = [
  { id: 'small', price: '5', periodKey: 'perDay', icon: <Box className="h-6 w-6" /> },
  { id: 'medium', price: '8', periodKey: 'perDay', icon: <Box className="h-7 w-7" />, popular: true },
  { id: 'large', price: '12', periodKey: 'perDay', icon: <Box className="h-8 w-8" /> },
  { id: 'bag', price: '5', periodKey: 'perDay', icon: <Package className="h-6 w-6" /> },
  { id: 'monthly', price: '50', periodKey: 'perMonth', icon: <Calendar className="h-6 w-6" /> },
]

const howItWorks = [
  { step: 1, icon: <MessageCircle className="h-6 w-6" /> },
  { step: 2, icon: <MapPin className="h-6 w-6" /> },
  { step: 3, icon: <Bell className="h-6 w-6" /> },
  { step: 4, icon: <CheckCircle className="h-6 w-6" /> },
]

const trustFeatures = [
  { id: 'f1', icon: <MapPin className="h-6 w-6" /> },
  { id: 'f2', icon: <Users className="h-6 w-6" /> },
  { id: 'f3', icon: <Camera className="h-6 w-6" /> },
  { id: 'f4', icon: <MessageCircle className="h-6 w-6" /> },
  { id: 'f5', icon: <Globe className="h-6 w-6" /> },
]

export default function PackagePickupPage() {
  const t = useTranslations('packagePickupPage')
  const tWa = useTranslations('whatsappCta')
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-16 md:py-24 lg:py-32 overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1920&q=80"
              alt="Package delivery and storage"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background" />
          </div>
          <div className="container relative px-4 md:px-6">
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
              >
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">{t('hero.badge')}</span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance"
              >
                {t('hero.titleLead')} <span className="text-primary">{t('hero.titleHighlight')}</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground max-w-xl md:text-lg text-pretty"
              >
                {t('hero.subtitle')}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link href="https://wa.me/302242050008?text=Merhaba,%20paket%20teslim%20hizmeti%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum" target="_blank">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                    <MessageCircle className="h-5 w-5" />
                    {t('hero.ctaReserve')}
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="w-full py-16 md:py-24 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('hiw.title')}</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t('hiw.intro')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {howItWorks.map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full border-border/50 hover:border-primary/30 transition-colors relative">
                    <div className="absolute -top-4 left-6 bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                      {item.step}
                    </div>
                    <CardContent className="pt-8 pb-6">
                      <div className="p-3 rounded-lg bg-primary/10 text-primary w-fit mb-4">
                        {item.icon}
                      </div>
                      <h3 className="font-semibold text-foreground mb-2">{t(`hiw.step${item.step}Title`)}</h3>
                      <p className="text-sm text-muted-foreground">{t(`hiw.step${item.step}Desc`)}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Storage Options */}
        <section className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('storage.title')}</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t('storage.intro')}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {storageOptions.map((option, index) => (
                <motion.div
                  key={option.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`h-full border-border/50 hover:border-primary/30 transition-colors relative ${option.popular ? 'ring-2 ring-primary' : ''}`}>
                    {option.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                        {t('storage.popular')}
                      </Badge>
                    )}
                    <CardContent className="pt-8 pb-6 text-center">
                      <div className="p-3 rounded-lg bg-primary/10 text-primary w-fit mx-auto mb-4">
                        {option.icon}
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">{t(`storage.${option.id}Name`)}</h3>
                      <p className="text-xs text-muted-foreground mb-4">{t(`storage.${option.id}Desc`)}</p>
                      <div className="text-2xl font-bold text-primary">
                        &euro;{option.price}
                        <span className="text-sm font-normal text-muted-foreground ml-1">{t(`storage.${option.periodKey}`)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="w-full py-16 md:py-24 bg-gradient-to-br from-primary/5 via-background to-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('trust.title')}</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t('trust.intro')}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {trustFeatures.map((feature, index) => (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border/50"
                >
                  <div className="p-3 rounded-lg bg-primary/10 text-primary mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{t(`trust.${feature.id}Title`)}</h3>
                  <p className="text-sm text-muted-foreground">{t(`trust.${feature.id}Desc`)}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Important Notice */}
        <section className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-600 flex-shrink-0">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{t('notice.title')}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t('notice.body')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-16 md:py-24 bg-primary">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                {t('cta.title')}
              </h2>
              <p className="text-primary-foreground/80 mb-8">
                {t('cta.subtitle')}
              </p>
              <Link href="https://wa.me/302242050008?text=Merhaba,%20paket%20teslim%20hizmeti%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum" target="_blank">
                <Button size="lg" variant="secondary" className="gap-2">
                  <MessageCircle className="h-5 w-5" />
                  {tWa('buttonLong')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
