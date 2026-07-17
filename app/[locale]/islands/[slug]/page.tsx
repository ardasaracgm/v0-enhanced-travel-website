import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import Image from 'next/image'
import { MapPin } from 'lucide-react'

import { Link } from '@/i18n/routing'
import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { FerrySearchForm } from '@/components/ferry/ferry-search-form'
import { OtherIslands } from '@/components/islandbee/other-islands'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { ISLANDS, ISLAND_SLUGS, type Locale } from '@/lib/islands-content'
import { SITE_URL } from '@/lib/site-config'
import { buildMetadata } from '@/lib/seo'

// SSG: her ada slug'ı statik üretilir (locale × slug, [locale] segmentiyle çarpılır).
export function generateStaticParams() {
  return ISLAND_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const island = ISLANDS[slug]
  if (!island) return {}

  const t = await getTranslations({ locale, namespace: 'islands' })
  const tTr = await getTranslations({ locale: 'tr', namespace: 'islands' })
  // meta boşsa (EN/EL, DeepL öncesi) TR'ye düş — prose fallback deseni.
  const title = t(`meta.${slug}.title`) || tTr(`meta.${slug}.title`)
  const description = t(`meta.${slug}.description`) || tTr(`meta.${slug}.description`)

  // meta zaten "| TravelBeez" içeriyor → absoluteTitle (layout %s·template bypass).
  // hreflang 3 dil, x-default YOK (eski davranış korunur). og:type article.
  return buildMetadata({
    locale,
    path: `/islands/${slug}`,
    title,
    description,
    image: island.heroImage,
    ogType: 'article',
    absoluteTitle: true,
    xDefault: false,
  })
}

const LOCALES = ['tr', 'en', 'el'] as const
const asLocale = (l: string): Locale =>
  (LOCALES as readonly string[]).includes(l) ? (l as Locale) : 'tr'

export default async function IslandPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const island = ISLANDS[slug]
  if (!island) notFound()

  setRequestLocale(locale)
  const loc = asLocale(locale)
  // TR fallback: hedef locale prose'u boşsa (DeepL turu henüz doldurmadıysa) TR göster.
  const prose = island.prose[loc].intro ? island.prose[loc] : island.prose.tr

  const t = await getTranslations({ locale, namespace: 'islands' })
  const tIslands = await getTranslations({ locale, namespace: 'popularIslands' })
  const name = tIslands(`items.${slug}.name`)
  const location = tIslands(`items.${slug}.location`)

  // JSON-LD (mutlak URL — SITE_URL tek kaynak). meta boşsa TR fallback.
  const tTrMeta = await getTranslations({ locale: 'tr', namespace: 'islands' })
  const metaDescription =
    t(`meta.${slug}.description`) || tTrMeta(`meta.${slug}.description`)
  const url = `${SITE_URL}/${locale}/islands/${slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TouristDestination',
        '@id': `${url}#destination`,
        name, url, description: metaDescription,
        image: `${SITE_URL}${island.heroImage}`,
        address: { '@type': 'PostalAddress', addressRegion: island.facts.region, addressCountry: 'GR' },
      },
      prose.faq.length > 0 && {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: prose.faq.map((f) => ({
          '@type': 'Question', name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'TravelBeez', item: `${SITE_URL}/${locale}` },
          { '@type': 'ListItem', position: 2, name: t('ui.breadcrumb'), item: `${SITE_URL}/${locale}#islands` },
          { '@type': 'ListItem', position: 3, name },
        ],
      },
    ].filter(Boolean),
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* HERO — car2 idiom: full-bleed görsel + sol rail (başlık + gömülü ferry widget) */}
        <section className="relative min-h-[70vh] overflow-hidden">
          <div className="absolute inset-0">
            <Image src={island.heroImage} alt={name} fill sizes="100vw" className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/30 to-transparent" />
          </div>
          <div className="container relative flex min-h-[70vh] items-center px-4 py-12 md:px-6">
            <div className="w-full max-w-[30rem] space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-1.5 text-sm font-semibold text-blue-950">
                <MapPin className="h-4 w-4" /> {location}
              </div>
              <h1 className="text-balance text-4xl font-bold text-blue-950 md:text-5xl lg:text-6xl">{name}</h1>
              <p className="text-pretty text-lg text-blue-950">{prose.intro}</p>
              <div className="pt-2">
                <p className="mb-2 text-sm font-semibold text-blue-950">{t('ui.ferrySectionTitle')}</p>
                <FerrySearchForm
                  initial={{ from: island.facts.ferryFrom, to: island.facts.ferryTo }}
                  bare
                  orientation="vertical"
                  className="rounded-3xl bg-card/90 backdrop-blur shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Zengin gövde */}
        <div className="container px-4 py-16 md:px-6 md:py-24">
          <div className="mx-auto max-w-3xl space-y-16">
            {prose.sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="mb-4 text-3xl font-bold text-blue-950">{s.heading}</h2>
                <div className="space-y-4 text-lg text-muted-foreground">
                  {s.body.map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </section>
            ))}

            {prose.faq.length > 0 && (
              <section id="faq" className="scroll-mt-24">
                <h2 className="mb-6 text-3xl font-bold text-blue-950">{t('ui.faqTitle')}</h2>
                <Accordion type="single" collapsible className="w-full">
                  {prose.faq.map((f, i) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            )}
          </div>
        </div>

        <OtherIslands currentSlug={slug} locale={locale} />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
