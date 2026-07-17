import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { SITE_URL } from '@/lib/site-config'
import { buildMetadata } from '@/lib/seo'
import LuggagePageClient from './luggage-page-client'

// Server wrapper: metadata + Service JSON-LD. Suspense sınırı ve useSearchParams
// prefill luggage-page-client.tsx'te (default export zaten <Suspense><Inner/>).
// Asıl akış luggage-client.tsx'te — dokunulmaz.
const PATH = '/luggage'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo.luggage' })
  return buildMetadata({
    locale,
    path: PATH,
    title: t('title'),
    description: t('description'),
    image: '/services/luggage-sizes.webp',
  })
}

export default async function LuggagePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo.luggage' })
  const serviceLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE_URL}/${locale}${PATH}#service`,
    serviceType: 'Luggage shipping',
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
      <LuggagePageClient />
    </>
  )
}
