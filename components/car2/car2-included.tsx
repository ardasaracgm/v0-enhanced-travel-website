import { Anchor, Infinity as InfinityIcon, LifeBuoy, ReceiptText, ShieldCheck, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

// 6 inclusions from the mockup, in order.
const ITEMS = [
  { Icon: ShieldCheck, key: 'included1' }, // Tam Sigorta (CDW + TPL)
  { Icon: InfinityIcon, key: 'included2' }, // Sınırsız Kilometre
  { Icon: Anchor, key: 'included3' }, // Ücretsiz Liman Teslim
  { Icon: LifeBuoy, key: 'included4' }, // 7/24 Yol Yardımı
  { Icon: ReceiptText, key: 'included5' }, // Gizli Ücret Yok
  { Icon: Sparkles, key: 'included6' }, // Temiz ve Bakımlı Araçlar
] as const

export function Car2Included() {
  const t = useTranslations('car2')
  return (
    <section className="w-full py-16 md:py-20">
      <div className="container px-4 md:px-6">
        <h2 className="mb-10 text-center text-sm font-semibold uppercase tracking-[0.2em] text-amber-500">{t('includedTitle')}</h2>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
          {ITEMS.map(({ Icon, key }) => (
            <div key={key} className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">{t(`${key}Title`)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t(`${key}Desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
