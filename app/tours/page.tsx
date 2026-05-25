'use client'

import * as React from 'react'
import Image from 'next/image'
import { Compass, Calendar, Clock, Users, MapPin, CheckCircle, Star, Ship, Camera, Sun, Waves } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

const tours = [
  { 
    name: 'Three Islands Cruise', 
    duration: 'Full Day (8h)', 
    price: '89', 
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80',
    category: 'Boat Tour',
    islands: ['Kos', 'Kalymnos', 'Pserimos'],
    description: 'Visit three stunning islands in one day. Swim in crystal-clear waters, explore traditional villages, and enjoy a Greek lunch on board.',
    includes: ['Boat transfer', 'Greek lunch', 'Swimming stops', 'Guide'],
    badge: 'Best Seller'
  },
  { 
    name: 'Rhodes Old Town Day Trip', 
    duration: '10 Hours', 
    price: '95', 
    image: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=600&q=80',
    category: 'Cultural',
    islands: ['Rhodes'],
    description: 'Explore the UNESCO World Heritage medieval old town of Rhodes, the Palace of the Grand Master, and the famous Street of Knights.',
    includes: ['Ferry tickets', 'Walking tour', 'Free time', 'Guide'],
    badge: 'Popular'
  },
  { 
    name: 'Sunset Sailing Adventure', 
    duration: '4 Hours', 
    price: '75', 
    image: 'https://images.unsplash.com/photo-1500514966906-fe245eea9344?w=600&q=80',
    category: 'Sailing',
    islands: ['Kos Coast'],
    description: 'Sail along the Kos coastline as the sun sets over the Aegean. Includes swimming, snorkeling, and champagne toast.',
    includes: ['Sailing yacht', 'Snorkeling gear', 'Drinks & snacks', 'Captain'],
    badge: null
  },
  { 
    name: 'Ancient Asklepion & Wine Tour', 
    duration: '5 Hours', 
    price: '55', 
    image: 'https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?w=600&q=80',
    category: 'Cultural',
    islands: ['Kos'],
    description: 'Visit the ancient healing temple of Asklepion where Hippocrates taught medicine, followed by wine tasting at a local vineyard.',
    includes: ['Transport', 'Entrance fees', 'Wine tasting', 'Guide'],
    badge: null
  },
  { 
    name: 'Nisyros Volcano Excursion', 
    duration: 'Full Day (9h)', 
    price: '85', 
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80',
    category: 'Adventure',
    islands: ['Nisyros'],
    description: 'Journey to the volcanic island of Nisyros. Walk into the crater of an active volcano and explore the picturesque village of Mandraki.',
    includes: ['Boat transfer', 'Volcano entrance', 'Village tour', 'Guide'],
    badge: 'Unique'
  },
  { 
    name: 'Beach Hopping BBQ Cruise', 
    duration: '6 Hours', 
    price: '69', 
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
    category: 'Boat Tour',
    islands: ['Kos Beaches'],
    description: 'Cruise to Kos hidden beaches accessible only by boat. Swim in turquoise waters and enjoy a traditional Greek BBQ lunch.',
    includes: ['Boat cruise', 'BBQ lunch', 'Drinks', 'Swimming'],
    badge: null
  },
]

const categories = [
  { icon: <Ship className="h-5 w-5" />, name: 'Boat Tours', count: 3 },
  { icon: <Camera className="h-5 w-5" />, name: 'Cultural', count: 2 },
  { icon: <Sun className="h-5 w-5" />, name: 'Sailing', count: 1 },
  { icon: <Waves className="h-5 w-5" />, name: 'Adventure', count: 1 },
]

const faqs = [
  {
    question: 'How do I book a tour?',
    answer: 'You can book directly through our website, via WhatsApp, or by visiting our office at Kos Port. We recommend booking at least 24-48 hours in advance, especially during peak season (June-August).',
  },
  {
    question: 'What should I bring on a boat tour?',
    answer: 'We recommend bringing sunscreen, sunglasses, a hat, swimwear, a towel, comfortable shoes for walking, and a camera. Most tours provide lunch and drinks, but you may bring snacks. Cash for souvenirs is also useful.',
  },
  {
    question: 'Are the tours suitable for children?',
    answer: 'Most of our tours are family-friendly! Children under 4 often travel free, and ages 4-12 receive discounted rates. The Three Islands Cruise and Beach BBQ are particularly popular with families. Let us know the ages of your children when booking.',
  },
  {
    question: 'What happens if weather is bad?',
    answer: 'Safety is our priority. If a tour is cancelled due to weather, you can choose a full refund or reschedule to another date at no extra cost. We monitor weather conditions closely and will contact you if changes are needed.',
  },
  {
    question: 'Do I need a visa for island-hopping tours?',
    answer: 'If you already have a valid Schengen visa or are in Greece legally, no additional visa is needed for tours to other Greek islands. For day trips departing from Kos, your existing entry stamp is sufficient.',
  },
  {
    question: 'Are lunch and drinks included?',
    answer: 'Most full-day tours include lunch and beverages. Half-day tours typically include snacks and water. Check the specific tour details for what is included. Vegetarian and special dietary options are available with advance notice.',
  },
]

