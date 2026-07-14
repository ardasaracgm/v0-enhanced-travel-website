import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'

/**
 * Full-admin yetki kontrolü — TEK KAYNAK (K2).
 * ================================================
 * ok:true  → kullanıcı is_admin (016) VE admin_role='full' (030) → tüm admin
 *            sayfa/action/route'lara erişebilir. userId = audit alanları için
 *            (ör. confirmed_by).
 * ok:false → misafir, admin değil, VEYA cars_only (kısıtlı rol) → yalnız /admin/cars.
 *
 * FIRLATMAZ — discriminated result döndürür; her çağıran KENDİ hata biçimini
 * korur, böylece 4 farklı bağlam tek helper'ı paylaşır ama exit stili değişmez:
 *   action → if (!gate.ok) throw new Error('forbidden')  /  return { ... }
 *   route  → if (!gate.ok) return NextResponse 403
 *   page   → if (!gate.ok) notFound()
 *   cars UI→ const canReserve = (await requireFullAdmin()).ok  (gate değil, görünürlük)
 *
 * userId + email döndürür (tam User nesnesi DEĞİL): tüketilenler user.id
 * (confirmed_by) ve user.email (audit actor_email snapshot'i). email opsiyonel
 * ek alandır — mevcut çağrılar (yalnız .ok / gate.userId) etkilenmez.
 *
 * 'use server' DEĞİL: action değil, auth-aware client (anon+cookie → own-row
 * RLS) ile KENDİ profiles satırını okuyan düz server util. Yazma/veri erişimi
 * ayrı: service-role (getSupabaseAdmin). Bu yalnız yetki gate'idir.
 */
export type FullAdminGate =
  | { ok: true; userId: string; email: string | null }
  | { ok: false }

export async function requireFullAdmin(): Promise<FullAdminGate> {
  const auth = await createSupabaseServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return { ok: false }

  const { data: profile } = await auth
    .from('profiles')
    .select('is_admin, admin_role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin || profile.admin_role !== 'full') return { ok: false }
  return { ok: true, userId: user.id, email: user.email ?? null }
}
