import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { SITE_URL } from '@/lib/site-config'
import { buildMetadata } from '@/lib/seo'
import InsurancePageClient from './insurance-page-client'

// Server wrapper: metadata + Service JSON-LD. Suspense sınırı ve useSearchParams
// prefill insurance-page-client.tsx'te (default export zaten <Suspense><Inner/>).
// Asıl akış insurance-wizard.tsx'te — dokunulmaz.
const PATH = '/insurance'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo.insurance' })
  return buildMetadata({
    locale,
    path: PATH,
    title: t('title'),
    description: t('description'),
    image: '/services/insurance-hero_main.webp',
  })
}

export default async function InsurancePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo.insurance' })
  const serviceLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE_URL}/${locale}${PATH}#service`,
    serviceType: 'Travel insurance',
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
      <InsurancePageClient />
    </>
  )
}
