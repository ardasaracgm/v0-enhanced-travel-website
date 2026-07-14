'use server'

/**
 * Admin logout denetim izi.
 * =========================
 * signOut MEKANIGINI DEGISTIRMEZ — cagiran (header / hub-sidebar) hala client-side
 * supabase.auth.signOut() yapar. Bu action sadece server-side bir denetim satiri
 * birakir ve signOut'tan ONCE cagrilir (cookie hala gecerliyken kullaniciyi
 * okuyabilelim). Bu, en az-riskli yol: tum hub kullanicilarinin logout davranisi
 * degismez, yalniz admin icin bir log satiri eklenir.
 *
 * Yalniz is_admin kullanici loglanir (audit admin-scope). Normal hub kullanicisi
 * logout'u loglanmaz. Non-fatal — logout ASLA bu yuzden kirilmaz.
 */

import { headers } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { clientIp } from '@/lib/auth/rate-limit'
import { logAuditEvent } from '@/lib/audit/log'

export async function logAdminLogout(): Promise<void> {
  try {
    const auth = await createSupabaseServerClient()
    const {
      data: { user },
    } = await auth.auth.getUser()
    if (!user) return

    // is_admin okumasi service-role (deterministik). Admin degilse loglama.
    const { data: profile } = await getSupabaseAdmin()
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile?.is_admin) return

    await logAuditEvent({
      actorId: user.id,
      actorEmail: user.email ?? null,
      action: 'admin.logout',
      ip: clientIp(await headers()),
    })
  } catch (err) {
    // getUser/profile okumasi throw ederse logout'u bloklama.
    console.error('[audit] logAdminLogout threw:', err)
  }
}
