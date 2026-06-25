import Image from 'next/image'
import { useTranslations } from 'next-intl'

// Placeholder Unsplash shots — generic Greek-coast, NOT Kos-specific.
// SWAP PENDING: replace with real Kos photography before launch.
const DESTS = [
  { key: 'dest1', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80' }, // Tigaki Plajı
  { key: 'dest2', img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80' }, // Zia Köyü
  { key: 'dest3', img: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=600&q=80' }, // Asklepion
  { key: 'dest4', img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80' }, // Kefalos
  { key: 'dest5', img: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80' }, // Paradise Beach
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {DESTS.map(({ key, img }) => (
            <div key={key} className="group relative aspect-[4/5] overflow-hidden rounded-3xl">
              <Image
                src={img}
                alt={t(key)}
                fill
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
