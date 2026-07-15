import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'

export type AdminRole = 'full' | 'cars_only'

/** Dar DTO — parola/token YOK; yalnız listede gösterilen/gerekli alanlar. */
export type AdminUserRow = {
  id: string
  email: string
  phone: string | null
  is_admin: boolean
  admin_role: AdminRole
  created_at: string
}

/**
 * Aktif admin roster'ı (is_admin=true). Service-role ZORUNLU: own-row RLS
 * (profiles_select_own) başkasının satırını okumaya izin vermez → çok-satır
 * admin listesi yalnız RLS-bypass ile mümkün. Yazma yok, sadece okuma.
 *
 * NOT: yalnız is_admin=true satırlar — profiles her OTP müşterisini içerir,
 * filtresiz döküm binlerce müşteri PII'sini admin sayfasına düşürürdü. Yazma
 * kapsamı zaten adminler arası (full↔cars_only + soft-disable). Soft-disable
 * (is_admin=false) sonrası satır bu filtreden düşer → UI'dan re-enable YOK;
 * geri açma manuel SQL (mevcut terfi deseniyle tutarlı, davet epiğine bırakıldı).
 */
export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, phone, is_admin, admin_role, created_at')
    .eq('is_admin', true)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`list_admins_failed: ${error.message}`)
  return (data ?? []) as AdminUserRow[]
}
