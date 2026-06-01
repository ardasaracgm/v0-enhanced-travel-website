'use client'

import * as React from 'react'
import Image from 'next/image'
import { Heart, Users, Building2, Cake, Anchor, UtensilsCrossed, Camera, Car, MapPin, CheckCircle, Star, Loader2, PartyPopper, CalendarDays, Send, Phone, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useTranslations } from 'next-intl'
import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { TrustBar } from '@/components/islandbee/trust-bar'
import { WhatsAppCTA } from '@/components/islandbee/whatsapp-cta'
import { TrustIndicators } from '@/components/islandbee/trust-indicators'
import { saveEventRequest } from '@/lib/supabase'

const services = [
  { id: 's1', icon: <Heart className="h-8 w-8" />, image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80' },
  { id: 's2', icon: <UtensilsCrossed className="h-8 w-8" />, image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80' },
  { id: 's3', icon: <Users className="h-8 w-8" />, image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80' },
  { id: 's4', icon: <Building2 className="h-8 w-8" />, image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80' },
  { id: 's5', icon: <Cake className="h-8 w-8" />, image: 'https://images.unsplash.com/photo-1510076857177-7470076d4098?w=600&q=80' },
  { id: 's6', icon: <Anchor className="h-8 w-8" />, image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80' },
]

const steps = [
  { number: '01', id: 's1' },
  { number: '02', id: 's2' },
  { number: '03', id: 's3' },
  { number: '04', id: 's4' },
]

const locations = [
  { id: 'kos', image: 'https://images.unsplash.com/photo-1601581875039-e899893d520c?w=400&q=80' },
  { id: 'rhodes', image: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&q=80' },
  { id: 'samos', image: 'https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=400&q=80' },
  { id: 'leros', image: 'https://images.unsplash.com/photo-1509233725247-49e657c54213?w=400&q=80' },
  { id: 'patmos', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&q=80' },
  { id: 'kalymnos', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80' },
]

const packages = [
  { id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }, { id: 'p5' },
]

// value = stable English value persisted to DB; key = translation key for display label
const eventTypes = [
  { value: 'Wedding', key: 'wedding' },
  { value: 'Private Dinner', key: 'privateDinner' },
  { value: 'Corporate Event', key: 'corporate' },
  { value: 'Birthday Celebration', key: 'birthday' },
  { value: 'Honeymoon', key: 'honeymoon' },
  { value: 'Group Holiday', key: 'groupHoliday' },
  { value: 'Anniversary', key: 'anniversary' },
  { value: 'Other', key: 'other' },
]

const islands = [
  { value: 'Kos', key: 'kos' },
  { value: 'Rhodes', key: 'rhodes' },
  { value: 'Samos', key: 'samos' },
  { value: 'Leros', key: 'leros' },
  { value: 'Patmos', key: 'patmos' },
  { value: 'Kalymnos', key: 'kalymnos' },
  { value: 'Multiple Islands', key: 'multiple' },
  { value: 'Not Sure Yet', key: 'notSure' },
]

export default function EventsPage() {
  const t = useTranslations('eventsPage')
  const tWa = useTranslations('whatsappCta')
  const [formData, setFormData] = React.useState({
    fullName: '',
    phone: '',
    email: '',
    eventType: '',
    islandPreference: '',
    groupSize: '',
    dateRange: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    const result = await saveEventRequest({
      full_name: formData.fullName,
      phone: formData.phone,
      email: formData.email,
      event_type: formData.eventType,
      island_preference: formData.islandPreference,
      group_size: parseInt(formData.groupSize) || 0,
      date_range: formData.dateRange,
      message: formData.message,
    })

    setIsSubmitting(false)

    if (result.success) {
      setSubmitStatus('success')
      setFormData({
        fullName: '',
        phone: '',
        email: '',
        eventType: '',
        islandPreference: '',
        groupSize: '',
        dateRange: '',
        message: '',
      })
    } else {
      setSubmitStatus('error')
      setErrorMessage(result.error || t('form.errFallback'))
      console.error('[v0] EventsPage: Form submission error:', result.error)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=80"
              alt="Wedding celebration on Greek island"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
          </div>
          
          <div className="container relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary mb-6">
                <PartyPopper className="h-4 w-4" />
                <span>{t('hero.badge')}</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                {t('hero.title')}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                {t('hero.subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
                  <a href="#contact-form">
                    <CalendarDays className="mr-2 h-5 w-5" />
                    {t('hero.planBtn')}
                  </a>
                </Button>
                <Button size="lg" variant="outline" className="border-primary/30 hover:border-primary hover:bg-primary/5" asChild>
                  <a href="https://wa.me/302242050008" target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    {tWa('buttonLong')}
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-20 bg-muted/30">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('services.title')}</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {t('services.intro')}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden h-full bg-card border-border/50 hover:border-primary/30 transition-all group">
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={service.image}
                        alt={t(`services.${service.id}Title`)}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                      <div className="absolute bottom-4 left-4 h-12 w-12 rounded-full bg-primary/90 flex items-center justify-center text-primary-foreground">
                        {service.icon}
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold text-foreground mb-2">{t(`services.${service.id}Title`)}</h3>
                      <p className="text-muted-foreground">{t(`services.${service.id}Desc`)}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('hiw.title')}</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {t('hiw.intro')}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-4 gap-8">
              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative text-center"
                >
                  <div className="text-6xl font-bold text-primary/20 mb-4">{step.number}</div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{t(`hiw.${step.id}Title`)}</h3>
                  <p className="text-muted-foreground">{t(`hiw.${step.id}Desc`)}</p>
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-[40%] h-px bg-border" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Locations */}
        <section className="py-20 bg-muted/30">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('locations.title')}</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {t('locations.intro')}
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {locations.map((location, index) => (
                <motion.div
                  key={location.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="relative group cursor-pointer"
                >
                  <div className="relative h-40 rounded-xl overflow-hidden">
                    <Image
                      src={location.image}
                      alt={t(`locItems.${location.id}.name`)}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="font-semibold text-foreground">{t(`locItems.${location.id}.name`)}</p>
                      <p className="text-xs text-muted-foreground">{t(`locItems.${location.id}.desc`)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Package Examples */}
        <section className="py-20">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('packages.title')}</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {t('packages.intro')}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg, index) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full bg-card border-border/50 hover:border-primary/30 transition-all">
                    <CardContent className="p-6">
                      <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                        {t(`packages.${pkg.id}Tag`)}
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">{t(`packages.${pkg.id}Title`)}</h3>
                      <p className="text-muted-foreground">{t(`packages.${pkg.id}Desc`)}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section id="contact-form" className="py-20 bg-muted/30">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('form.title')}</h2>
                <p className="text-muted-foreground text-lg mb-8">
                  {t('form.intro')}
                </p>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t('form.benefit1Title')}</p>
                      <p className="text-sm text-muted-foreground">{t('form.benefit1Desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t('form.benefit2Title')}</p>
                      <p className="text-sm text-muted-foreground">{t('form.benefit2Desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t('form.benefit3Title')}</p>
                      <p className="text-sm text-muted-foreground">{t('form.benefit3Desc')}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-6 rounded-xl bg-card border border-border/50">
                  <p className="font-medium text-foreground mb-2">{t('form.talkTitle')}</p>
                  <p className="text-sm text-muted-foreground mb-4">{t('form.talkDesc')}</p>
                  <Button variant="outline" className="w-full border-primary/30 hover:border-primary hover:bg-primary/5" asChild>
                    <a href="https://wa.me/302242050008" target="_blank" rel="noopener noreferrer">
                      <Phone className="mr-2 h-4 w-4" />
                      +30 22420 5008
                    </a>
                  </Button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <Card className="bg-card border-border/50">
                  <CardContent className="p-6 md:p-8">
                    {submitStatus === 'success' ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">{t('form.successTitle')}</h3>
                        <p className="text-muted-foreground mb-6">
                          {t('form.successBody')}
                        </p>
                        <Button onClick={() => setSubmitStatus('idle')} variant="outline">
                          {t('form.submitAnother')}
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="fullName">{t('form.fullName')}</Label>
                            <Input
                              id="fullName"
                              value={formData.fullName}
                              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                              placeholder={t('form.fullNamePh')}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">{t('form.phone')}</Label>
                            <Input
                              id="phone"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              placeholder={t('form.phonePh')}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">{t('form.email')}</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder={t('form.emailPh')}
                            required
                          />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="eventType">{t('form.eventType')}</Label>
                            <Select
                              value={formData.eventType}
                              onValueChange={(value) => setFormData({ ...formData, eventType: value })}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('form.eventTypePh')} />
                              </SelectTrigger>
                              <SelectContent>
                                {eventTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>{t(`eventTypes.${type.key}`)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="islandPreference">{t('form.islandPref')}</Label>
                            <Select
                              value={formData.islandPreference}
                              onValueChange={(value) => setFormData({ ...formData, islandPreference: value })}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('form.islandPrefPh')} />
                              </SelectTrigger>
                              <SelectContent>
                                {islands.map((island) => (
                                  <SelectItem key={island.value} value={island.value}>{t(`islandOptions.${island.key}`)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="groupSize">{t('form.groupSize')}</Label>
                            <Input
                              id="groupSize"
                              type="number"
                              min="1"
                              value={formData.groupSize}
                              onChange={(e) => setFormData({ ...formData, groupSize: e.target.value })}
                              placeholder={t('form.groupSizePh')}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="dateRange">{t('form.dates')}</Label>
                            <Input
                              id="dateRange"
                              value={formData.dateRange}
                              onChange={(e) => setFormData({ ...formData, dateRange: e.target.value })}
                              placeholder={t('form.datesPh')}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="message">{t('form.message')}</Label>
                          <Textarea
                            id="message"
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            placeholder={t('form.messagePh')}
                            rows={4}
                          />
                        </div>

                        {submitStatus === 'error' && (
                          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                            <p className="text-sm text-red-800">{errorMessage}</p>
                          </div>
                        )}

                        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t('form.sending')}
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" />
                              {t('form.submit')}
                            </>
                          )}
                        </Button>

                        <p className="text-xs text-muted-foreground text-center">
                          {t('form.consent')}
                        </p>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* WhatsApp CTA */}
        <WhatsAppCTA
          title={t('cta.title')}
          description={t('cta.desc')}
        />

        <TrustIndicators />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
