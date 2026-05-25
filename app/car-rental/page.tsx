'use client'

import * as React from 'react'
import Image from 'next/image'
import { Car, Calendar, MapPin, CheckCircle, Star, Shield, Fuel, Users, Settings, Zap, AlertCircle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { Alert, AlertDescription } from '@/components/ui/alert'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { TrustBar } from '@/components/islandbee/trust-bar'
import { WhatsAppCTA } from '@/components/islandbee/whatsapp-cta'
import { TrustIndicators, SecurePaymentBanner } from '@/components/islandbee/trust-indicators'
import { getAvailableCars, type Car as CarType } from '@/lib/supabase'

// Fallback data in case database is empty or unavailable
const fallbackCarFleet = [
  { 
    id: 'fallback-1',
    type: 'City Car', 
    model: 'Citroen Ami', 
    price: 19, 
    image: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=600&q=80', 
    features: ['Electric', '2 Seats', 'Auto'],
    specs: { fuel: 'Electric', seats: 2, transmission: 'Automatic', ac: true },
    badge: 'Eco-Friendly',
    description: 'Perfect for couples exploring Kos Town. 100% electric, easy to park, and fun to drive along the coast.',
    available: true,
  },
  { 
    id: 'fallback-2',
    type: 'Economy', 
    model: 'Fiat Panda', 
    price: 25, 
    image: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80', 
    features: ['Petrol', '4 Seats', 'Manual'],
    specs: { fuel: 'Petrol', seats: 4, transmission: 'Manual', ac: true },
    badge: 'Most Popular',
    description: 'Our most popular choice for families. Reliable, fuel-efficient, and perfect for island exploration.',
    available: true,
  },
  { 
    id: 'fallback-3',
    type: 'Compact', 
    model: 'DFSK 500', 
    price: 29, 
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80', 
    features: ['Petrol', '5 Seats', 'Manual'],
    specs: { fuel: 'Petrol', seats: 5, transmission: 'Manual', ac: true },
    badge: 'Best Value',
    description: 'Spacious and comfortable for families or groups. Great luggage space for longer stays.',
    available: true,
  },
]

const faqs = [
  {
    question: 'What documents do I need to rent a car in Kos?',
    answer: 'You need a valid driving license (held for at least 1 year), passport or ID, and a credit/debit card. International Driving Permits (IDP) are recommended but not required for EU and Turkish licenses.',
  },
  {
    question: 'Can you deliver the car to the port when I arrive?',
    answer: 'Yes! Port delivery is included free of charge. We will meet you at Kos Port with your car ready and waiting. Just let us know your ferry arrival time.',
  },
  {
    question: 'Is insurance included in the price?',
    answer: 'Yes, all rentals include basic insurance (CDW - Collision Damage Waiver and TPL - Third Party Liability). We also offer full coverage upgrades that eliminate your excess for complete peace of mind.',
  },
  {
    question: 'What is your fuel policy?',
    answer: 'We operate a "full to full" policy. You receive the car with a full tank and return it with a full tank. Fuel stations are easy to find throughout Kos.',
  },
  {
    question: 'Can I drive to other islands with the rental car?',
    answer: 'Our cars are only authorized for use on Kos Island. If you want to visit other islands, we recommend taking a ferry as a foot passenger or booking one of our island-hopping tours.',
  },
  {
    question: 'What is the minimum age to rent a car?',
    answer: 'The minimum age is 21 years old, and you must have held your driving license for at least 1 year. Drivers under 25 may have a young driver surcharge depending on the vehicle category.',
  },
]

const benefits = [
  { icon: <MapPin className="h-6 w-6" />, title: 'Port Pickup', description: 'Free delivery to Kos Port' },
  { icon: <Shield className="h-6 w-6" />, title: 'Full Insurance', description: 'CDW & TPL included' },
  { icon: <Fuel className="h-6 w-6" />, title: 'No Hidden Fees', description: 'Transparent pricing' },
  { icon: <Star className="h-6 w-6" />, title: '24/7 Support', description: 'Turkish speaking staff' },
]

export default function CarRentalPage() {
  const [cars, setCars] = React.useState<CarType[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [usingFallback, setUsingFallback] = React.useState(false)
  const [fallbackReason, setFallbackReason] = React.useState<string>('')

  React.useEffect(() => {
    async function fetchCars() {
      console.log('[v0] CarRentalPage: Starting car fetch...')
      setLoading(true)
      setError(null)
      setUsingFallback(false)
      
      const { data, error: fetchError, isEmpty } = await getAvailableCars()
      
      console.log('[v0] CarRentalPage: Fetch result:', { 
        dataLength: data?.length, 
        error: fetchError?.message,
        isEmpty 
      })
      
      if (fetchError) {
        console.error('[v0] CarRentalPage: Fetch error:', fetchError.message)
        setError(fetchError.message)
        setCars(fallbackCarFleet as CarType[])
        setUsingFallback(true)
        setFallbackReason(`Database error: ${fetchError.message}`)
      } else if (isEmpty || !data || data.length === 0) {
        console.log('[v0] CarRentalPage: No cars in database, using fallback')
        setCars(fallbackCarFleet as CarType[])
        setUsingFallback(true)
        setFallbackReason('No cars found in database. Showing default fleet.')
      } else {
        console.log('[v0] CarRentalPage: Successfully loaded', data.length, 'cars from database')
        setCars(data)
      }
      setLoading(false)
    }

    fetchCars()
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TrustBar />
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80"
              alt="Scenic coastal road in Greece"
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
                <Car className="h-4 w-4" />
                Kos Island Fleet
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 text-balance"
              >
                Car Rental in Kos Island
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/90 text-lg md:text-xl mb-8 text-pretty"
              >
                Explore Kos at your own pace with our reliable, well-maintained cars. Free port pickup, full insurance included, and Turkish-speaking support.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-4 text-sm text-white/80"
              >
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span>{benefit.title}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Search Section */}
        <section className="w-full py-12 md:py-16 -mt-8 relative z-10">
          <div className="container px-4 md:px-6">
            <Card className="border-0 shadow-2xl bg-card">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-xl font-bold text-foreground mb-6">Search Available Cars</h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Pickup Location</label>
                    <Select defaultValue="port">
                      <SelectTrigger>
                        <SelectValue placeholder="Location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="port">Kos Port (Free)</SelectItem>
                        <SelectItem value="airport">Kos Airport (+10)</SelectItem>
                        <SelectItem value="hotel">Hotel Delivery (+5)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Pickup Date</label>
                    <Input type="date" className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Return Date</label>
                    <Input type="date" className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Driver Age</label>
                    <Select defaultValue="25+">
                      <SelectTrigger>
                        <SelectValue placeholder="Age" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="21-24">21-24 years</SelectItem>
                        <SelectItem value="25+">25+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">&nbsp;</label>
                    <Button className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground">
                      Search Cars
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Car Fleet */}
        <section className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Our Car Fleet</h2>
              <p className="text-muted-foreground text-lg">Well-maintained vehicles perfect for exploring Kos Island</p>
            </div>
            
            {error && (
              <Alert className="mb-8 max-w-2xl mx-auto border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Database Error:</strong> {error}
                </AlertDescription>
              </Alert>
            )}
            
            {usingFallback && !error && (
              <Alert className="mb-8 max-w-2xl mx-auto border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  {fallbackReason}
                </AlertDescription>
              </Alert>
            )}
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Loading available cars...</span>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-8">
                {cars.map((car, index) => (
                  <motion.div
                    key={car.id || car.model}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-card border-border/50 h-full">
                      <CardContent className="p-0 flex flex-col h-full">
                        <div className="relative h-56 bg-gradient-to-br from-muted to-muted/50">
                          <Image
                            src={car.image}
                            alt={car.model}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute top-3 left-3 flex gap-2">
                            <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                              {car.type}
                            </span>
                            {car.badge && (
                              <span className="px-3 py-1 bg-accent text-accent-foreground text-xs font-medium rounded-full">
                                {car.badge}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-6 flex flex-col flex-1">
                          <h3 className="font-bold text-2xl text-foreground mb-2">{car.model}</h3>
                          <p className="text-muted-foreground text-sm mb-4">{car.description}</p>
                          
                          <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="flex items-center gap-2 text-sm text-foreground">
                              <Fuel className="h-4 w-4 text-primary" />
                              <span>{car.specs.fuel}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-foreground">
                              <Users className="h-4 w-4 text-primary" />
                              <span>{car.specs.seats} Seats</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-foreground">
                              <Settings className="h-4 w-4 text-primary" />
                              <span>{car.specs.transmission}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-foreground">
                              <Zap className="h-4 w-4 text-primary" />
                              <span>A/C</span>
                            </div>
                          </div>
                          
                          <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
                            <div>
                              <span className="text-3xl font-bold text-primary">&euro;{car.price}</span>
                              <span className="text-muted-foreground text-sm">/day</span>
                            </div>
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Book Now</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
            
            {/* Included Features */}
            <div className="mt-12 p-6 bg-card rounded-2xl border border-border/50">
              <h3 className="font-semibold text-foreground text-center mb-6">All Rentals Include</h3>
              <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Full insurance (CDW + TPL)</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Unlimited kilometers</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Free port delivery</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>24/7 roadside assistance</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>No hidden fees</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <TrustIndicators />

        {/* Why Rent With Us */}
        <section className="w-full py-16 md:py-24 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Why Rent With IslandBee?</h2>
                <div className="space-y-6">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl h-fit">
                        {React.cloneElement(benefit.icon, { className: 'h-6 w-6 text-primary' })}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{benefit.title}</h3>
                        <p className="text-muted-foreground">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative h-[400px] rounded-2xl overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"
                  alt="Scenic drive in Kos"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-white text-lg font-semibold">Explore Kos Island</p>
                  <p className="text-white/80 text-sm">Beautiful beaches, ancient ruins, and charming villages await</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
                <p className="text-muted-foreground text-lg">Everything you need to know about car rental in Kos</p>
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
          title="Need Help Choosing a Car?"
          description="Our team can recommend the perfect car for your trip and answer any questions in Turkish."
        />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
