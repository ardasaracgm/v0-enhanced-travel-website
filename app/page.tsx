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
  Globe,
  CreditCard,
  Headphones,
  BadgeCheck,
  Lock,
  Award,
  Heart,
  Package,
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

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)

  const islands = [
    {
      name: 'Kos',
      location: 'Dodecanese',
      image: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800&q=80',
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
      image: 'https://images.unsplash.com/photo-1504512485720-7d83a16ee930?w=800&q=80',
      description: 'Lush green landscapes, pristine beaches, and ancient sites.',
      ferryTime: '1.5 hours from Kusadasi',
    },
    {
      name: 'Leros',
      location: 'Dodecanese',
      image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&q=80',
      description: 'Authentic Greek charm, quiet bays, and Italian architecture.',
      ferryTime: '3 hours from Bodrum',
    },
    {
      name: 'Patmos',
      location: 'Dodecanese',
      image: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&q=80',
      description: 'Sacred island with the Cave of the Apocalypse.',
      ferryTime: '4 hours from Bodrum',
    },
  ]

  const carFleet = [
    { 
      type: 'Mini', 
      model: 'Citroen Ami', 
      price: '€19', 
      image: 'https://images.unsplash.com/photo-1593055357429-62b6735ef855?w=400&q=80',
      features: ['Electric', '2 Seats', 'City Perfect'],
      badge: 'Eco-Friendly'
    },
    { 
      type: 'Economy', 
      model: 'Fiat Panda', 
      price: '€25', 
      image: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=400&q=80',
      features: ['A/C', 'Manual', '4 Seats'],
      badge: 'Most Popular'
    },
    { 
      type: 'Compact', 
      model: 'DFSK 500', 
      price: '€29', 
      image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&q=80',
      features: ['A/C', 'Manual', '5 Seats'],
      badge: 'Best Value'
    },
  ]

  const tours = [
    { name: 'Three Islands Cruise', duration: 'Full Day', price: '€89', image: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=400&q=80', islands: 'Kos, Kalymnos, Pserimos' },
    { name: 'Rhodes Old Town Tour', duration: '6 Hours', price: '€65', image: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&q=80', islands: 'Rhodes City' },
    { name: 'Sunset Sailing', duration: '4 Hours', price: '€75', image: 'https://images.unsplash.com/photo-1500514966906-fe245eea9344?w=400&q=80', islands: 'Kos Coast' },
    { name: 'Ancient Ruins Explorer', duration: '5 Hours', price: '€55', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', islands: 'Kos & Asklepion' },
  ]

  const services = [
    { icon: <Ship className="h-8 w-8" />, title: 'Ferry Tickets', description: 'Book ferries from Turkey to Greek islands', href: '/ferry' },
    { icon: <Car className="h-8 w-8" />, title: 'Car Rental', description: 'Explore islands at your own pace', href: '/car-rental' },
    { icon: <Hotel className="h-8 w-8" />, title: 'Hotels & Stays', description: 'Handpicked accommodations', href: '#', soon: true },
    { icon: <Compass className="h-8 w-8" />, title: 'Island Tours', description: 'Guided experiences and excursions', href: '/tours' },
    { icon: <FileText className="h-8 w-8" />, title: 'Visa Support', description: 'Schengen visa assistance', href: '/visa' },
    { icon: <Shield className="h-8 w-8" />, title: 'Travel Insurance', description: 'Comprehensive coverage', href: '#', soon: true },
    { icon: <Package className="h-8 w-8" />, title: 'European Parcel Address', description: 'Get a European shipping address in Greece. Order from Amazon, ASOS, iHerb — we store your packages until you arrive.', href: '/parcel-storage', soon: true },
  ]

  const testimonials = [
    { name: 'Ahmet Y.', location: 'Istanbul', comment: 'Kos gezimiz mukemmeldi! Arac kiralama ve feribot rezervasyonu cok kolay oldu.', rating: 5 },
    { name: 'Elif K.', location: 'Izmir', comment: 'Rodos turu harikaydı. Rehberler cok bilgili ve yardımseverdi.', rating: 5 },
    { name: 'Mehmet S.', location: 'Ankara', comment: 'Vize islemlerinde buyuk yardımcı oldular. Kesinlikle tavsiye ederim.', rating: 5 },
  ]

  const trustBadges = [
    { icon: <BadgeCheck className="h-6 w-6" />, title: 'Greek Licensed', subtitle: 'ΜΗ.Τ.Ε. Registered' },
    { icon: <Lock className="h-6 w-6" />, title: 'Secure Payment', subtitle: '256-bit SSL Encryption' },
    { icon: <Globe className="h-6 w-6" />, title: 'Türkçe Destek', subtitle: 'Turkish Language Support' },
    { icon: <Shield className="h-6 w-6" />, title: 'Insured Trips', subtitle: 'Full Travel Protection' },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background scroll-smooth">
      {/* Top Trust Bar */}
      <div className="w-full bg-primary/5 border-b border-primary/10 py-2">
        <div className="container flex items-center justify-center gap-6 text-xs md:text-sm">
          <div className="flex items-center gap-2 text-foreground">
            <BadgeCheck className="h-4 w-4 text-primary" />
            <span>Greek Licensed (ΜΗ.Τ.Ε.)</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Kos Port Office</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-foreground">
            <Globe className="h-4 w-4 text-primary" />
            <span>Türkçe Destek</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link className="flex items-center gap-2" href="/">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">B</span>
              </div>
              <span className="text-xl font-bold text-foreground">Travel <span className="text-primary">Beez</span></span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {[
              { href: '/ferry', label: 'Ferry Tickets' },
              { href: '/car-rental', label: 'Car Rental' },
              { href: '/tours', label: 'Tours' },
              { href: '/visa', label: 'Visa Support' },
              { href: '/contact', label: 'Contact' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="hidden md:flex gap-2 text-foreground border-primary/30 hover:border-primary hover:bg-primary/5">
              <Phone className="h-4 w-4 text-primary" />
              +30 22420 5008
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Book Now
            </Button>
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col gap-4 mt-8">
                  {[
                    { href: '/ferry', label: 'Ferry Tickets' },
                    { href: '/car-rental', label: 'Car Rental' },
                    { href: '/tours', label: 'Tours' },
                    { href: '/visa', label: 'Visa Support' },
                    { href: '/contact', label: 'Contact' },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/10 to-accent/5" />
        <div className="container relative px-4 md:px-6 py-16 md:py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent-foreground text-sm font-medium">
                  <Ship className="h-4 w-4" />
                  Turkey to Greek Islands
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance">
                  Your Greek Island<br />
                  <span className="text-primary">Adventure Starts Here</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-lg text-pretty">
                  Book ferry tickets, rent cars, and explore the beautiful Greek islands with our Turkish-speaking local team in Kos.
                </p>
              </motion.div>
              {/* Hero Trust Indicators */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex flex-wrap items-center justify-start gap-4 md:gap-6 pt-2"
              >
                <div className="flex items-center gap-2 text-sm text-foreground/80">
                  <Star className="h-4 w-4 text-accent fill-current" />
                  <span>4.9/5 Google Reviews</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/80">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>Office at Kos Port</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/80">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  <span>Licensed Greek Agency</span>
                </div>
              </motion.div>
            </div>

            {/* Search Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="shadow-2xl border-border/50 bg-card/95 backdrop-blur">
                <CardContent className="p-6">
                  <Tabs defaultValue="ferry" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-6 bg-muted">
                      <TabsTrigger value="ferry" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <Ship className="h-4 w-4 mr-2" />
                        Ferry
                      </TabsTrigger>
                      <TabsTrigger value="cars" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <Car className="h-4 w-4 mr-2" />
                        Cars
                      </TabsTrigger>
                      <TabsTrigger value="hotels" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <Hotel className="h-4 w-4 mr-2" />
                        Hotels
                      </TabsTrigger>
                      <TabsTrigger value="tours" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <Compass className="h-4 w-4 mr-2" />
                        Tours
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="ferry" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">From</label>
                          <Select defaultValue="bodrum">
                            <SelectTrigger className="bg-background text-foreground">
                              <SelectValue placeholder="Select port" />
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
                          <Select defaultValue="kos">
                            <SelectTrigger className="bg-background text-foreground">
                              <SelectValue placeholder="Select island" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="kos">Kos, Greece</SelectItem>
                              <SelectItem value="rhodes">Rhodes, Greece</SelectItem>
                              <SelectItem value="samos">Samos, Greece</SelectItem>
                              <SelectItem value="patmos">Patmos, Greece</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Date</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="date" className="pl-10 bg-background text-foreground" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Passengers</label>
                          <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Select defaultValue="2">
                              <SelectTrigger className="pl-10 bg-background text-foreground">
                                <SelectValue />
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
                      </div>
                      <Link href="/ferry">
                        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg h-12" size="lg">
                          <Search className="h-5 w-5 mr-2" />
                          Search Ferries
                        </Button>
                      </Link>
                    </TabsContent>

                    <TabsContent value="cars" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Location</label>
                          <Select defaultValue="kos">
                            <SelectTrigger className="bg-background text-foreground">
                              <SelectValue placeholder="Select island" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="kos">Kos Island</SelectItem>
                              <SelectItem value="rhodes">Rhodes Island</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Pickup</label>
                          <Select defaultValue="port">
                            <SelectTrigger className="bg-background text-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="port">Kos Port</SelectItem>
                              <SelectItem value="airport">Kos Airport</SelectItem>
                              <SelectItem value="hotel">Hotel Delivery</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Pick-up Date</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="date" className="pl-10 bg-background text-foreground" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Drop-off Date</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="date" className="pl-10 bg-background text-foreground" />
                          </div>
                        </div>
                      </div>
                      <Link href="/car-rental">
                        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg h-12" size="lg">
                          <Search className="h-5 w-5 mr-2" />
                          Search Cars
                        </Button>
                      </Link>
                    </TabsContent>

                    <TabsContent value="hotels" className="space-y-4">
                      <div className="text-center py-8">
                        <Hotel className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Hotel booking coming soon!</p>
                        <p className="text-sm text-muted-foreground mt-2">Contact us on WhatsApp for hotel recommendations.</p>
                      </div>
                    </TabsContent>

                    <TabsContent value="tours" className="space-y-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Tour Type</label>
                          <Select defaultValue="boat">
                            <SelectTrigger className="bg-background text-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="boat">Boat Tours</SelectItem>
                              <SelectItem value="cultural">Cultural Tours</SelectItem>
                              <SelectItem value="adventure">Adventure Tours</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Link href="/tours">
                          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg h-12" size="lg">
                            <Search className="h-5 w-5 mr-2" />
                            Browse Tours
                          </Button>
                        </Link>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="w-full py-8 border-y border-border/30 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {trustBadges.map((badge, index) => (
              <motion.div
                key={badge.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                  {badge.icon}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{badge.title}</p>
                  <p className="text-xs text-muted-foreground">{badge.subtitle}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Greek Licensed Company Section */}
      <section className="w-full py-16 md:py-20 bg-gradient-to-br from-primary/5 to-secondary/10">
        <div className="container px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <BadgeCheck className="h-4 w-4" />
                Licensed & Registered
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance">
                A Real Greek Travel Agency You Can Trust
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Travel Beez is a fully licensed Greek travel company registered with the Greek Ministry of Tourism (ΜΗ.Τ.Ε.). We operate from our office at Kos Port, ensuring you receive authentic local service with full legal protection.
              </p>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">ΜΗ.Τ.Ε.</p>
                  <p className="text-xs text-muted-foreground">Greek Tourism License</p>
                </div>
                <div className="h-12 w-px bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">EU</p>
                  <p className="text-xs text-muted-foreground">Consumer Protection</p>
                </div>
                <div className="h-12 w-px bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">24/7</p>
                  <p className="text-xs text-muted-foreground">Support</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-xl">
                <Image
                  src="https://images.unsplash.com/photo-1555993539-1732b0258235?w=800&q=80"
                  alt="Greek islands landscape"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-card p-4 rounded-xl shadow-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">6+ Years</p>
                    <p className="text-sm text-muted-foreground">Serving Turkish Travelers</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Real Kos Port Office Section */}
      <section className="w-full py-16 md:py-20 bg-card">
        <div className="container px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="order-2 md:order-1 relative h-[450px] rounded-2xl overflow-hidden shadow-xl">
              <Image
                src="https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80"
                alt="Travel Beez Kos Port Office"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-card/95 backdrop-blur p-5 rounded-xl">
                  <div className="flex items-start gap-4">
                    <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-lg">Travel Beez Kos Office</p>
                      <p className="text-sm text-muted-foreground mb-2">G Averos 4, Kos (under Achilleas Hotel)</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-primary">
                          <Clock className="h-4 w-4" />
                          08:00 - 20:00
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          +30 22420 5008
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent-foreground text-sm font-medium">
                <Anchor className="h-4 w-4 text-accent" />
                Located Directly at Kos Port Exit
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance">
                Meet Us When You Arrive
              </h2>
              <p className="text-muted-foreground text-lg text-pretty leading-relaxed">
                Our office is located directly at Kos Port exit, under Achilleas Hotel & Apartments. Our Turkish-speaking team will greet you, hand over your rental car keys, and help with anything you need.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-foreground">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">Port-side car delivery</span>
                    <p className="text-sm text-muted-foreground">Your car waits at the ferry terminal</p>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-foreground">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">Turkish-speaking staff</span>
                    <p className="text-sm text-muted-foreground">Communicate easily in your language</p>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-foreground">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">Local insider tips</span>
                    <p className="text-sm text-muted-foreground">Best restaurants, beaches, and hidden gems</p>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-foreground">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">Emergency support</span>
                    <p className="text-sm text-muted-foreground">24/7 help while you&apos;re on the island</p>
                  </div>
                </li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <MapPin className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
                <Link href="https://wa.me/302242050008" target="_blank">
                  <Button variant="outline" className="border-primary/30 text-foreground hover:bg-primary/5 w-full sm:w-auto">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat with Us
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Support Highlights */}
      <section className="w-full py-16 md:py-20 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Always Here For You</h2>
            <p className="text-muted-foreground text-lg">Real support from real people, in Turkish</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <MessageCircle className="h-8 w-8" />, title: 'WhatsApp Support', description: 'Instant replies on WhatsApp. Write in Turkish, get answers fast.', highlight: 'Response < 5 min' },
              { icon: <Phone className="h-8 w-8" />, title: 'Phone Support', description: 'Call us directly from Turkey or Greece. We speak Turkish fluently.', highlight: '+30 22420 5008' },
              { icon: <Headphones className="h-8 w-8" />, title: '24/7 Emergency', description: 'Problems on the island? We handle emergencies any time, day or night.', highlight: 'Always available' },
              { icon: <Heart className="h-8 w-8" />, title: 'Personal Service', description: 'No call centers. You talk to our team who knows your booking.', highlight: 'Dedicated team' },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full bg-card border-border/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="mb-4 p-3 inline-block bg-primary/10 rounded-xl text-primary">
                      {item.icon}
                    </div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                    <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                      {item.highlight}
                    </span>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={service.href}>
                  <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-border/50 bg-card">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      <div className="mb-4 p-3 bg-primary/10 rounded-xl text-primary relative">
                        {service.icon}
                        {service.soon && (
                          <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-accent text-accent-foreground text-[10px] font-medium rounded-full">
                            Soon
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground mb-2">{service.title}</h3>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Car Fleet Section */}
      <section id="cars" className="w-full py-16 md:py-24 bg-gradient-to-b from-secondary/30 to-background">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Car className="h-4 w-4" />
                Kos Island Fleet
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Our Car Fleet</h2>
              <p className="text-muted-foreground text-lg max-w-xl">Perfect cars for island exploration. Pick up at port or your hotel.</p>
            </div>
            <Link href="/car-rental">
              <Button variant="outline" className="mt-4 md:mt-0 text-foreground border-border">
                View All Cars
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {carFleet.map((car, index) => (
              <motion.div
                key={car.model}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-card border-border/50">
                  <CardContent className="p-0">
                    <div className="relative h-52 bg-gradient-to-br from-muted to-muted/50">
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
                    <div className="p-6">
                      <h3 className="font-bold text-xl text-foreground mb-3">{car.model}</h3>
                      <div className="flex flex-wrap gap-2 mb-5">
                        {car.features.map((feature) => (
                          <span key={feature} className="px-3 py-1.5 bg-muted text-muted-foreground text-xs rounded-lg font-medium">
                            {feature}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-border/50">
                        <div>
                          <span className="text-3xl font-bold text-primary">{car.price}</span>
                          <span className="text-muted-foreground text-sm">/day</span>
                        </div>
                        <Link href="/car-rental">
                          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Book Now</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          {/* Car Fleet Trust Indicators */}
          <div className="mt-10 p-6 bg-card rounded-2xl border border-border/50">
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span>Full insurance included</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span>No hidden fees</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span>Free cancellation 24h before</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span>Port delivery included</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Secure Payment Section */}
      <section className="w-full py-12 bg-card border-y border-border/30">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">Secure Payments</h3>
                <p className="text-sm text-muted-foreground">256-bit SSL encryption. Your data is always protected.</p>
              </div>
            </div>
            <div className="flex items-center gap-6 flex-wrap justify-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-6 w-6" />
                <span className="text-sm font-medium">Visa</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-6 w-6" />
                <span className="text-sm font-medium">Mastercard</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-6 w-6" />
                <span className="text-sm font-medium">TROY</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm font-medium">Bank Transfer (TL/EUR)</span>
              </div>
            </div>
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
      <section id="tours" className="w-full py-16 md:py-24 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent-foreground text-sm font-medium mb-4">
                <Compass className="h-4 w-4 text-accent" />
                Guided Experiences
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Tours & Experiences</h2>
              <p className="text-muted-foreground text-lg max-w-xl">Unforgettable adventures with local guides</p>
            </div>
            <Link href="/tours">
              <Button variant="outline" className="mt-4 md:mt-0 text-foreground border-border">
                View All Tours
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
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
                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-card border-border/50">
                  <CardContent className="p-0">
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={tour.image}
                        alt={tour.name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-3 right-3 bg-card/90 backdrop-blur px-3 py-1 rounded-full text-xs font-medium text-foreground">
                        {tour.duration}
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-lg text-foreground mb-2">{tour.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {tour.islands}
                      </p>
                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <span className="text-xl font-bold text-primary">From {tour.price}</span>
                        <Link href="/tours">
                          <Button size="sm" variant="outline" className="text-foreground">Details</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="w-full py-16 md:py-24">
        <div className="container px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">What Our Customers Say</h2>
            <p className="text-muted-foreground text-lg">Real reviews from Turkish travelers</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
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
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 italic">&ldquo;{testimonial.comment}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-semibold text-primary">{testimonial.name.charAt(0)}</span>
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
      <section className="w-full py-16 md:py-20 bg-gradient-to-r from-primary to-primary/80">
        <div className="container px-4 md:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto space-y-6"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">Ready to Plan Your Trip?</h2>
            <p className="text-lg text-primary-foreground/80">
              Message us on WhatsApp and get instant help in Turkish. We&apos;ll create your perfect Greek island itinerary.
            </p>
            <Link href="https://wa.me/302242050008?text=Merhaba,%20Yunan%20adalar%C4%B1%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum" target="_blank">
              <Button size="lg" variant="secondary" className="gap-2 text-lg px-8 bg-card text-foreground hover:bg-card/90 shadow-lg">
                <MessageCircle className="h-5 w-5" />
                WhatsApp ile Yazın
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-foreground text-background py-16">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            {/* Company Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">B</span>
                </div>
                <span className="text-xl font-bold">Travel <span className="text-primary">Beez</span></span>
              </div>
              <p className="text-background/70 text-sm mb-4">
                Your trusted partner for Greek island travel. Licensed travel agency with physical office at Kos Port.
              </p>
              <div className="flex flex-col gap-3 text-sm text-background/70 mb-6">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-background font-medium">G Averos 4, Kos, Greece</span>
                    <p className="text-xs text-background/60">Under Achilleas Hotel & Apartments</p>
                    <p className="text-xs text-primary">First shop at Kos Port exit</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>+30 22420 5008</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-[#25D366]" />
                  <span>WhatsApp: +30 22420 5008</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Open daily 08:00 - 20:00</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-background/60">
                <BadgeCheck className="h-4 w-4 text-primary" />
                <span>ΜΗ.Τ.Ε.: 1471Ε60000074600</span>
              </div>
            </div>

            {/* Services */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Ship className="h-4 w-4 text-primary" />
                Services
              </h3>
              <ul className="space-y-2 text-sm text-background/70">
                <li><Link href="/ferry" className="hover:text-primary transition-colors">Ferry Tickets</Link></li>
                <li><Link href="/car-rental" className="hover:text-primary transition-colors">Car Rental</Link></li>
                <li><Link href="/tours" className="hover:text-primary transition-colors">Island Tours</Link></li>
                <li><Link href="/visa" className="hover:text-primary transition-colors">Visa Support</Link></li>
                <li><span className="text-background/50">Hotels & Stays <span className="text-xs text-primary">(Soon)</span></span></li>
                <li><span className="text-background/50">Travel Insurance <span className="text-xs text-primary">(Soon)</span></span></li>
              </ul>
            </div>

            {/* Islands */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Compass className="h-4 w-4 text-primary" />
                Islands
              </h3>
              <ul className="space-y-2 text-sm text-background/70">
                <li><span className="text-background/50">Kos Island <span className="text-xs text-primary">(Soon)</span></span></li>
                <li><span className="text-background/50">Rhodes Island <span className="text-xs text-primary">(Soon)</span></span></li>
                <li><span className="text-background/50">Samos Island <span className="text-xs text-primary">(Soon)</span></span></li>
                <li><span className="text-background/50">Leros Island <span className="text-xs text-primary">(Soon)</span></span></li>
                <li><span className="text-background/50">Patmos Island <span className="text-xs text-primary">(Soon)</span></span></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Support
              </h3>
              <ul className="space-y-2 text-sm text-background/70">
                <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
                <li><span className="text-background/50">FAQ <span className="text-xs text-primary">(Soon)</span></span></li>
                <li><span className="text-background/50">Terms of Service <span className="text-xs text-primary">(Soon)</span></span></li>
                <li><span className="text-background/50">Privacy Policy <span className="text-xs text-primary">(Soon)</span></span></li>
                <li><span className="text-background/50">Cancellation Policy <span className="text-xs text-primary">(Soon)</span></span></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-background/50 text-center md:text-left">
              <p>&copy; {new Date().getFullYear()} FerryBee Travel IKE — operating as Travel Beez. All rights reserved.</p>
              <p className="text-xs mt-1">Greek Tourism License: ΜΗ.Τ.Ε. 1471Ε60000074600</p>
            </div>
            <div className="flex items-center gap-4 text-sm text-background/50">
              <span>Secure Payments:</span>
              <span>Visa</span>
              <span>Mastercard</span>
              <span>TROY</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <motion.a
        href="https://wa.me/302242050008?text=Merhaba,%20Yunan%20adalar%C4%B1%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#25D366] text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <MessageCircle className="h-6 w-6" />
        <span className="font-semibold hidden sm:inline">WhatsApp ile Yazın</span>
      </motion.a>
    </div>
  )
}
