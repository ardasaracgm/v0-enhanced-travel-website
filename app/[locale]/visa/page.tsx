import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { SITE_URL } from '@/lib/site-config'
import { buildMetadata } from '@/lib/seo'
import VisaClient from './visa-client'

// Server wrapper: metadata + Service JSON-LD. Client hook'lar (useSearchParams,
// form state) ve Suspense sınırı visa-client.tsx'te kalır.
const PATH = '/visa'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo.visa' })
  return buildMetadata({
    locale,
    path: PATH,
    title: t('title'),
    description: t('description'),
    image: '/visa-hero.webp',
  })
}

export default async function VisaPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo.visa' })
  const serviceLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE_URL}/${locale}${PATH}#service`,
    serviceType: 'Visa support',
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
      <VisaClient />
    </>
  )
}
