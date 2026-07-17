import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo'
import ContactClient from './contact-client'

// Server wrapper: SADECE metadata. contact bir iletişim sayfası, "servis" değil
// → Service JSON-LD YOK (site-geneli Organization zaten root layout'ta).
// og:image kendi görseli (/travelbeez-kos-office.webp).
const PATH = '/contact'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo.contact' })
  return buildMetadata({
    locale,
    path: PATH,
    title: t('title'),
    description: t('description'),
    image: '/travelbeez-kos-office.webp',
  })
}

export default function ContactPage() {
  return <ContactClient />
}
