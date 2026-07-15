import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { Header } from '@/components/islandbee/header'
import Component from '../../enhanced-travel-website'

// Server component: kendi metadata'sını export eder (homepage en önemli sayfa).
// Header + Component ayrı client bileşenleri — server'dan render edilmeleri sorunsuz.
// Service JSON-LD YOK: site-geneli Organization + WebSite zaten root layout'ta.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo.home' })
  const title = t('title')
  const description = t('description')
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        tr: '/tr', en: '/en', el: '/el', 'x-default': '/en',
      },
    },
    openGraph: {
      title, description, type: 'website', locale,
      images: ['/hero-greek-islands.webp'],
    },
  }
}

export default async function HomePage() {
  return (
    <>
      <Header />
      <Component />
    </>
  )
}
