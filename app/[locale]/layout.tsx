import type { Metadata } from 'next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { SITE_URL } from '@/lib/site-config'
import { getLandline } from '@/lib/contact'
import { BookingProvider } from '@/lib/booking-context'
import { Suspense } from 'react'
import { Dancing_Script } from 'next/font/google'
import '../globals.css'

const script = Dancing_Script({
  subsets: ['latin', 'latin-ext'],
  weight: ['600', '700'],
  variable: '--font-script',
  display: 'swap',
})

/**
 * Per-locale root layout.
 *
 * This file replaces the previous app/layout.tsx. It:
 *   - Validates the locale param (404 if unsupported)
 *   - Sets the html lang attribute correctly per locale
 *   - Wraps with NextIntlClientProvider so client components can use
 *     useTranslations() without prop-drilling
 *   - Keeps the global BookingProvider at the root
 */

export const metadata: Metadata = {
  title: {
    default: 'TravelBeez · Greek Islands Ferry, Car Rental & Tours',
    template: '%s · TravelBeez',
  },
  description:
    'Licensed Greek travel agency. Ferry tickets, car rentals, hotels and tours across the Aegean. Operating from Kos Port.',
  metadataBase: new URL(SITE_URL),
  alternates: {
    languages: {
      en: '/en',
      tr: '/tr',
      el: '/el',
      'x-default': '/en',
    },
  },
  openGraph: {
    siteName: 'TravelBeez',
    type: 'website',
    title: 'TravelBeez · Greek Islands Ferry, Car Rental & Tours',
    description:
      'Licensed Greek travel agency. Ferry tickets, car rentals and tours across the Aegean. Operating from Kos Port.',
    images: [{ url: '/hero-greek-islands.webp', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TravelBeez · Greek Islands Ferry, Car Rental & Tours',
    description:
      'Ferry tickets, car rentals and tours across the Aegean. From Kos Port.',
    images: ['/hero-greek-islands.webp'],
  },
}

// Site-geneli yapılandırılmış veri — statik, locale-bağımsız → tek yer (root <body>).
// Telefon lib/contact.ts tek kaynağından (getLandline href'inden E.164 türetilir).
const ORG_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'TravelAgency',
      '@id': `${SITE_URL}#organization`,
      name: 'TravelBeez',
      legalName: 'FerryBee Travel IKE',
      url: SITE_URL,
      logo: `${SITE_URL}/travelbeez-logo.png`,
      image: `${SITE_URL}/travelbeez-kos-office.webp`,
      telephone: getLandline().href.replace('tel:', ''),
      priceRange: '€€',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '4 G. Averof str',
        postalCode: '85300',
        addressLocality: 'Kos',
        addressRegion: 'South Aegean',
        addressCountry: 'GR',
      },
      areaServed: [
        { '@type': 'Country', name: 'Greece' },
        { '@type': 'Country', name: 'Türkiye' },
      ],
      identifier: {
        '@type': 'PropertyValue',
        propertyID: 'MHTE',
        value: '1471E60000074600',
      },
      sameAs: ['https://www.instagram.com/travelbeez.gr/'],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}#website`,
      url: SITE_URL,
      name: 'TravelBeez',
      publisher: { '@id': `${SITE_URL}#organization` },
      inLanguage: ['tr', 'en', 'el'],
    },
  ],
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Block any URL with an unsupported locale segment
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  // Required for static rendering of locale-aware pages
  setRequestLocale(locale)

  // Pull messages for the active locale
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${script.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }}
        />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Suspense fallback={null}>
            <BookingProvider>{children}</BookingProvider>
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
