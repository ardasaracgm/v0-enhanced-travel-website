import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { SITE_URL } from '@/lib/site-config'
import PackagePickupClient from './package-pickup-client'

// Server wrapper: metadata + Service JSON-LD. Sayfa gövdesi package-pickup-client.tsx'te.
// og:image yok → root layout default'una (/hero-greek-islands.webp) düşer.
const PATH = '/package-pickup'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo.packagePickup' })
  const title = t('title')
  const description = t('description')
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${PATH}`,
      languages: {
        tr: `/tr${PATH}`, en: `/en${PATH}`, el: `/el${PATH}`, 'x-default': `/en${PATH}`,
      },
    },
    openGraph: { title, description, type: 'website', locale },
  }
}

export default async function PackagePickupPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo.packagePickup' })
  const serviceLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE_URL}/${locale}${PATH}#service`,
    serviceType: 'Package pickup',
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
      <PackagePickupClient />
    </>
  )
}
