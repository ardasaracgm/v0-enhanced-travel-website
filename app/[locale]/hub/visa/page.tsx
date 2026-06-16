import { Link, redirect } from '@/i18n/routing'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getMyVisaApplications } from '@/lib/hub/get-my-visa-applications'
import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

const STATE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  new: 'outline',
  in_progress: 'secondary',
  pending_payment: 'outline',
  reviewed: 'default',
  approved: 'default',
  rejected: 'destructive',
}

// 🔐 searchParams KASITLI YOK — email YALNIZ oturumdan gelir; hiçbir client kanalı
// (query/form) email taşıyamaz (IDOR engeli, yapısal).
export default async function HubVisaPage({
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
  const applications = await getMyVisaApplications(user.email ?? '')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="w-full py-8">
          <div className="container px-4 md:px-6 space-y-6">
            <div>
              <Link href="/hub" className="text-sm text-muted-foreground hover:underline">
                ← Hub
              </Link>
              <h1 className="mt-1 text-2xl md:text-3xl font-bold text-foreground">Visa Applications</h1>
            </div>

            {applications.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  No visa applications found for {user.email}.
                </p>
                <Link href="/visa" className="text-sm font-medium text-primary hover:underline">
                  Start a new visa application →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((a) => (
                  <Link
                    key={a.id}
                    href={`/hub/visa/${a.id}`}
                    className="block rounded-md border bg-background p-4 transition-shadow hover:shadow-md cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-medium text-foreground">
                        {a.firstName} {a.lastName}
                      </span>
                      <Badge variant={STATE_VARIANT[a.state] ?? 'outline'}>{a.state}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString('en-GB')}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
