import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
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
    openGraph: {
      title, description, type: 'website', locale,
      images: ['/travelbeez-kos-office.webp'],
    },
  }
}

export default function ContactPage() {
  return <ContactClient />
}
