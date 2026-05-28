"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
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
} from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TravelBeez() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const todayAthens = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })

  const islands = [
    {
      name: "Kos",
      location: "Dodecanese",
      image:
        "https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?w=800&q=80",
      description: "Beautiful beaches, ancient ruins, and vibrant nightlife.",
      ferryTime: "1 hour from Bodrum",
    },
    {
      name: "Rhodes",
      location: "Dodecanese",
      image:
        "https://images.unsplash.com/photo-1555993539-1732b0258235?w=800&q=80",
      description: "Medieval old town, stunning beaches, and rich history.",
      ferryTime: "2.5 hours from Marmaris",
    },
    {
      name: "Samos",
      location: "North Aegean",
      image:
        "https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800&q=80",
      description:
        "Lush green landscapes, pristine beaches, and ancient sites.",
      ferryTime: "1.5 hours from Kusadasi",
    },
    {
      name: "Leros",
      location: "Dodecanese",
      image:
        "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800&q=80",
      description:
        "Authentic Greek charm, quiet bays, and Italian architecture.",
      ferryTime: "3 hours from Bodrum",
    },
    {
      name: "Patmos",
      location: "Dodecanese",
      image:
        "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80",
      description: "Sacred island with the Cave of the Apocalypse.",
      ferryTime: "4 hours from Bodrum",
    },
  ];

  const carFleet = [
    {
      type: "Mini",
      model: "Citroen Ami",
      price: "€19",
      image:
        "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&q=80",
      features: ["Electric", "2 Seats", "City Perfect"],
      badge: "Eco-Friendly",
    },
    {
      type: "Economy",
      model: "Fiat Panda",
      price: "€25",
      image:
        "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400&q=80",
      features: ["A/C", "Manual", "4 Seats"],
      badge: "Most Popular",
    },
    {
      type: "Compact",
      model: "DFSK 500",
      price: "€29",
      image:
        "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=400&q=80",
      features: ["A/C", "Manual", "5 Seats"],
      badge: "Best Value",
    },
  ];

  const tours = [
    {
      name: "Three Islands Cruise",
      duration: "Full Day",
      price: "€89",
      image:
        "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80",
      islands: "Kos, Kalymnos, Pserimos",
    },
    {
      name: "Rhodes Old Town Tour",
      duration: "6 Hours",
      price: "€65",
      image:
        "https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&q=80",
      islands: "Rhodes City",
    },
    {
      name: "Sunset Sailing",
      duration: "4 Hours",
      price: "€75",
      image:
        "https://images.unsplash.com/photo-1500514966906-fe245eea9344?w=400&q=80",
      islands: "Kos Coast",
    },
    {
      name: "Ancient Ruins Explorer",
      duration: "5 Hours",
      price: "€55",
      image:
        "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?w=400&q=80",
      islands: "Kos & Asklepion",
    },
  ];

  const services = [
    {
      icon: <Ship className="h-8 w-8" />,
      title: "Ferry Tickets",
      description: "Book ferries from Turkey to Greek islands",
      href: "/ferry",
    },
    {
      icon: <Car className="h-8 w-8" />,
      title: "Car Rental",
      description: "Explore islands at your own pace",
      href: "/car-rental",
    },
    {
      icon: <Hotel className="h-8 w-8" />,
      title: "Hotels & Stays",
      description: "Handpicked accommodations",
      href: "#",
    },
    {
      icon: <Compass className="h-8 w-8" />,
      title: "Island Tours",
      description: "Guided experiences and excursions",
      href: "/tours",
    },
    {
      icon: <FileText className="h-8 w-8" />,
      title: "Visa Support",
      description: "Schengen visa assistance",
      href: "/visa",
    },
    {
      icon: <Package className="h-8 w-8" />,
      title: "Package Pickup",
      description: "Secure delivery address and storage at Kos Port",
      href: "/package-pickup",
    },
  ];

  const testimonials = [
    {
      name: "Ahmet Y.",
      location: "Istanbul",
      comment:
        "Kos gezimiz mukemmeldi! Arac kiralama ve feribot rezervasyonu cok kolay oldu.",
      rating: 5,
    },
    {
      name: "Elif K.",
      location: "Izmir",
      comment: "Rodos turu harikaydı. Rehberler cok bilgili ve yardımseverdi.",
      rating: 5,
    },
    {
      name: "Mehmet S.",
      location: "Ankara",
      comment:
        "Vize islemlerinde buyuk yardımcı oldular. Kesinlikle tavsiye ederim.",
      rating: 5,
    },
  ];

  const trustBadges = [
    {
      icon: <BadgeCheck className="h-6 w-6" />,
      title: "Greek Licensed",
      subtitle: "ΜΗ.Τ.Ε. Registered",
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: "Secure Payment",
      subtitle: "256-bit SSL Encryption",
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Türkçe Destek",
      subtitle: "Turkish Language Support",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Insured Trips",
      subtitle: "Full Travel Protection",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background scroll-smooth">
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
                Discover the Magic of the{" "}
                <span className="text-primary">Aegean</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground max-w-xl md:text-lg text-pretty"
              >
                Ferry tickets, car rentals, hotels, and tours to Kos, Rhodes,
                Samos, Leros, and Patmos. Trusted by thousands of Turkish
                travelers.
              </motion.p>

              {/* Hero Trust Indicators */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex flex-wrap items-center justify-center gap-4 md:gap-6 pt-2"
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
                      <TabsTrigger
                        value="ferry"
                        className="gap-2 data-[state=active]:bg-card data-[state=active]:text-primary rounded-none first:rounded-tl-lg"
                      >
                        <Ship className="h-4 w-4" />
                        <span className="hidden sm:inline">Ferry</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="cars"
                        className="gap-2 data-[state=active]:bg-card data-[state=active]:text-primary rounded-none"
                      >
                        <Car className="h-4 w-4" />
                        <span className="hidden sm:inline">Cars</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="hotels"
                        className="gap-2 data-[state=active]:bg-card data-[state=active]:text-primary rounded-none"
                      >
                        <Hotel className="h-4 w-4" />
                        <span className="hidden sm:inline">Hotels</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="tours"
                        className="gap-2 data-[state=active]:bg-card data-[state=active]:text-primary rounded-none last:rounded-tr-lg"
                      >
                        <Compass className="h-4 w-4" />
                        <span className="hidden sm:inline">Tours</span>
                      </TabsTrigger>
                    </TabsList>
                    <div className="p-6">
                      <TabsContent value="ferry" className="mt-0">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              From
                            </label>
                            <Select defaultValue="bodrum">
                              <SelectTrigger>
                                <SelectValue placeholder="Departure" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bodrum">
                                  Bodrum, Turkey
                                </SelectItem>
                                <SelectItem value="marmaris">
                                  Marmaris, Turkey
                                </SelectItem>
                                <SelectItem value="kusadasi">
                                  Kusadasi, Turkey
                                </SelectItem>
                                <SelectItem value="fethiye">
                                  Fethiye, Turkey
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              To
                            </label>
                            <Select defaultValue="kos">
                              <SelectTrigger>
                                <SelectValue placeholder="Destination" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kos">Kos, Greece</SelectItem>
                                <SelectItem value="rhodes">
                                  Rhodes, Greece
                                </SelectItem>
                                <SelectItem value="samos">
                                  Samos, Greece
                                </SelectItem>
                                <SelectItem value="leros">
                                  Leros, Greece
                                </SelectItem>
                                <SelectItem value="patmos">
                                  Patmos, Greece
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Date
                            </label>
                            <Input type="date" className="h-10" min={todayAthens} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Passengers
                            </label>
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
                            <label className="text-sm font-medium text-foreground">
                              Island
                            </label>
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
                            <label className="text-sm font-medium text-foreground">
                              Pick-up Date
                            </label>
                            <Input type="date" className="h-10" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Return Date
                            </label>
                            <Input type="date" className="h-10" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Car Type
                            </label>
                            <Select defaultValue="any">
                              <SelectTrigger>
                                <SelectValue placeholder="Car type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="any">Any</SelectItem>
                                <SelectItem value="mini">
                                  Mini (Citroen Ami)
                                </SelectItem>
                                <SelectItem value="economy">
                                  Economy (Fiat Panda)
                                </SelectItem>
                                <SelectItem value="compact">
                                  Compact (DFSK 500)
                                </SelectItem>
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
                            <label className="text-sm font-medium text-foreground">
                              Island
                            </label>
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
                            <label className="text-sm font-medium text-foreground">
                              Check-in
                            </label>
                            <Input type="date" className="h-10" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Check-out
                            </label>
                            <Input type="date" className="h-10" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Guests
                            </label>
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
                            <label className="text-sm font-medium text-foreground">
                              Island
                            </label>
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
                            <label className="text-sm font-medium text-foreground">
                              Tour Type
                            </label>
                            <Select defaultValue="any">
                              <SelectTrigger>
                                <SelectValue placeholder="Tour type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="any">All Tours</SelectItem>
                                <SelectItem value="boat">Boat Tours</SelectItem>
                                <SelectItem value="cultural">
                                  Cultural
                                </SelectItem>
                                <SelectItem value="adventure">
                                  Adventure
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Date
                            </label>
                            <Input type="date" className="h-10" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Participants
                            </label>
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

        {/* Trust Badges Section */}
        <section className="w-full py-8 bg-secondary/50 border-y border-border/30">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {trustBadges.map((badge, index) => (
                <motion.div
                  key={badge.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 justify-center md:justify-start"
                >
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {badge.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      {badge.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {badge.subtitle}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Greek Licensed Company Section */}
        <section className="w-full py-16 md:py-20 bg-gradient-to-br from-primary/5 via-background to-secondary/30">
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
                  Greek Registered Company
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance">
                  Licensed & Registered in Greece
                </h2>
                <p className="text-muted-foreground text-lg text-pretty leading-relaxed">
                  TravelBeez is a fully licensed Greek travel company registered
                  with the Greek Ministry of Tourism (MH.T.E.). We operate from
                  our office at Kos Port, ensuring you receive authentic local
                  service with full legal protection.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-card border border-border/50">
                    <p className="text-2xl font-bold text-primary">ΜΗ.Τ.Ε.</p>
                    <p className="text-sm text-muted-foreground">
                      Licensed Tourism Agency
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/50">
                    <p className="text-2xl font-bold text-primary">GEMI</p>
                    <p className="text-sm text-muted-foreground">
                      Greek Business Registry
                    </p>
                  </div>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>Full EU consumer protection rights</span>
                  </li>
                  <li className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>Insured business operations</span>
                  </li>
                  <li className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>Official receipts and invoices</span>
                  </li>
                </ul>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative h-[400px] rounded-2xl overflow-hidden shadow-xl"
              >
                <div className="relative h-full w-full overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1555993539-1732b0258235?w=800&q=80"
                    alt="Greek islands landscape"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 bg-card p-4 rounded-tr-xl shadow-lg border-t border-r border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Award className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">6+ Years</p>
                      <p className="text-sm text-muted-foreground">
                        Serving Turkish Travelers
                      </p>
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
                  src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80"
                  alt="Kos Port Office"
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
                        <p className="font-bold text-foreground text-lg">
                          TravelBeez Kos Office
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">
                          G Averos 4, Kos (under Achilleas Hotel)
                        </p>
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
                  Our office is located directly at Kos Port exit, under
                  Achilleas Hotel & Apartments. Our Turkish-speaking team will
                  greet you, hand over your rental car keys, and help with
                  anything you need.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">
                        Port-side car delivery
                      </span>
                      <p className="text-sm text-muted-foreground">
                        Your car waits at the ferry terminal
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">
                        Turkish-speaking staff
                      </span>
                      <p className="text-sm text-muted-foreground">
                        Communicate easily in your language
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Local insider tips</span>
                      <p className="text-sm text-muted-foreground">
                        Best restaurants, beaches, and hidden gems
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Emergency support</span>
                      <p className="text-sm text-muted-foreground">
                        24/7 help while you&apos;re on the island
                      </p>
                    </div>
                  </li>
                </ul>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    Get Directions
                  </Button>
                  <Button
                    variant="outline"
                    className="border-primary/30 text-foreground hover:bg-primary/5"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat with Us
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Customer Support Highlights */}
        <section className="w-full py-16 md:py-20 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Always Here For You
              </h2>
              <p className="text-muted-foreground text-lg">
                Real support from real people, in Turkish
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: <MessageCircle className="h-8 w-8" />,
                  title: "WhatsApp Support",
                  description:
                    "Instant replies on WhatsApp. Write in Turkish, get answers fast.",
                  highlight: "Response < 5 min",
                },
                {
                  icon: <Phone className="h-8 w-8" />,
                  title: "Phone Support",
                  description:
                    "Call us directly from Turkey or Greece. We speak Turkish fluently.",
                  highlight: "+90 & +30 lines",
                },
                {
                  icon: <Headphones className="h-8 w-8" />,
                  title: "24/7 Emergency",
                  description:
                    "Problems on the island? We handle emergencies any time, day or night.",
                  highlight: "Always available",
                },
                {
                  icon: <Heart className="h-8 w-8" />,
                  title: "Personal Service",
                  description:
                    "No call centers. You talk to our team who knows your booking.",
                  highlight: "Dedicated team",
                },
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
                      <h3 className="font-semibold text-lg text-foreground mb-2">
                        {item.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {item.description}
                      </p>
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
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Our Services
              </h2>
              <p className="text-muted-foreground text-lg">
                Everything you need for a perfect Greek island getaway
              </p>
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
                  <Link href={service.href}>
                    <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-border/50 bg-card">
                      <CardContent className="p-6 flex flex-col items-center text-center">
                        <div className="mb-4 p-3 bg-primary/10 rounded-xl text-primary">
                          {service.icon}
                        </div>
                        <h3 className="font-semibold text-foreground mb-2">
                          {service.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {service.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Car Fleet Section - Updated */}
        <section
          id="cars"
          className="w-full py-16 md:py-24 bg-gradient-to-b from-secondary/30 to-background"
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                  <Car className="h-4 w-4" />
                  Kos Island Fleet
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Our Car Fleet
                </h2>
                <p className="text-muted-foreground text-lg max-w-xl">
                  Perfect cars for island exploration. Pick up at port or your
                  hotel.
                </p>
              </div>
              <Link href="/car-rental">
                <Button
                  variant="outline"
                  className="mt-4 md:mt-0 text-foreground border-border"
                >
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
                        <h3 className="font-bold text-xl text-foreground mb-3">
                          {car.model}
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-5">
                          {car.features.map((feature) => (
                            <span
                              key={feature}
                              className="px-3 py-1.5 bg-muted text-muted-foreground text-xs rounded-lg font-medium"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                          <div>
                            <span className="text-3xl font-bold text-primary">
                              {car.price}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              /day
                            </span>
                          </div>
                          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            Book Now
                          </Button>
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
                  <h3 className="font-semibold text-foreground text-lg">
                    Secure Payments
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    256-bit SSL encryption. Your data is always protected.
                  </p>
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
                  <span className="text-sm font-medium">
                    Bank Transfer (TL/EUR)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Popular Islands */}
        <section id="islands" className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Popular Greek Islands
              </h2>
              <p className="text-muted-foreground text-lg">
                Explore the most beautiful destinations in the Aegean Sea
              </p>
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
                          <h3 className="text-xl font-bold text-white mb-1">
                            {island.name}
                          </h3>
                          <p className="text-white/80 text-sm flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {island.location}
                          </p>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-muted-foreground mb-3">
                          {island.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-primary font-medium flex items-center gap-1">
                            <Ship className="h-3 w-3" />
                            {island.ferryTime}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-foreground border-border"
                          >
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
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Tours & Experiences
                </h2>
                <p className="text-muted-foreground text-lg max-w-xl">
                  Unforgettable adventures guided by local experts
                </p>
              </div>
              <Link href="/tours">
                <Button
                  variant="outline"
                  className="mt-4 md:mt-0 text-foreground border-border"
                >
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
                        <h3 className="font-semibold text-lg text-foreground mb-1">
                          {tour.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {tour.islands}
                        </p>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm text-muted-foreground">
                              From{" "}
                            </span>
                            <span className="text-2xl font-bold text-primary">
                              {tour.price}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            Book
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
                    <h3 className="text-2xl font-bold text-foreground mb-3">
                      Visa Support
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Need a Schengen visa? We provide complete documentation
                      support, appointment scheduling, and travel itinerary
                      preparation.
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
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                      Get Visa Help
                    </Button>
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
                    <h3 className="text-2xl font-bold text-foreground mb-3">
                      Travel Insurance
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Travel with peace of mind. Our comprehensive insurance
                      covers medical emergencies, trip cancellations, and more.
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
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                      Get Insurance Quote
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="w-full py-16 md:py-24 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                What Our Travelers Say
              </h2>
              <p className="text-muted-foreground text-lg">
                Real experiences from Turkish travelers
              </p>
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
                          <Star
                            key={i}
                            className="h-5 w-5 text-accent fill-current"
                          />
                        ))}
                      </div>
                      <p className="text-foreground mb-6 italic">
                        &quot;{testimonial.comment}&quot;
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-semibold text-primary">
                            {testimonial.name[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {testimonial.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {testimonial.location}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* WhatsApp CTA Section */}
        <section className="w-full py-16 md:py-24 bg-gradient-to-r from-primary to-primary/80">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                  Ready to Plan Your Trip?
                </h2>
                <p className="text-primary-foreground/90 text-lg max-w-xl">
                  Chat with us on WhatsApp for instant booking and personalized
                  travel assistance. We reply in Turkish!
                </p>
              </div>
              <Button
                size="lg"
                variant="secondary"
                className="gap-2 text-lg px-8 bg-card text-foreground hover:bg-card/90 shadow-lg"
              >
                <MessageCircle className="h-5 w-5" />
                Chat on WhatsApp
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/905321234567"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#25D366] hover:bg-[#20BA5C] text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="font-medium hidden sm:inline group-hover:inline">
          WhatsApp ile Yazın
        </span>
      </a>

      {/* Footer */}
      <footer className="w-full border-t border-border bg-card">
        <div className="container px-4 md:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2">
              <Link className="flex items-center gap-2 mb-4" href="#">
                <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">
                    B
                  </span>
                </div>
                <span className="text-xl font-bold text-foreground">
                  Travel<span className="text-primary">Beez</span>
                </span>
              </Link>
              <p className="text-sm text-muted-foreground mb-4">
                Your trusted partner for Greek island travel from Turkey.
                Licensed and registered in Greece (ΜΗ.Τ.Ε.).
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>+30 22420 5008</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageCircle className="h-4 w-4 text-[#25D366]" />
                  <span>WhatsApp: +30 22420 5009</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-foreground font-medium">
                      G Averos 4, Kos, Greece
                    </span>
                    <p className="text-xs">
                      Under Achilleas Hotel, at Port exit
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Services</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Ferry Tickets
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Car Rental
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Hotels
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Tours
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Islands</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Kos
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Rhodes
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Samos
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Leros
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Patmos
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Visa Support
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Travel Insurance
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>
                  {new Date().getFullYear()} FerryBee Travel IKE - operating as
                  TravelBeez.
                </span>
                <span>ΜΗ.Τ.Ε.: 1471Ε60000074600</span>
              </div>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <Link href="#" className="hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
                <Link href="#" className="hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <motion.a
        href="https://wa.me/302242050009?text=Merhaba,%20Yunan%20adalar%C4%B1%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#25D366] text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <MessageCircle className="h-6 w-6" />
        <span className="font-semibold hidden sm:inline">
          WhatsApp ile Yazın
        </span>
      </motion.a>
    </div>
  );
}
