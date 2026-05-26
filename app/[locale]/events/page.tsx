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

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { TrustBar } from '@/components/islandbee/trust-bar'
import { WhatsAppCTA } from '@/components/islandbee/whatsapp-cta'
import { TrustIndicators } from '@/components/islandbee/trust-indicators'
import { saveEventRequest } from '@/lib/supabase'

const services = [
  { 
    icon: <Heart className="h-8 w-8" />, 
    title: 'Island Weddings', 
    description: 'Intimate ceremonies and celebrations on stunning Greek island venues with full coordination.',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80'
  },
  { 
    icon: <UtensilsCrossed className="h-8 w-8" />, 
    title: 'Private Dinners', 
    description: 'Exclusive seaside dining experiences at handpicked restaurants with curated menus.',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80'
  },
  { 
    icon: <Users className="h-8 w-8" />, 
    title: 'Group Accommodation', 
    description: 'Coordinated hotel bookings and villa rentals for groups of any size.',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80'
  },
  { 
    icon: <Building2 className="h-8 w-8" />, 
    title: 'Corporate Retreats', 
    description: 'Team building events, conferences, and business getaways on Greek islands.',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80'
  },
  { 
    icon: <Cake className="h-8 w-8" />, 
    title: 'Honeymoon & Celebrations', 
    description: 'Romantic getaways, anniversaries, and birthday celebrations with special touches.',
    image: 'https://images.unsplash.com/photo-1510076857177-7470076d4098?w=600&q=80'
  },
  { 
    icon: <Anchor className="h-8 w-8" />, 
    title: 'Private Boat Experiences', 
    description: 'Charter yachts and traditional boats for private island hopping adventures.',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80'
  },
]

const steps = [
  { number: '01', title: 'Share Your Vision', description: 'Tell us your group size, dates, and what you have in mind for your event.' },
  { number: '02', title: 'Custom Planning', description: 'We prepare a tailored island plan with venues, activities, and logistics.' },
  { number: '03', title: 'Full Coordination', description: 'We handle ferry, hotel, transfers, restaurants, and special experiences.' },
  { number: '04', title: 'Enjoy Seamlessly', description: 'You arrive and enjoy — we take care of every detail on the ground.' },
]

