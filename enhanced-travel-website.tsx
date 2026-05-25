'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Calendar,
  ChevronRight,
  MapPin,
  Menu,
  Search,
  Users,
  Ship,
  Car,
  Hotel,
  Compass,
  FileText,
  Shield,
  Phone,
  Star,
  Clock,
  CheckCircle,
  MessageCircle,
  ChevronDown,
  Anchor,
  Building2,
} from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function IslandBee() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)

  const islands = [
    {
      name: 'Kos',
      location: 'Dodecanese',
      image: 'https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?w=800&q=80',
      description: 'Beautiful beaches, ancient ruins, and vibrant nightlife.',
      ferryTime: '1 hour from Bodrum',
    },
    {
      name: 'Rhodes',
      location: 'Dodecanese',
      image: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=800&q=80',
      description: 'Medieval old town, stunning beaches, and rich history.',
      ferryTime: '2.5 hours from Marmaris',
    },
    {
      name: 'Samos',
      location: 'North Aegean',
      image: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800&q=80',
      description: 'Lush green landscapes, pristine beaches, and ancient sites.',
      ferryTime: '1.5 hours from Kusadasi',
    },
    {
      name: 'Leros',
      location: 'Dodecanese',
      image: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800&q=80',
      description: 'Authentic Greek charm, quiet bays, and Italian architecture.',
      ferryTime: '3 hours from Bodrum',
    },
    {
      name: 'Patmos',
      location: 'Dodecanese',
      image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80',
      description: 'Sacred island with the Cave of the Apocalypse.',
      ferryTime: '4 hours from Bodrum',
    },
  ]

  const carFleet = [
    { type: 'Economy', model: 'Fiat Panda', price: '25', image: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400&q=80', features: ['A/C', 'Manual', '4 Seats'] },
    { type: 'Compact', model: 'VW Polo', price: '35', image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=400&q=80', features: ['A/C', 'Automatic', '5 Seats'] },
    { type: 'SUV', model: 'Jeep Renegade', price: '55', image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=400&q=80', features: ['A/C', 'Automatic', '5 Seats'] },
    { type: 'Convertible', model: 'Mini Cooper', price: '65', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', features: ['A/C', 'Automatic', '4 Seats'] },
  ]

  const tours = [
    { name: 'Three Islands Cruise', duration: 'Full Day', price: '89', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80', islands: 'Kos, Kalymnos, Pserimos' },
    { name: 'Rhodes Old Town Tour', duration: '6 Hours', price: '65', image: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&q=80', islands: 'Rhodes City' },
    { name: 'Sunset Sailing', duration: '4 Hours', price: '75', image: 'https://images.unsplash.com/photo-1500514966906-fe245eea9344?w=400&q=80', islands: 'Kos Coast' },
    { name: 'Ancient Ruins Explorer', duration: '5 Hours', price: '55', image: 'https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?w=400&q=80', islands: 'Kos & Asklepion' },
  ]

  const services = [
    { icon: <Ship className="h-8 w-8" />, title: 'Ferry Tickets', description: 'Book ferries from Turkey to Greek islands' },
    { icon: <Car className="h-8 w-8" />, title: 'Car Rental', description: 'Explore islands at your own pace' },
    { icon: <Hotel className="h-8 w-8" />, title: 'Hotels & Stays', description: 'Handpicked accommodations' },
    { icon: <Compass className="h-8 w-8" />, title: 'Island Tours', description: 'Guided experiences and excursions' },
    { icon: <FileText className="h-8 w-8" />, title: 'Visa Support', description: 'Schengen visa assistance' },
    { icon: <Shield className="h-8 w-8" />, title: 'Travel Insurance', description: 'Comprehensive coverage' },
  ]

  const testimonials = [
    { name: 'Ahmet Y.', location: 'Istanbul', comment: 'Kos gezimiz mukemmeldi! Arac kiralama ve feribot rezervasyonu cok kolay oldu.', rating: 5 },
    { name: 'Elif K.', location: 'Izmir', comment: 'Rodos turu harikaydı. Rehberler cok bilgili ve yardımseverdi.', rating: 5 },
    { name: 'Mehmet S.', location: 'Ankara', comment: 'Vize islemlerinde buyuk yardımcı oldular. Kesinlikle tavsiye ederim.', rating: 5 },
  ]

  const whyChooseUs = [
    { icon: <CheckCircle className="h-10 w-10 text-primary" />, title: 'Local Expertise', description: 'Years of experience in Greek island travel' },
    { icon: <Clock className="h-10 w-10 text-primary" />, title: 'Fast Booking', description: 'Instant confirmations for all services' },
    { icon: <Shield className="h-10 w-10 text-primary" />, title: 'Secure Payments', description: 'Safe transactions with full protection' },
    { icon: <Phone className="h-10 w-10 text-primary" />, title: '24/7 Support', description: 'Always here when you need us' },
  ]

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId)
    if (section) {
      const header = document.querySelector('header')
      const headerHeight = header ? header.offsetHeight : 0
      const yOffset = -headerHeight - 20
      const y = section.getBoundingClientRect().top + window.pageYOffset + yOffset
      window.scrollTo({ top: y, behavior: 'smooth' })
      setIsMenuOpen(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background scroll-smooth">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link className="flex items-center gap-2" href="#">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">B</span>
              </div>
              <span className="text-xl font-bold text-foreground">Island<span className="text-primary">Bee</span></span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {[
              { id: 'services', label: 'Services' },
              { id: 'islands', label: 'Islands' },
              { id: 'cars', label: 'Car Rental' },
              { id: 'tours', label: 'Tours' },
              { id: 'support', label: 'Support' },
            ].map((item) => (
              <button
                key={item.id}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                onClick={() => scrollToSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="hidden md:flex gap-2 text-foreground">
              <Phone className="h-4 w-4" />
              +90 532 XXX XX XX
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Book Now
            </Button>
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button className="md:hidden" size="icon" variant="ghost">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col gap-4 mt-8">
                  {[
                    { id: 'services', label: 'Services' },
                    { id: 'islands', label: 'Islands' },
                    { id: 'cars', label: 'Car Rental' },
                    { id: 'tours', label: 'Tours' },
                    { id: 'support', label: 'Support' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      className="text-lg font-medium text-foreground hover:text-primary transition-colors text-left"
                      onClick={() => scrollToSection(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section with Search */}
        <section className="relative w-full py-16 md:py-24 lg:py-32 overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?w=1920&q=80"
              alt="Greek Islands aerial view"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
          </div>
          <div className="container relative px-4 md:px-6">
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm md:text-base text-primary font-semibold tracking-wider uppercase"
              >
                Your Gateway to Greek Islands
              </motion.span>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance"
              >
                Discover the Magic of the <span className="text-primary">Aegean</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground max-w-xl md:text-lg text-pretty"
              >
                Ferry tickets, car rentals, hotels, and tours to Kos, Rhodes, Samos, Leros, and Patmos. Trusted by thousands of Turkish travelers.
              </motion.p>
            </div>

            {/* Search Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-10 max-w-4xl mx-auto"
            >
              <Card className="border-0 shadow-xl bg-card/95 backdrop-blur">
                <CardContent className="p-0">
                  <Tabs defaultValue="ferry" className="w-full">
                    <TabsList className="w-full grid grid-cols-4 rounded-t-lg rounded-b-none h-14 bg-muted/50">
                      <TabsTrigger value="ferry" className="gap-2 data-[state=active]:bg-card data-[state=active]:text-primary rounded-none first:rounded-tl-lg">
                        <Ship className="h-4 w-4" />
                        <span className="hidden sm:inline">Ferry</span>
                      </TabsTrigger>
                      <TabsTrigger value="cars" className="gap-2 data-[state=active]:bg-card data-[state=active]:text-primary rounded-none">
                        <Car className="h-4 w-4" />
                        <span className="hidden sm:inline">Cars</span>
                      </TabsTrigger>
                      <TabsTrigger value="hotels" className="gap-2 data-[state=active]:bg-card data-[state=active]:text-primary rounded-none">
                        <Hotel className="h-4 w-4" />
                        <span className="hidden sm:inline">Hotels</span>
                      </TabsTrigger>
                      <TabsTrigger value="tours" className="gap-2 data-[state=active]:bg-card data-[state=active]:text-primary rounded-none last:rounded-tr-lg">
                        <Compass className="h-4 w-4" />
                        <span className="hidden sm:inline">Tours</span>
                      </TabsTrigger>
                    </TabsList>
                    <div className="p-6">
                      <TabsContent value="ferry" className="mt-0">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">From</label>
                            <Select defaultValue="bodrum">
                              <SelectTrigger>
                                <SelectValue placeholder="Departure" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bodrum">Bodrum, Turkey</SelectItem>
                                <SelectItem value="marmaris">Marmaris, Turkey</SelectItem>
                                <SelectItem value="kusadasi">Kusadasi, Turkey</SelectItem>
                                <SelectItem value="fethiye">Fethiye, Turkey</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">To</label>
                            <Select defaultValue="kos">
                              <SelectTrigger>
                                <SelectValue placeholder="Destination" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kos">Kos, Greece</SelectItem>
                                <SelectItem value="rhodes">Rhodes, Greece</SelectItem>
                                <SelectItem value="samos">Samos, Greece</SelectItem>
                                <SelectItem value="leros">Leros, Greece</SelectItem>
                                <SelectItem value="patmos">Patmos, Greece</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Date</label>
                            <Input type="date" className="h-10" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Passengers</label>
                            <Select defaultValue="2">
                              <SelectTrigger>
                                <SelectValue placeholder="Passengers" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 Passenger</SelectItem>
                                <SelectItem value="2">2 Passengers</SelectItem>
                                <SelectItem value="3">3 Passengers</SelectItem>
                                <SelectItem value="4">4 Passengers</SelectItem>
                                <SelectItem value="5">5+ Passengers</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground h-12">
                          <Search className="h-4 w-4 mr-2" />
                          Search Ferry Tickets
                        </Button>
                      </TabsContent>
                      <TabsContent value="cars" className="mt-0">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Island</label>
                            <Select defaultValue="kos">
                              <SelectTrigger>
                                <SelectValue placeholder="Select island" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kos">Kos</SelectItem>
                                <SelectItem value="rhodes">Rhodes</SelectItem>
                                <SelectItem value="samos">Samos</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Pick-up Date</label>
                            <Input type="date" className="h-10" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Return Date</label>
                            <Input type="date" className="h-10" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Car Type</label>
                            <Select defaultValue="any">
                              <SelectTrigger>
                                <SelectValue placeholder="Car type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="any">Any</SelectItem>
                                <SelectItem value="economy">Economy</SelectItem>
                                <SelectItem value="compact">Compact</SelectItem>
                                <SelectItem value="suv">SUV</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground h-12">
                          <Search className="h-4 w-4 mr-2" />
                          Search Cars
                        </Button>
                      </TabsContent>
                      <TabsContent value="hotels" className="mt-0">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Island</label>
                            <Select defaultValue="kos">
                              <SelectTrigger>
                                <SelectValue placeholder="Select island" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kos">Kos</SelectItem>
                                <SelectItem value="rhodes">Rhodes</SelectItem>
                                <SelectItem value="samos">Samos</SelectItem>
                                <SelectItem value="leros">Leros</SelectItem>
                                <SelectItem value="patmos">Patmos</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Check-in</label>
                            <Input type="date" className="h-10" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Check-out</label>
                            <Input type="date" className="h-10" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Guests</label>
                            <Select defaultValue="2">
                              <SelectTrigger>
                                <SelectValue placeholder="Guests" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 Guest</SelectItem>
                                <SelectItem value="2">2 Guests</SelectItem>
                                <SelectItem value="3">3 Guests</SelectItem>
                                <SelectItem value="4">4 Guests</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground h-12">
                          <Search className="h-4 w-4 mr-2" />
                          Search Hotels
                        </Button>
                      </TabsContent>
                      <TabsContent value="tours" className="mt-0">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Island</label>
                            <Select defaultValue="kos">
                              <SelectTrigger>
                                <SelectValue placeholder="Select island" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kos">Kos</SelectItem>
                                <SelectItem value="rhodes">Rhodes</SelectItem>
                                <SelectItem value="samos">Samos</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Tour Type</label>
                            <Select defaultValue="any">
                              <SelectTrigger>
                                <SelectValue placeholder="Tour type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="any">All Tours</SelectItem>
                                <SelectItem value="boat">Boat Tours</SelectItem>
                                <SelectItem value="cultural">Cultural</SelectItem>
                                <SelectItem value="adventure">Adventure</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Date</label>
                            <Input type="date" className="h-10" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Participants</label>
                            <Select defaultValue="2">
                              <SelectTrigger>
                                <SelectValue placeholder="People" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 Person</SelectItem>
                                <SelectItem value="2">2 People</SelectItem>
                                <SelectItem value="3">3 People</SelectItem>
                                <SelectItem value="4">4+ People</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground h-12">
                          <Search className="h-4 w-4 mr-2" />
                          Search Tours
                        </Button>
                      </TabsContent>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Kos Port Office Section */}
        <section className="w-full py-16 md:py-20 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <Anchor className="h-4 w-4" />
                  Kos Port Office
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance">
                  Meet Us at Kos Port
                </h2>
                <p className="text-muted-foreground text-lg text-pretty">
                  Our friendly team is ready to welcome you at Kos Port. Pick up your rental car, get your tour tickets, or simply ask for local recommendations.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>Car delivery directly to the port</span>
                  </li>
                  <li className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>Turkish-speaking staff available</span>
                  </li>
                  <li className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>Free island maps and travel tips</span>
                  </li>
                  <li className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>Last-minute tour bookings</span>
                  </li>
                </ul>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Get Directions
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
              <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-xl">
                <Image
                  src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80"
                  alt="Kos Port Office"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-card/95 backdrop-blur p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">IslandBee Kos Office</p>
                        <p className="text-sm text-muted-foreground">Open Daily 8:00 - 20:00</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Our Services</h2>
              <p className="text-muted-foreground text-lg">Everything you need for a perfect Greek island getaway</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {services.map((service, index) => (
                <motion.div
                  key={service.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-border/50 bg-card">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      <div className="mb-4 p-3 bg-primary/10 rounded-xl text-primary">
                        {service.icon}
                      </div>
                      <h3 className="font-semibold text-foreground mb-2">{service.title}</h3>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Car Fleet Section */}
        <section id="cars" className="w-full py-16 md:py-24 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Our Car Fleet</h2>
                <p className="text-muted-foreground text-lg max-w-xl">Choose from our well-maintained vehicles. Pick up at port or hotel.</p>
              </div>
              <Button variant="outline" className="mt-4 md:mt-0 text-foreground border-border">
                View All Cars
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {carFleet.map((car, index) => (
                <motion.div
                  key={car.model}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-card">
                    <CardContent className="p-0">
                      <div className="relative h-48 bg-muted">
                        <Image
                          src={car.image}
                          alt={car.model}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-3 left-3">
                          <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                            {car.type}
                          </span>
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="font-semibold text-lg text-foreground mb-2">{car.model}</h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {car.features.map((feature) => (
                            <span key={feature} className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                              {feature}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-2xl font-bold text-primary">{car.price}</span>
                            <span className="text-muted-foreground text-sm">/day</span>
                          </div>
                          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">Book</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Islands */}
        <section id="islands" className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Popular Greek Islands</h2>
              <p className="text-muted-foreground text-lg">Explore the most beautiful destinations in the Aegean Sea</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {islands.map((island, index) => (
                <motion.div
                  key={island.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-card">
                    <CardContent className="p-0">
                      <div className="relative h-64 overflow-hidden">
                        <Image
                          src={island.image}
                          alt={island.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="text-xl font-bold text-white mb-1">{island.name}</h3>
                          <p className="text-white/80 text-sm flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {island.location}
                          </p>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-muted-foreground mb-3">{island.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-primary font-medium flex items-center gap-1">
                            <Ship className="h-3 w-3" />
                            {island.ferryTime}
                          </span>
                          <Button size="sm" variant="outline" className="text-xs text-foreground border-border">
                            Explore
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Tours Section */}
        <section id="tours" className="w-full py-16 md:py-24 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Tours & Experiences</h2>
                <p className="text-muted-foreground text-lg max-w-xl">Unforgettable adventures guided by local experts</p>
              </div>
              <Button variant="outline" className="mt-4 md:mt-0 text-foreground border-border">
                View All Tours
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {tours.map((tour, index) => (
                <motion.div
                  key={tour.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-card">
                    <CardContent className="p-0">
                      <div className="relative h-48">
                        <Image
                          src={tour.image}
                          alt={tour.name}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-3 right-3">
                          <span className="px-3 py-1 bg-card/90 backdrop-blur text-foreground text-xs font-medium rounded-full flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {tour.duration}
                          </span>
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="font-semibold text-lg text-foreground mb-1">{tour.name}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{tour.islands}</p>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm text-muted-foreground">From </span>
                            <span className="text-2xl font-bold text-primary">{tour.price}</span>
                          </div>
                          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">Book</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Visa & Insurance Support */}
        <section id="support" className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Visa Support */}
              <Card className="overflow-hidden bg-card border-border/50">
                <CardContent className="p-0">
                  <div className="relative h-48">
                    <Image
                      src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80"
                      alt="Visa Support"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-primary/60" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="h-16 w-16 text-primary-foreground" />
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-foreground mb-3">Visa Support</h3>
                    <p className="text-muted-foreground mb-4">
                      Need a Schengen visa? We provide complete documentation support, appointment scheduling, and travel itinerary preparation.
                    </p>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        Document checklist and review
                      </li>
                      <li className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        Travel itinerary preparation
                      </li>
                      <li className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        Accommodation confirmation
                      </li>
                    </ul>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Get Visa Help</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Travel Insurance */}
              <Card className="overflow-hidden bg-card border-border/50">
                <CardContent className="p-0">
                  <div className="relative h-48">
                    <Image
                      src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80"
                      alt="Travel Insurance"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-accent/60" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Shield className="h-16 w-16 text-white" />
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-foreground mb-3">Travel Insurance</h3>
                    <p className="text-muted-foreground mb-4">
                      Travel with peace of mind. Our comprehensive insurance covers medical emergencies, trip cancellations, and more.
                    </p>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        Medical coverage up to 30,000
                      </li>
                      <li className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        Trip cancellation protection
                      </li>
                      <li className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        Baggage loss coverage
                      </li>
                    </ul>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Get Insurance Quote</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="w-full py-16 md:py-24 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Why Choose IslandBee</h2>
              <p className="text-muted-foreground text-lg">Trusted by thousands of travelers from Turkey</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {whyChooseUs.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-4">
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">What Our Travelers Say</h2>
              <p className="text-muted-foreground text-lg">Real experiences from real travelers</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full bg-card border-border/50">
                    <CardContent className="p-6">
                      <div className="flex mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-5 w-5 text-accent fill-current" />
                        ))}
                      </div>
                      <p className="text-foreground mb-6 italic">&quot;{testimonial.comment}&quot;</p>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-semibold text-primary">{testimonial.name[0]}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{testimonial.name}</p>
                          <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* WhatsApp CTA */}
        <section className="w-full py-16 md:py-24 bg-primary">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">Ready to Plan Your Trip?</h2>
                <p className="text-primary-foreground/80 text-lg max-w-xl">
                  Chat with us on WhatsApp for instant booking and personalized travel assistance.
                </p>
              </div>
              <Button size="lg" variant="secondary" className="gap-2 text-lg px-8 bg-card text-foreground hover:bg-card/90">
                <MessageCircle className="h-5 w-5" />
                Chat on WhatsApp
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border bg-card">
        <div className="container px-4 md:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <Link className="flex items-center gap-2 mb-4" href="#">
                <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">B</span>
                </div>
                <span className="text-xl font-bold text-foreground">Island<span className="text-primary">Bee</span></span>
              </Link>
              <p className="text-sm text-muted-foreground mb-4">
                Your trusted partner for Greek island travel from Turkey.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                +90 532 XXX XX XX
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Services</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">Ferry Tickets</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Car Rental</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Hotels</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Tours</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Islands</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">Kos</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Rhodes</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Samos</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Leros</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Patmos</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">Visa Support</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Travel Insurance</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">FAQ</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Contact Us</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              2024 IslandBee. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
