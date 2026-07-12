import { Link, redirect } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getMyPayments } from '@/lib/hub/get-my-payments'
import { formatLocalDay } from '@/lib/dates/display'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

const STATE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  refunded: 'secondary',
  partially_refunded: 'secondary',
  pending: 'outline',
  failed: 'destructive',
}

// 🔐 searchParams KASITLI YOK — email YALNIZ oturumdan gelir (IDOR engeli, yapısal).
export default async function HubPaymentsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('hub')

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect({ href: '/hub', locale })
    return null
  }

  // Email YALNIZCA doğrulanmış oturumdan. Helper'a başka kaynak GEÇMEZ.
  const payments = await getMyPayments(user.email ?? '')

  // Tarih: completed_at bir instant → İstanbul takvim günü (formatLocalDay
  // noon-UTC + explicit UTC ile server-TZ-proof; ham toLocaleDateString gece
  // yarısı bir gün kaydırırdı — lib/dates/display.ts). Ferry değil → port yok.
  const fmtAmount = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
    } catch {
      return `${amount.toFixed(2)} ${currency}`
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/hub" className="text-sm text-muted-foreground hover:underline">
          {t('paymentsPage.back')}
        </Link>
        <h1 className="mt-1 text-2xl md:text-3xl font-bold text-foreground">
          {t('paymentsPage.title')}
        </h1>
      </div>

      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('paymentsPage.noPayments', { email: user.email ?? '' })}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-background">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t('paymentsPage.colDate')}</th>
                <th className="px-4 py-3 font-medium">{t('paymentsPage.colReference')}</th>
                <th className="px-4 py-3 font-medium text-right">{t('paymentsPage.colAmount')}</th>
                <th className="px-4 py-3 font-medium">{t('paymentsPage.colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatLocalDay(p.date)}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{p.reference}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right font-medium text-foreground">
                    {fmtAmount(p.amount, p.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATE_VARIANT[p.state] ?? 'outline'}>
                      {t(`paymentState.${p.state}`)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