export default function ToursPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TrustBar />
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1920&q=80"
              alt="Beautiful Greek island coastline"
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
                <Compass className="h-4 w-4" />
                Guided Experiences
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 text-balance"
              >
                Tours & Excursions
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/90 text-lg md:text-xl mb-8 text-pretty"
              >
                Discover the magic of the Greek islands with our curated tours. Boat trips, cultural excursions, sunset sailing, and island-hopping adventures led by local experts.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-4 text-sm text-white/80"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Local Expert Guides</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Small Groups</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Free Cancellation</span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Filter Section */}
        <section className="w-full py-8 -mt-6 relative z-10">
          <div className="container px-4 md:px-6">
            <Card className="border-0 shadow-2xl bg-card">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-3">
                    {categories.map((cat) => (
                      <Button key={cat.name} variant="outline" size="sm" className="gap-2 text-foreground">
                        {cat.icon}
                        {cat.name}
                        <span className="text-xs text-muted-foreground">({cat.count})</span>
                      </Button>
                    ))}
                  </div>
                  <Select defaultValue="popular">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popular">Most Popular</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="duration">Duration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Tours Grid */}
        <section className="w-full py-12 md:py-20">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {tours.map((tour, index) => (
                <motion.div
                  key={tour.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-card border-border/50 h-full">
                    <CardContent className="p-0 flex flex-col h-full">
                      <div className="relative h-56">
                        <Image
                          src={tour.image}
                          alt={tour.name}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-3 left-3 flex gap-2">
                          <span className="px-3 py-1 bg-card/90 backdrop-blur text-foreground text-xs font-medium rounded-full">
                            {tour.category}
                          </span>
                          {tour.badge && (
                            <span className="px-3 py-1 bg-accent text-accent-foreground text-xs font-medium rounded-full">
                              {tour.badge}
                            </span>
                          )}
                        </div>
                        <div className="absolute top-3 right-3">
                          <span className="px-3 py-1 bg-card/90 backdrop-blur text-foreground text-xs font-medium rounded-full flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {tour.duration}
                          </span>
                        </div>
                      </div>
                      <div className="p-6 flex flex-col flex-1">
                        <h3 className="font-bold text-xl text-foreground mb-2">{tour.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                          <MapPin className="h-4 w-4" />
                          <span>{tour.islands.join(' • ')}</span>
                        </div>
                        <p className="text-muted-foreground text-sm mb-4 flex-1">{tour.description}</p>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          {tour.includes.map((item) => (
                            <span key={item} className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-lg">
                              {item}
                            </span>
                          ))}
                        </div>
                        
                        <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
                          <div>
                            <span className="text-sm text-muted-foreground">From </span>
                            <span className="text-2xl font-bold text-primary">{tour.price}</span>
                            <span className="text-sm text-muted-foreground">/person</span>
                          </div>
                          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Book Now</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <TrustIndicators />

        {/* Why Book Tours With Us */}
        <section className="w-full py-16 md:py-24 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Why Book Tours With Us?</h2>
              <p className="text-muted-foreground text-lg">Creating unforgettable experiences since 2018</p>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="bg-card border-border/50 text-center">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Small Groups</h3>
                  <p className="text-sm text-muted-foreground">Intimate tours with maximum 15 people for a personal experience</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50 text-center">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Star className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Local Experts</h3>
                  <p className="text-sm text-muted-foreground">Guides who know every hidden gem and local story</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50 text-center">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Flexible Booking</h3>
                  <p className="text-sm text-muted-foreground">Free cancellation up to 24 hours before departure</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50 text-center">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Compass className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Turkish Support</h3>
                  <p className="text-sm text-muted-foreground">Full Turkish language support before and during your tour</p>
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
                <p className="text-muted-foreground text-lg">Everything you need to know about our tours</p>
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
          title="Need Help Choosing a Tour?"
          description="Our team can recommend the perfect experience based on your interests, group size, and travel dates."
        />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
