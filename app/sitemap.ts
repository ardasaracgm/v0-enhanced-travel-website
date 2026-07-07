import type { MetadataRoute } from 'next'
import { ISLAND_SLUGS } from '@/lib/islands-content'
import { SITE_URL } from '@/lib/site-config'

const LOCALES = ['tr', 'en', 'el'] as const

// Public, indexlenebilir statik route'lar (auth/akış/coming-soon HARİÇ — sitemap keşfi 2026-07).
const STATIC_PATHS = [
  '', '/ferry', '/car-rental', '/insurance', '/transfer',
  '/visa', '/luggage', '/contact', '/privacy', '/terms',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [...STATIC_PATHS, ...ISLAND_SLUGS.map((s) => `/islands/${s}`)]
  return paths.flatMap((path) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : path.startsWith('/islands/') ? 0.8 : 0.7,
      alternates: {
        languages: Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}/${l}${path}`])),
      },
    })),
  )
}
