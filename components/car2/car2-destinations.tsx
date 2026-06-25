import Image from 'next/image'
import { useTranslations } from 'next-intl'

// Real Kos photography (Arda's own shots), WebP ~800px, served from /public/destinations.
const DESTS = [
  { key: 'dest1', img: '/destinations/tigaki-beach-kos.webp' }, // Tigaki Plajı
  { key: 'dest2', img: '/destinations/zia-village-sunset-kos.webp' }, // Zia Köyü
  { key: 'dest3', img: '/destinations/asklepion-ancient-ruins-kos.webp' }, // Asklepion
  { key: 'dest4', img: '/destinations/kefalos-bay-kos.webp' }, // Kefalos
  { key: 'dest5', img: '/destinations/paradise-beach-kos.webp' }, // Paradise Beach
  { key: 'dest6', img: '/destinations/neratzia-castle-kos.webp' }, // Neratzia Kalesi
] as const

export function Car2Destinations() {
  const t = useTranslations('car2')
  return (
    <section className="w-full py-16 md:py-24">
      <div className="container px-4 md:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-[0.2em] text-amber-600">{t('destTitle')}</h2>
          <p className="text-lg text-muted-foreground">{t('destSubtitle')}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DESTS.map(({ key, img }) => (
            <div key={key} className="group relative aspect-[3/2] overflow-hidden rounded-3xl">
              <Image
                src={img}
                alt={t(key)}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-3 text-center text-sm font-semibold text-white">
                {t(key)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
