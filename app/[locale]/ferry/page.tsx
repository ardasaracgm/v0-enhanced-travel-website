'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Ship, Calendar, Users, MapPin, Clock, ChevronRight, CheckCircle, Star, Anchor, ArrowRight, ArrowLeftRight } from 'lucide-react'
import { motion } from 'framer-motion'

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
import { TrustBar } from '@/components/islandbee/trust-bar'
import { WhatsAppCTA } from '@/components/islandbee/whatsapp-cta'
import { TrustIndicators, SecurePaymentBanner } from '@/components/islandbee/trust-indicators'
import { useBooking } from '@/lib/booking-context'

const routes = [
  { from: 'Bodrum', to: 'Kos', duration: '1 hour', price: '€35', frequency: 'Daily', operator: 'Bodrum Express Lines' },
  { from: 'Turgutreis', to: 'Kos', duration: '40 min', price: '€30', frequency: 'Daily', operator: 'Turgutreis Lines' },
  { from: 'Marmaris', to: 'Rhodes', duration: '50 min', price: '€45', frequency: 'Daily', operator: 'Marmaris Ferries' },
  { from: 'Kusadasi', to: 'Samos', duration: '1.5 hours', price: '€40', frequency: 'Daily', operator: 'Meander Travel' },
]

const faqs = [
  {
    question: 'What documents do I need for the ferry crossing?',
    answer: 'You need a valid passport (at least 6 months validity). Turkish citizens traveling to Greece for tourism (up to 90 days in 180 days) may need a Schengen visa depending on current regulations. We recommend checking the latest requirements before booking.',
  },
  {
    question: 'Can I bring my car on the ferry?',
    answer: 'Most ferries between Turkey and the Greek islands are passenger-only. If you need a vehicle on the island, we recommend booking a car rental with us - we offer port pickup service in Kos.',
  },
  {
    question: 'What is the baggage allowance?',
    answer: 'Generally, you can bring hand luggage and 1-2 suitcases per person. There are no strict weight limits, but large or excessive luggage may incur additional fees. Contact us for specific ferry operator policies.',
  },
  {
    question: 'Can I change or cancel my ferry ticket?',
    answer: 'Yes, most tickets can be changed or cancelled up to 24 hours before departure with a small fee. Full refunds are available if cancelled 48+ hours in advance. Travel insurance can cover last-minute cancellations.',
  },
  {
    question: 'Is the ferry comfortable for families with children?',
    answer: 'Yes! Ferries have comfortable seating, air conditioning, and snack bars. The journey is relatively short (1-3 hours depending on route). Children under 4 often travel free or at reduced rates.',
  },
  {
    question: 'Do you offer round-trip tickets?',
    answer: 'Yes, we offer both one-way and round-trip tickets. Round-trip tickets are typically 10-15% cheaper than booking two one-way tickets separately.',
  },
]

export default function FerryTicketsPage() {
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
              alt="Ferry sailing in the Aegean Sea"
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
                Turkey to Greek Islands
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 text-balance"
              >
                Ferry Tickets to Greek Islands
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/90 text-lg md:text-xl mb-8 text-pretty"
              >
                Book your ferry crossing from Bodrum, Turgutreis, Marmaris, and Kusadasi to Kos, Rhodes, and Samos. Fast booking, best prices, Turkish support.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-4 text-sm text-white/80"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Instant Confirmation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Best Price Guarantee</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Free Cancellation</span>
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
                  <h2 className="text-xl font-bold text-foreground">Search Ferry Tickets</h2>
                  <RadioGroup
                    value={tripType}
                    onValueChange={(value) => setTripType(value as 'one-way' | 'round-trip')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="one-way" id="one-way" />
                      <Label htmlFor="one-way" className="cursor-pointer">One-way</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="round-trip" id="round-trip" />
                      <Label htmlFor="round-trip" className="cursor-pointer flex items-center gap-1">
                        <ArrowLeftRight className="h-4 w-4" />
                        Round-trip
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">From</label>
                    <Select value={from} onValueChange={setFrom}>
                      <SelectTrigger>
                        <SelectValue placeholder="Departure" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bodrum">Bodrum, Turkey</SelectItem>
                        <SelectItem value="turgutreis">Turgutreis, Turkey</SelectItem>
                        <SelectItem value="marmaris">Marmaris, Turkey</SelectItem>
                        <SelectItem value="kusadasi">Kusadasi, Turkey</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">To</label>
                    <Select value={to} onValueChange={setTo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Destination" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kos">Kos, Greece</SelectItem>
                        <SelectItem value="rhodes">Rhodes, Greece</SelectItem>
                        <SelectItem value="samos">Samos, Greece</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Departure Date</label>
                    <Input
                      type="date"
                      className="h-10"
                      min={todayAthens}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  {tripType === 'round-trip' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Return Date</label>
                      <Input
                        type="date"
                        className="h-10"
                        min={date || todayAthens}
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Passengers</label>
                    <Select value={passengers} onValueChange={setPassengers}>
                      <SelectTrigger>
                        <SelectValue placeholder="Passengers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Passenger</SelectItem>
                        <SelectItem value="2">2 Passengers</SelectItem>
                        <SelectItem value="3">3 Passengers</SelectItem>
                        <SelectItem value="4">4 Passengers</SelectItem>
                        <SelectItem value="5">5 Passengers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">&nbsp;</label>
                    <Button 
                      className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={handleSearch}
                    >
                      Search Ferries
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
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Popular Ferry Routes</h2>
              <p className="text-muted-foreground text-lg">Direct connections from Turkish coast to Greek islands</p>
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
                            <p className="text-xs text-muted-foreground">Turkey</p>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-primary" />
                        <div className="text-right">
                          <p className="font-bold text-foreground">{route.to}</p>
                          <p className="text-xs text-muted-foreground">Greece</p>
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
                          <span className="text-sm text-muted-foreground">From </span>
                          <span className="text-2xl font-bold text-primary">{route.price}</span>
                          <span className="text-sm text-muted-foreground">/person</span>
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
                          Book
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
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Why Book Ferry Tickets With Us?</h2>
              <p className="text-muted-foreground text-lg">The trusted choice for Turkish travelers to Greek islands</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-card border-border/50 text-center">
                <CardContent className="p-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Star className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Best Prices</h3>
                  <p className="text-muted-foreground">We compare all ferry operators to offer you the best available prices. No hidden fees.</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50 text-center">
                <CardContent className="p-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Anchor className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Local Expertise</h3>
                  <p className="text-muted-foreground">Our office in Kos Port means we know every route, schedule, and operator firsthand.</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50 text-center">
                <CardContent className="p-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Turkish Support</h3>
                  <p className="text-muted-foreground">Our Turkish-speaking team assists you before, during, and after your journey.</p>
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
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
                <p className="text-muted-foreground text-lg">Everything you need to know about ferry travel</p>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border-border/50">
                    <AccordionTrigger className="text-left text-foreground hover:text-primary">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        <SecurePaymentBanner />
        
        <WhatsAppCTA 
          title="Need Help With Ferry Booking?"
          description="Our team speaks Turkish and can help you find the perfect ferry schedule and best prices."
        />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
