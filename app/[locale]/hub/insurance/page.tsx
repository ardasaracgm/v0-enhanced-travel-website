import { Link, redirect } from '@/i18n/routing'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getMyInsurancePolicies } from '@/lib/hub/get-my-insurance-policies'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

const STATE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending_payment: 'outline',
  confirmed: 'default',
  in_progress: 'secondary',
  completed: 'default',
  cancelled: 'destructive',
  failed: 'destructive',
}

const POLICY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  issued: 'default',
  pending: 'secondary',
  failed: 'destructive',
}

// 🔐 searchParams KASITLI YOK — email YALNIZ oturumdan gelir; hiçbir client kanalı
// (query/form) email taşıyamaz (IDOR engeli, yapısal).
export default async function HubInsurancePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect({ href: '/hub', locale })
    return null
  }

  // Email YALNIZCA doğrulanmış oturumdan. Helper'a başka kaynak GEÇMEZ.
  const policies = await getMyInsurancePolicies(user.email ?? '')

  return (
    <div className="space-y-6">
            <div>
              <Link href="/hub" className="text-sm text-muted-foreground hover:underline">
                ← Hub
              </Link>
              <h1 className="mt-1 text-2xl md:text-3xl font-bold text-foreground">
                Travel Insurance
              </h1>
            </div>

            {policies.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  No insurance policies found for {user.email}.
                </p>
                <Link href="/insurance" className="text-sm font-medium text-primary hover:underline">
                  Get travel insurance →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {policies.map((p) => (
                  <div key={`${p.tripId}-${p.policeNum ?? p.title}`} className="rounded-md border bg-background p-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-medium text-foreground">{p.reference}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        {p.policyState && (
                          <Badge variant={POLICY_VARIANT[p.policyState] ?? 'outline'}>
                            {p.policyState}
                          </Badge>
                        )}
                        <Badge variant={STATE_VARIANT[p.tripState] ?? 'outline'}>{p.tripState}</Badge>
                      </div>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{p.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.startsAt ? new Date(p.startsAt).toLocaleDateString('en-GB') : '—'}
                          {p.endsAt ? ` → ${new Date(p.endsAt).toLocaleDateString('en-GB')}` : ''}
                          {p.coverageValue ? ` · €${p.coverageValue.toLocaleString('en-GB')} cover` : ''}
                          {p.policeNum ? ` · Policy #${p.policeNum}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm text-foreground">
                        {p.priceAmount} {p.priceCurrency}
                      </span>
                    </div>
                    {p.downloadUrl && (
                      <div className="mt-3 border-t pt-3">
                        <a
                          href={p.downloadUrl}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Download policy PDF
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
    </div>
  )
}
