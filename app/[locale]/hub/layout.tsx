import type { ReactNode } from 'react'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { HubSidebar } from '@/components/hub/hub-sidebar'

export const dynamic = 'force-dynamic'

/**
 * Hub shell — owns <Header/>, the left nav sidebar and <Footer/> for every
 * /hub route (A2 lifted this out of the dashboard page so all sub-pages share
 * one shell; they no longer render their own Header/Footer).
 *
 * ⚠️ NO auth-gate here on purpose: this layout also wraps /hub itself, and the
 * sub-pages redirect guests to /hub — gating here would make a guest hitting
 * /hub loop forever. Each page keeps its own getUser + redirect('/hub'). We read
 * the user only to decide whether to show the sidebar (guests on /hub see the
 * landing without it).
 */
export default async function HubLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <div className="container flex flex-1 gap-6 px-4 py-8 md:px-6">
        {user && <HubSidebar />}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <Footer />
    </div>
  )
}
