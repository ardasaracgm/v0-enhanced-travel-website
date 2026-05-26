import type { Metadata } from 'next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { BookingProvider } from '@/lib/booking-context'
import { Suspense } from 'react'
import '../globals.css'

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
  metadataBase: new URL('https://travelbeez.gr'),
  alternates: {
    languages: {
      en: '/en',
      tr: '/tr',
      el: '/el',
    },
  },
  openGraph: {
    siteName: 'TravelBeez',
    type: 'website',
  },
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
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Suspense fallback={null}>
            <BookingProvider>{children}</BookingProvider>
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
