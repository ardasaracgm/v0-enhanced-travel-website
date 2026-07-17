import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { SITE_URL } from '@/lib/site-config'
import { buildMetadata } from '@/lib/seo'
import CarRentalClient from './car-rental-client'

// Server wrapper: metadata + Service JSON-LD. Client hook'lar (useSearchParams,
// useRouter, useBooking) ve Suspense sınırı car-rental-client.tsx'te kalır.
const PATH = '/car-rental'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo.carRental' })
  return buildMetadata({
    locale,
    path: PATH,
    title: t('title'),
    description: t('description'),
    image: '/cars/kos-hero.webp',
  })
}

export default async function CarRentalPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo.carRental' })
  const serviceLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE_URL}/${locale}${PATH}#service`,
    serviceType: 'Car rental',
    name: t('title'),
    description: t('description'),
    provider: { '@type': 'TravelAgency', '@id': `${SITE_URL}#organization` },
    areaServed: [
      { '@type': 'Country', name: 'Greece' },
      { '@type': 'Country', name: 'Türkiye' },
    ],
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: `${SITE_URL}/${locale}${PATH}`,
    },
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
      />
      <CarRentalClient />
    </>
  )
}
