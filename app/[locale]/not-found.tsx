import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export default function NotFound() {
  const t = useTranslations('notFound')

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-20 bg-background">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium tracking-widest text-primary uppercase">
          404
        </p>
        <h1 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
          {t('title')}
        </h1>
        <p className="mt-4 text-muted-foreground">{t('description')}</p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            {t('backHome')}
          </Link>
        </div>
      </div>
    </main>
  )
}
