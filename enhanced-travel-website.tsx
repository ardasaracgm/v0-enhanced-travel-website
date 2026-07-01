"use client";

import * as React from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import { SERVICE_ROUTES, type ServiceKey } from "@/lib/services";
import { buildWhatsAppLink, getWhatsAppDisplay, getLandline } from "@/lib/contact";
import { useTranslations, useLocale } from "next-intl";
import {
  Calendar,
  ChevronRight,
  MapPin,
  Menu,
  Users,
  Ship,
  Car,
  CarTaxiFront,
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FerrySearchForm } from "@/components/ferry/ferry-search-form";
import { getAvailableCars } from "@/lib/supabase";
import { normalizeCar, groupByModelKey, dateDiffInDays, type NormalizedCar } from "@/lib/normalize-car";
import { useBooking } from "@/lib/booking-context";
import { Car2FleetCard } from "@/components/car2/car2-fleet-card";
import { CarCardSkeleton } from "@/components/ui/skeleton";

const PICKUP_LOCATION = "Kos Port";

export default function TravelBeez() {
  const t = useTranslations("hero");
  const tBar = useTranslations("trustBar");
  const tLic = useTranslations("license");
  const tOffice = useTranslations("kosOffice");
  const tSup = useTranslations("support");
  const tSvc = useTranslations("services");
  const tCommon = useTranslations("common");
  const tFleet = useTranslations("carFleet");
  const tPay = useTranslations("payment");
  const tIslands = useTranslations("popularIslands");
  const tTours = useTranslations("homeTours");
  const tVI = useTranslations("visaInsurance");
  const tTesti = useTranslations("testimonials");
  const tWa = useTranslations("whatsappCta");
  const tFooter = useTranslations("homeFooter");
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const locale = useLocale();
  const router = useRouter();
  const { dispatch } = useBooking();
  const todayAthens = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Athens" });

  // Gerçek filo (DB) — car-rental page'deki client-fetch paterniyle aynı kaynak.
  // Tüm modeller (comingSoon dahil); Car2FleetCard kendi tarih/availability'sini yönetir.
  const [fleetCars, setFleetCars] = React.useState<NormalizedCar[]>([]);
  const [fleetLoading, setFleetLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, isEmpty } = await getAvailableCars();
      if (cancelled) return;
      setFleetCars(
        isEmpty || !data || data.length === 0 ? [] : groupByModelKey(data.map(normalizeCar)),
      );
      setFleetLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // car-rental page.tsx'ten birebir: kartın kendi tarihleriyle booking'i başlat.
  function handleSelect(car: NormalizedCar, pickup: string, dropoff: string) {
    dispatch({
      type: "SET_CAR_RENTAL",
      payload: {
        modelKey: car.id,
        model: car.model,
        pricePerDay: car.price,
        days: dateDiffInDays(pickup, dropoff) + 1,
        pickupLocation: PICKUP_LOCATION,
        dropoffLocation: PICKUP_LOCATION,
        pickupAt: pickup,
        dropoffAt: dropoff,
      },
    });
    router.push("/car-rental/driver");
  }

  const islands = [
    { id: "kos", image: "https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?w=800&q=80" },
    { id: "rhodes", image: "https://images.unsplash.com/photo-1555993539-1732b0258235?w=800&q=80" },
    { id: "samos", image: "https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800&q=80" },
    { id: "leros", image: "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800&q=80" },
    { id: "patmos", image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80" },
  ].map((i) => ({
    ...i,
    name: tIslands(`items.${i.id}.name`),
    location: tIslands(`items.${i.id}.location`),
    description: tIslands(`items.${i.id}.description`),
    ferryTime: tIslands(`items.${i.id}.ferryTime`),
  }));

  const tours = [
    { id: "threeIslands", price: "€89", image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80" },
    { id: "rhodesOldTown", price: "€65", image: "https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&q=80" },
    { id: "sunsetSailing", price: "€75", image: "https://images.unsplash.com/photo-1500514966906-fe245eea9344?w=400&q=80" },
    { id: "ancientRuins", price: "€55", image: "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?w=400&q=80" },
  ].map((t) => ({
    ...t,
    name: tTours(`items.${t.id}.name`),
    duration: tTours(`items.${t.id}.duration`),
    islands: tTours(`items.${t.id}.islands`),
  }));

  // href + disabled SERVICE_ROUTES'tan; başlık/açıklama services namespace'inden.
  // Hotels (s3) gridden çıktı (route yok); transfer (s8) + sigorta (s7) eklendi.
  // Sıra header ile tutarlı: canlılar → "yakında".
  const services: {
    key: ServiceKey;
    icon: React.ReactNode;
    title: string;
    description: string;
  }[] = [
    { key: "ferry", icon: <Ship className="h-8 w-8" />, title: tSvc("s1Title"), description: tSvc("s1Desc") },
    { key: "carRental", icon: <Car className="h-8 w-8" />, title: tSvc("s2Title"), description: tSvc("s2Desc") },
    { key: "transfer", icon: <CarTaxiFront className="h-8 w-8" />, title: tSvc("s8Title"), description: tSvc("s8Desc") },
    { key: "insurance", icon: <Shield className="h-8 w-8" />, title: tSvc("s7Title"), description: tSvc("s7Desc") },
    { key: "visa", icon: <FileText className="h-8 w-8" />, title: tSvc("s5Title"), description: tSvc("s5Desc") },
    { key: "tours", icon: <Compass className="h-8 w-8" />, title: tSvc("s4Title"), description: tSvc("s4Desc") },
    { key: "packagePickup", icon: <Package className="h-8 w-8" />, title: tSvc("s6Title"), description: tSvc("s6Desc") },
  ];

  // Hero arama widget'ının ferry-dışı 4 sekmesi: kısa açıklama + servis sayfasına
  // CTA (locale-aware Link). Route tek kaynak SERVICE_ROUTES'tan. Ferry sekmesi
  // ayrı (tam <FerrySearchForm bare/>). İkonlar services dizisiyle aynı patern.
  const heroServiceTabs: {
    value: string;
    svc: ServiceKey;
    icon: React.ComponentType<{ className?: string }>;
    descKey: string;
    buttonKey: string;
  }[] = [
    { value: "cars", svc: "carRental", icon: Car, descKey: "serviceCta.carsDesc", buttonKey: "serviceCta.carsButton" },
    { value: "transfer", svc: "transfer", icon: CarTaxiFront, descKey: "serviceCta.transferDesc", buttonKey: "serviceCta.transferButton" },
    { value: "insurance", svc: "insurance", icon: Shield, descKey: "serviceCta.insuranceDesc", buttonKey: "serviceCta.insuranceButton" },
    { value: "visa", svc: "visa", icon: FileText, descKey: "serviceCta.visaDesc", buttonKey: "serviceCta.visaButton" },
  ];

  // Inline footer "Hizmetler" kolonu — grid'le aynı tek kaynak (SERVICE_ROUTES).
  // Etiketler homeFooter namespace'inden (tFooter). Vize/sigorta "Destek"
  // kolonunda yaşıyor; burada ferry/araç/transfer + (yakında) tur.
  const footerServices: { key: ServiceKey; labelKey: string }[] = [
    { key: "ferry", labelKey: "ferryTickets" },
    { key: "carRental", labelKey: "carRental" },
    { key: "transfer", labelKey: "transfer" },
    { key: "tours", labelKey: "tours" },
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
      title: tBar("greekLicensedTitle"),
      subtitle: tBar("greekLicensedSub"),
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: tBar("securePaymentTitle"),
      subtitle: tBar("securePaymentSub"),
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: tBar("turkishSupportTitle"),
      subtitle: tBar("turkishSupportSub"),
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: tBar("insuredTripsTitle"),
      subtitle: tBar("insuredTripsSub"),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background scroll-smooth">
      <main className="flex-1">
        {/* Hero Section with Search */}
        <section className="relative w-full py-16 md:py-24 lg:py-32 overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/hero-greek-islands.webp"
              alt={t("imageAlt")}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/10 via-background/30 to-transparent" />
          </div>
          <div className="container relative px-4 md:px-6">
            <div className="flex flex-col items-start text-left max-w-3xl space-y-6 md:ml-[10%] lg:ml-[15%]">
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl md:text-2xl text-primary font-script"
              >
                {t("kicker")}
              </motion.span>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-6xl font-bold tracking-tight leading-tight text-foreground"
              >
                {t.rich("title", {
                  hl: (chunks) => (
                    <span className="block text-primary">{chunks}</span>
                  ),
                })}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground max-w-xl md:text-lg text-pretty bg-gradient-to-r from-background/40 to-transparent backdrop-blur-sm rounded-2xl px-4 py-2"
              >
                {t("subtitle")}
              </motion.p>

              {/* Hero Trust Indicators */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex flex-wrap items-center justify-start gap-4 md:gap-6 pt-2"
              >
                <div className="flex items-center gap-2 text-sm text-foreground/80 bg-gradient-to-r from-card/70 to-transparent backdrop-blur rounded-full px-4 py-2 shadow-sm">
                  <Star className="h-4 w-4 text-accent fill-current" />
                  <span>{t("rating")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/80 bg-gradient-to-r from-card/70 to-transparent backdrop-blur rounded-full px-4 py-2 shadow-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{t("officeBadge")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/80 bg-gradient-to-r from-card/70 to-transparent backdrop-blur rounded-full px-4 py-2 shadow-sm">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  <span>{t("licensedBadge")}</span>
                </div>
              </motion.div>
            </div>

            {/* Search Widget — 5 sekme: Feribot tam form, diğerleri servis CTA */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-10 max-w-4xl md:ml-[10%] lg:ml-[15%]"
            >
              <Card className="border-0 shadow-xl bg-card/90 backdrop-blur">
                <CardContent className="p-0">
                  <Tabs defaultValue="ferry" className="w-full">
                    <TabsList className="w-full grid grid-cols-5 rounded-t-lg rounded-b-none h-14 bg-muted/50">
                      <TabsTrigger
                        value="ferry"
                        className="gap-2 data-[state=active]:bg-card data-[state=active]:text-primary rounded-none first:rounded-tl-lg"
                      >
                        <Ship className="h-4 w-4" />
                        <span className="hidden sm:inline">{t("tabs.ferry")}</span>
                      </TabsTrigger>
                      {heroServiceTabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className="gap-2 data-[state=active]:bg-card data-[state=active]:text-primary rounded-none last:rounded-tr-lg"
                          >
                            <Icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{t(`tabs.${tab.value}`)}</span>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                    {/* Feribot: tam arama formu (bare → hero kartının içine düz gömülür) */}
                    <TabsContent value="ferry" className="mt-0 sm:min-h-[148px]">
                      <FerrySearchForm bare />
                    </TabsContent>
                    {/* Diğer 4 servis: kısa açıklama + servis sayfasına CTA (Link) */}
                    {heroServiceTabs.map((tab) => {
                      const Icon = tab.icon;
                      const { href } = SERVICE_ROUTES[tab.svc];
                      return (
                        <TabsContent
                          key={tab.value}
                          value={tab.value}
                          className="mt-0 p-4 sm:min-h-[172px] data-[state=active]:flex flex-col justify-center"
                        >
                          <div className="flex flex-col items-center gap-4 text-center">
                            <Icon className="h-10 w-10 text-primary" />
                            <p className="text-muted-foreground max-w-md">{t(tab.descKey)}</p>
                            <Button
                              asChild
                              size="lg"
                              className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                              <Link href={href}>{t(tab.buttonKey)}</Link>
                            </Button>
                          </div>
                        </TabsContent>
                      );
                    })}
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
                  {tLic("badge")}
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance">
                  {tLic("title")}
                </h2>
                <p className="text-muted-foreground text-lg text-pretty leading-relaxed">
                  {tLic("description")}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-card border border-border/50">
                    <p className="text-2xl font-bold text-primary">{tLic("mhte")}</p>
                    <p className="text-sm text-muted-foreground">
                      {tLic("mhteSub")}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/50">
                    <p className="text-2xl font-bold text-primary">{tLic("gemi")}</p>
                    <p className="text-sm text-muted-foreground">
                      {tLic("gemiSub")}
                    </p>
                  </div>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{tLic("bullet1")}</span>
                  </li>
                  <li className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{tLic("bullet2")}</span>
                  </li>
                  <li className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{tLic("bullet3")}</span>
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
                    src="/destinations/greek-islands-santorini-blue-domes.webp"
                    alt={tLic("imageAlt")}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
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
                      <p className="font-semibold text-foreground">{tLic("yearsTitle")}</p>
                      <p className="text-sm text-muted-foreground">
                        {tLic("yearsSub")}
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
                  src="/travelbeez-kos-office.webp"
                  alt={tOffice("imageAlt")}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
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
                          {tOffice("officeName")}
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">
                          {tOffice("address")}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-primary">
                            <Clock className="h-4 w-4" />
                            08:00 - 20:00
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            {getLandline().display}
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
                  {tLic("locatedBadge")}
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance">
                  {tOffice("meetTitle")}
                </h2>
                <p className="text-muted-foreground text-lg text-pretty leading-relaxed">
                  {tOffice("description")}
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">
                        {tOffice("b1Title")}
                      </span>
                      <p className="text-sm text-muted-foreground">
                        {tOffice("b1Desc")}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">
                        {tOffice("b2Title")}
                      </span>
                      <p className="text-sm text-muted-foreground">
                        {tOffice("b2Desc")}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">{tOffice("b3Title")}</span>
                      <p className="text-sm text-muted-foreground">
                        {tOffice("b3Desc")}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">{tOffice("b4Title")}</span>
                      <p className="text-sm text-muted-foreground">
                        {tOffice("b4Desc")}
                      </p>
                    </div>
                  </li>
                </ul>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    {tOffice("getDirections")}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-primary/30 text-foreground hover:bg-primary/5"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {tOffice("chatWithUs")}
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
                {tSup("title")}
              </h2>
              <p className="text-muted-foreground text-lg">
                {tSup("subtitle")}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: <MessageCircle className="h-8 w-8" />,
                  title: tSup("c1Title"),
                  description: tSup("c1Desc"),
                  highlight: tSup("c1Highlight"),
                },
                {
                  icon: <Phone className="h-8 w-8" />,
                  title: tSup("c2Title"),
                  description: tSup("c2Desc"),
                  highlight: tSup("c2Highlight"),
                },
                {
                  icon: <Headphones className="h-8 w-8" />,
                  title: tSup("c3Title"),
                  description: tSup("c3Desc"),
                  highlight: tSup("c3Highlight"),
                },
                {
                  icon: <Heart className="h-8 w-8" />,
                  title: tSup("c4Title"),
                  description: tSup("c4Desc"),
                  highlight: tSup("c4Highlight"),
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
                {tSvc("title")}
              </h2>
              <p className="text-muted-foreground text-lg">
                {tSvc("subtitle")}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {services.map((service, index) => {
                const { href, disabled } = SERVICE_ROUTES[service.key];
                const card = (
                  <Card
                    className={`h-full border-border/50 bg-card ${
                      disabled
                        ? "opacity-60"
                        : "hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                    }`}
                  >
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      <div className="mb-4 p-3 bg-primary/10 rounded-xl text-primary">
                        {service.icon}
                      </div>
                      <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                        {service.title}
                        {disabled && (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {tCommon("comingSoon")}
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {service.description}
                      </p>
                    </CardContent>
                  </Card>
                );
                return (
                  <motion.div
                    key={service.key}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {disabled ? (
                      <div aria-disabled="true" className="cursor-not-allowed">
                        {card}
                      </div>
                    ) : (
                      <Link href={href}>{card}</Link>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Car Fleet Section — car2 idiom, gerçek DB filosu (teaser) */}
        <section id="cars" className="w-full bg-white py-16 md:py-24">
          <div className="container px-4 md:px-6">
            {/* car2 başlık — ortalı, amber eyebrow + blue-950 başlık */}
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-amber-600">
                {tFleet("heroBadge")}
              </p>
              <h2 className="mb-4 text-3xl font-bold text-blue-950 md:text-4xl">
                {tFleet("title")}
              </h2>
              <p className="text-lg text-muted-foreground">{tFleet("subtitle")}</p>
            </div>

            {fleetLoading ? (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <CarCardSkeleton key={i} />
                ))}
              </div>
            ) : fleetCars.length > 0 ? (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                {fleetCars.map((car, index) => (
                  <Car2FleetCard
                    key={car.id || car.model}
                    car={car}
                    index={index}
                    locale={locale}
                    seedPickup=""
                    seedDropoff=""
                    seedNonce={0}
                    todayAthens={todayAthens}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            ) : null}

            {/* "Tüm Araçları Gör" — normal CTA + fleetCars boşsa fallback yolu */}
            <div className="mt-10 text-center">
              <Link href="/car-rental">
                <Button variant="outline" className="border-blue-950/20 text-blue-950">
                  {tFleet("viewAll")}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Güven şeridi — car2 token'ları (blue-950 + amber, rounded-3xl) */}
            <div className="mt-12 rounded-3xl border border-blue-950/10 bg-blue-50/50 px-6 py-8">
              <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
                <div className="flex items-center gap-2 text-blue-950">
                  <CheckCircle className="h-5 w-5 text-amber-500" />
                  <span>{tFleet("trust1")}</span>
                </div>
                <div className="flex items-center gap-2 text-blue-950">
                  <CheckCircle className="h-5 w-5 text-amber-500" />
                  <span>{tFleet("trust2")}</span>
                </div>
                <div className="flex items-center gap-2 text-blue-950">
                  <CheckCircle className="h-5 w-5 text-amber-500" />
                  <span>{tFleet("trust3")}</span>
                </div>
                <div className="flex items-center gap-2 text-blue-950">
                  <CheckCircle className="h-5 w-5 text-amber-500" />
                  <span>{tFleet("trust4")}</span>
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
                    {tPay("title")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {tPay("subtitle")}
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
                  <span className="text-sm font-medium">
                    {tPay("bankTransfer")}
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
                {tIslands("title")}
              </h2>
              <p className="text-muted-foreground text-lg">
                {tIslands("subtitle")}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {islands.map((island, index) => (
                <motion.div
                  key={island.id}
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
                            {tIslands("explore")}
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
                  {tTours("title")}
                </h2>
                <p className="text-muted-foreground text-lg max-w-xl">
                  {tTours("subtitle")}
                </p>
              </div>
              <Link href="/tours">
                <Button
                  variant="outline"
                  className="mt-4 md:mt-0 text-foreground border-border"
                >
                  {tTours("viewAll")}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {tours.map((tour, index) => (
                <motion.div
                  key={tour.id}
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
                              {tTours("from")}{" "}
                            </span>
                            <span className="text-2xl font-bold text-primary">
                              {tour.price}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            {tTours("book")}
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
                      {tVI("visa.title")}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {tVI("visa.desc")}
                    </p>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        {tVI("visa.item1")}
                      </li>
                      <li className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        {tVI("visa.item2")}
                      </li>
                      <li className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        {tVI("visa.item3")}
                      </li>
                    </ul>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                      {tVI("visa.cta")}
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
                      {tVI("insurance.title")}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {tVI("insurance.desc")}
                    </p>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        {tVI("insurance.item1")}
                      </li>
                      <li className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        {tVI("insurance.item2")}
                      </li>
                      <li className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        {tVI("insurance.item3")}
                      </li>
                    </ul>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                      {tVI("insurance.cta")}
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
                {tTesti("title")}
              </h2>
              <p className="text-muted-foreground text-lg">
                {tTesti("subtitle")}
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
                  {tWa("title")}
                </h2>
                <p className="text-primary-foreground/90 text-lg max-w-xl">
                  {tWa("subtitle")}
                </p>
              </div>
              <Button
                size="lg"
                variant="secondary"
                className="gap-2 text-lg px-8 bg-card text-foreground hover:bg-card/90 shadow-lg"
              >
                <MessageCircle className="h-5 w-5" />
                {tWa("buttonLong")}
              </Button>
            </div>
          </div>
        </section>
      </main>

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
                {tFooter("tagline")}
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{getLandline().display}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageCircle className="h-4 w-4 text-[#25D366]" />
                  <span>WhatsApp: {getWhatsAppDisplay(locale)}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-foreground font-medium">
                      {tFooter("addressLine")}
                    </span>
                    <p className="text-xs">
                      {tFooter("addressSub")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">{tFooter("servicesTitle")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {footerServices.map((item) => {
                  const { href, disabled } = SERVICE_ROUTES[item.key];
                  if (disabled) {
                    return (
                      <li key={item.key}>
                        <span
                          aria-disabled="true"
                          className="flex items-center gap-1.5 text-muted-foreground/50 cursor-not-allowed"
                        >
                          {tFooter(item.labelKey)}
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {tCommon("comingSoon")}
                          </span>
                        </span>
                      </li>
                    );
                  }
                  return (
                    <li key={item.key}>
                      <Link href={href} className="hover:text-primary transition-colors">
                        {tFooter(item.labelKey)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">{tFooter("islandsTitle")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {islands.map((island) => (
                  <li key={island.id}>
                    <Link
                      href="#"
                      className="hover:text-primary transition-colors"
                    >
                      {island.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">{tFooter("supportTitle")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href={SERVICE_ROUTES.visa.href}
                    className="hover:text-primary transition-colors"
                  >
                    {tFooter("visaSupport")}
                  </Link>
                </li>
                <li>
                  <Link
                    href={SERVICE_ROUTES.insurance.href}
                    className="hover:text-primary transition-colors"
                  >
                    {tFooter("travelInsurance")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    {tFooter("faq")}
                  </Link>
                </li>
                <li>
                  <Link
                    href={SERVICE_ROUTES.contact.href}
                    className="hover:text-primary transition-colors"
                  >
                    {tFooter("contactUs")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>
                  {tFooter("operatingAs", { year: new Date().getFullYear() })}
                </span>
                <span>ΜΗ.Τ.Ε.: 1471Ε60000074600</span>
              </div>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <Link href="#" className="hover:text-primary transition-colors">
                  {tFooter("privacy")}
                </Link>
                <Link href="#" className="hover:text-primary transition-colors">
                  {tFooter("terms")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <motion.a
        href={buildWhatsAppLink(locale, "Merhaba, Yunan adaları hakkında bilgi almak istiyorum")}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#25D366] text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <MessageCircle className="h-6 w-6" />
        <span className="font-semibold hidden sm:inline">
          {tWa("floatingLabel")}
        </span>
      </motion.a>
    </div>
  );
}