const locations = [
  { name: 'Kos', description: 'Historic charm meets beach life', image: 'https://images.unsplash.com/photo-1601581875039-e899893d520c?w=400&q=80' },
  { name: 'Rhodes', description: 'Medieval grandeur by the sea', image: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&q=80' },
  { name: 'Samos', description: 'Lush mountains and vineyards', image: 'https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=400&q=80' },
  { name: 'Leros', description: 'Authentic and unspoiled', image: 'https://images.unsplash.com/photo-1509233725247-49e657c54213?w=400&q=80' },
  { name: 'Patmos', description: 'Spiritual and serene', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&q=80' },
  { name: 'Kalymnos', description: 'Adventure and tradition', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80' },
]

const packages = [
  { title: 'Kos Wedding Weekend', description: 'Ceremony, reception, and 2-night stay for up to 30 guests', highlight: 'Full Service' },
  { title: 'Private Dinner by the Sea', description: 'Sunset dinner at exclusive venue with transfers', highlight: 'Intimate' },
  { title: 'Corporate Island Escape', description: '3-day retreat with team activities and accommodation', highlight: 'Team Building' },
  { title: 'Family Group Holiday', description: 'Multi-generational trip with coordinated stays and tours', highlight: 'All Ages' },
  { title: 'Honeymoon in the Aegean', description: 'Romantic island hopping with luxury touches', highlight: 'Romance' },
]

const eventTypes = [
  'Wedding',
  'Private Dinner',
  'Corporate Event',
  'Birthday Celebration',
  'Honeymoon',
  'Group Holiday',
  'Anniversary',
  'Other',
]

const islands = ['Kos', 'Rhodes', 'Samos', 'Leros', 'Patmos', 'Kalymnos', 'Multiple Islands', 'Not Sure Yet']

export default function EventsPage() {
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
      setErrorMessage(result.error || 'Failed to submit request')
      console.error('[v0] EventsPage: Form submission error:', result.error)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TrustBar />
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
                <span>Events & Group Travel</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Greek Islands Events & Group Travel
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                Weddings, private dinners, group stays and unforgettable island experiences planned from Turkey to Greece.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
                  <a href="#contact-form">
                    <CalendarDays className="mr-2 h-5 w-5" />
                    Plan Your Event
                  </a>
                </Button>
                <Button size="lg" variant="outline" className="border-primary/30 hover:border-primary hover:bg-primary/5" asChild>
                  <a href="https://wa.me/302242050008" target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Chat on WhatsApp
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
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Our Event Services</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                From intimate celebrations to large group gatherings, we handle every detail of your Greek island experience.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <motion.div
                  key={service.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden h-full bg-card border-border/50 hover:border-primary/30 transition-all group">
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={service.image}
                        alt={service.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                      <div className="absolute bottom-4 left-4 h-12 w-12 rounded-full bg-primary/90 flex items-center justify-center text-primary-foreground">
                        {service.icon}
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold text-foreground mb-2">{service.title}</h3>
                      <p className="text-muted-foreground">{service.description}</p>
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
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How It Works</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                From first contact to unforgettable memories, we guide you through every step.
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
                  <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
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
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Popular Event Destinations</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Each Greek island offers unique venues and experiences for your special occasion.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {locations.map((location, index) => (
                <motion.div
                  key={location.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="relative group cursor-pointer"
                >
                  <div className="relative h-40 rounded-xl overflow-hidden">
                    <Image
                      src={location.image}
                      alt={location.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="font-semibold text-foreground">{location.name}</p>
                      <p className="text-xs text-muted-foreground">{location.description}</p>
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
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Package Examples</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Every event is custom-planned, but here are some popular experiences we create.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg, index) => (
                <motion.div
                  key={pkg.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full bg-card border-border/50 hover:border-primary/30 transition-all">
                    <CardContent className="p-6">
                      <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                        {pkg.highlight}
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">{pkg.title}</h3>
                      <p className="text-muted-foreground">{pkg.description}</p>
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
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Plan Your Event</h2>
                <p className="text-muted-foreground text-lg mb-8">
                  Tell us about your dream Greek island event. We will create a custom proposal tailored to your needs.
                </p>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Free Consultation</p>
                      <p className="text-sm text-muted-foreground">No commitment required — we will discuss your vision first.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Local Expertise</p>
                      <p className="text-sm text-muted-foreground">6+ years of planning events across the Dodecanese islands.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">End-to-End Service</p>
                      <p className="text-sm text-muted-foreground">From ferry tickets to venue decor — we coordinate everything.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-6 rounded-xl bg-card border border-border/50">
                  <p className="font-medium text-foreground mb-2">Prefer to talk directly?</p>
                  <p className="text-sm text-muted-foreground mb-4">Reach us on WhatsApp for immediate assistance.</p>
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
                        <h3 className="text-xl font-semibold text-foreground mb-2">Request Received!</h3>
                        <p className="text-muted-foreground mb-6">
                          Thank you for your interest. We will contact you within 24 hours with a custom proposal.
                        </p>
                        <Button onClick={() => setSubmitStatus('idle')} variant="outline">
                          Submit Another Request
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name *</Label>
                            <Input
                              id="fullName"
                              value={formData.fullName}
                              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                              placeholder="Your name"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone / WhatsApp *</Label>
                            <Input
                              id="phone"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              placeholder="+90 5XX XXX XX XX"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="your@email.com"
                            required
                          />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="eventType">Event Type *</Label>
                            <Select
                              value={formData.eventType}
                              onValueChange={(value) => setFormData({ ...formData, eventType: value })}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {eventTypes.map((type) => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="islandPreference">Island Preference *</Label>
                            <Select
                              value={formData.islandPreference}
                              onValueChange={(value) => setFormData({ ...formData, islandPreference: value })}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select island" />
                              </SelectTrigger>
                              <SelectContent>
                                {islands.map((island) => (
                                  <SelectItem key={island} value={island}>{island}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="groupSize">Group Size *</Label>
                            <Input
                              id="groupSize"
                              type="number"
                              min="1"
                              value={formData.groupSize}
                              onChange={(e) => setFormData({ ...formData, groupSize: e.target.value })}
                              placeholder="Number of guests"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="dateRange">Preferred Dates *</Label>
                            <Input
                              id="dateRange"
                              value={formData.dateRange}
                              onChange={(e) => setFormData({ ...formData, dateRange: e.target.value })}
                              placeholder="e.g., July 15-20, 2025"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="message">Tell Us More (Optional)</Label>
                          <Textarea
                            id="message"
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            placeholder="Describe your vision, special requests, or any questions..."
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
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" />
                              Send Event Request
                            </>
                          )}
                        </Button>

                        <p className="text-xs text-muted-foreground text-center">
                          By submitting, you agree to be contacted regarding your event inquiry.
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
          title="Tell us your dream island event"
          description="We will plan the rest."
        />

        <TrustIndicators />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
