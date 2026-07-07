import Image from 'next/image'
import { MapPin } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/routing'
import { ISLANDS, ISLAND_SLUGS } from '@/lib/islands-content'

// Ada sayfası sonu iç-link bölümü — mevcut ada hariç 4 kart.
// Server component (motion yok): heroImage webp + popularIslands i18n, locale
// otomatik ([[i18n/routing]] Link). car2 idiom: rounded-3xl kart, blue-950 başlık,
// amber location eyebrow — hero ile tutarlı.
export async function OtherIslands({
  currentSlug,
  locale,
}: {
  currentSlug: string
  locale: string
}) {
  const others = ISLAND_SLUGS.filter((s) => s !== currentSlug)
  if (others.length === 0) return null

  const t = await getTranslations({ locale, namespace: 'islands' })
  const tIslands = await getTranslations({ locale, namespace: 'popularIslands' })

  return (
    <section className="bg-secondary/30 py-16 md:py-24">
      <div className="container px-4 md:px-6">
        <h2 className="mb-10 text-3xl font-bold text-blue-950 md:text-4xl">
          {t('ui.otherIslandsTitle')}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {others.map((s) => {
            const name = tIslands(`items.${s}.name`)
            const location = tIslands(`items.${s}.location`)
            return (
              <Link
                key={s}
                href={`/islands/${s}`}
                className="group block overflow-hidden rounded-3xl bg-card shadow-md ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={ISLANDS[s].heroImage}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="space-y-2 p-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-blue-950">
                    <MapPin className="h-3 w-3" />
                    {location}
                  </span>
                  <h3 className="text-lg font-bold text-blue-950">{name}</h3>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
