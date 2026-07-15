import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // /api locale-prefix'siz (middleware matcher hariç) → düz /api/.
      // Diğerleri localePrefix 'always' → /*/ ile eşle.
      disallow: [
        '/api/', '/*/hub', '/*/admin', '/*/login', '/*/checkout',
        '/*/confirmation', '/*/ferry/results', '/*/ferry/passenger-details',
        '/*/companion', '/*/ticket', '/*/visa/documents',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
