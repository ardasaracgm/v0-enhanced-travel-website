import type { Metadata } from 'next'

/**
 * Tek kaynak: sayfa metadata'sının openGraph + twitter bloklarını birlikte üretir.
 *
 * Neden var: twitter:title/description eskiden root layout'ta SABİT İngilizce
 * anasayfa metniydi (her sayfada aynı çıkıyordu, transfer'de bile). Sayfalar
 * openGraph'ı locale'e göre doğru veriyordu ama twitter'a dokunmuyordu →
 * "og doğru, twitter yanlış" bug'ı. Bu helper og + twitter'ı AYNI
 * title/description/image'dan üretir; ikisi yapısal olarak asla ayrışamaz.
 *
 * KRİTİK: openGraph çıktısı, sayfaların elle yazdığı önceki objeyle BİREBİR
 * aynı alanları üretir (title, description, type, locale, [images]). og
 * davranışı DEĞİŞMEZ — tek eklenen twitter'dır. Görsel vermeyen sayfalarda
 * (tours/package-pickup/events) images alanı hiç set edilmez → Next twitter
 * görselini og'dan (o da root layout default'undan) türetir; hizalı kalır.
 *
 * canonical + hreflang tek `path`'ten mekanik üretilir (metadataBase root
 * layout'ta → göreli path'ler mutlaklaşır). siteName/metadataBase gibi alanlar
 * bilinçli olarak set EDİLMEZ; root layout'tan miras alınır (eski davranış).
 */
type BuildMetadataInput = {
  /** Locale segmenti: 'tr' | 'en' | 'el'. og:locale + canonical + hreflang'i sürer. */
  locale: string
  /** Path (locale'siz), örn. '/transfer'. Anasayfa için '' geç. */
  path: string
  /** Şablon uygulanmamış ham başlık (t('title')). og/twitter'a aynen gider. */
  title: string
  /** Açıklama (t('description')). */
  description: string
  /** Kök-göreli og/twitter görseli, örn. '/transfer-hero.webp'. Verilmezse
   *  root layout default'una düşer (bilinçli — eski davranış korunur). */
  image?: string
  /** og:type. Varsayılan 'website'; ada sayfaları 'article'. */
  ogType?: 'website' | 'article'
  /** Başlık zaten "| TravelBeez" içeriyorsa true → layout '%s · TravelBeez'
   *  template'ini bypass eder (ada sayfaları). */
  absoluteTitle?: boolean
  /** hreflang'e x-default eklensin mi. Varsayılan true; ada sayfaları false
   *  (eski davranışı korumak için). */
  xDefault?: boolean
}

export function buildMetadata({
  locale,
  path,
  title,
  description,
  image,
  ogType = 'website',
  absoluteTitle = false,
  xDefault = true,
}: BuildMetadataInput): Metadata {
  const languages: Record<string, string> = {
    tr: `/tr${path}`,
    en: `/en${path}`,
    el: `/el${path}`,
  }
  if (xDefault) languages['x-default'] = `/en${path}`

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages,
    },
    openGraph: {
      title,
      description,
      type: ogType,
      locale,
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
}
