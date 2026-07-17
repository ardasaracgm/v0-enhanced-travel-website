import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { buildMetadata } from '@/lib/seo'
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
  return buildMetadata({
    locale,
    path: '',
    title: t('title'),
    description: t('description'),
    image: '/hero-greek-islands.webp',
  })
}

export default async function HomePage() {
  return (
    <>
      <Header />
      <Component />
    </>
  )
}
