'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

import { requireFullAdmin } from '@/lib/auth/require-admin'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { logAuditEvent } from '@/lib/audit/log'
import { clientIp } from '@/lib/auth/rate-limit'

const ROLES = new Set(['full', 'cars_only'])

type TargetRow = { is_admin: boolean; admin_role: string; email: string | null }

/**
 * SON-FULL-ADMIN guard — read-then-write, YAZMADAN ÖNCE aynı action içinde.
 * Yalnız işlem full sayısını AZALTIYORSA (hedef şu an full ve demote/disable
 * ediliyor) devreye girer. count<=1 ise hedef son full admindir → reddet.
 *
 * ⚠️ TOCTOU: iki eşzamanlı demote (iki farklı son-iki full admin) ikisi de
 * count=2 görüp yazabilir → 0 full admin. Gerçek atomik koruma DB-seviyesi
 * kısıt/partial-unique ister (migration) — bu aşamada YOK, bilinçli. Tek-admin
 * operasyonu için pratikte yeterli; kalıcı çözüm davet epiğine bırakıldı.
 */
async function assertNotLastFullAdmin(
  admin: ReturnType<typeof getSupabaseAdmin>,
  target: TargetRow,
): Promise<void> {
  const targetIsFull = target.is_admin && target.admin_role === 'full'
  if (!targetIsFull) return
  const { count, error } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_admin', true)
    .eq('admin_role', 'full')
  if (error) throw new Error(`admin_count_failed: ${error.message}`)
  if ((count ?? 0) <= 1) throw new Error('last_full_admin')
}

async function readTarget(
  admin: ReturnType<typeof getSupabaseAdmin>,
  targetId: string,
): Promise<TargetRow> {
  const { data, error } = await admin
    .from('profiles')
    .select('is_admin, admin_role, email')
    .eq('id', targetId)
    .maybeSingle()
  if (error) throw new Error(`target_lookup_failed: ${error.message}`)
  if (!data) throw new Error('user_not_found')
  return data as TargetRow
}

/**
 * full ↔ cars_only rol değişimi (yalnız full-admin). Çift yön serbest; yalnız
 * demote (→cars_only) son-admin guard'lı. Self full→cars_only reddedilir.
 */
export async function setAdminRole(formData: FormData): Promise<void> {
  const targetId = String(formData.get('targetId') ?? '')
  const role = String(formData.get('role') ?? '')
  const locale = String(formData.get('locale') ?? 'tr')
  if (!targetId || !ROLES.has(role)) throw new Error('invalid_request')

  const gate = await requireFullAdmin()
  if (!gate.ok) throw new Error('forbidden')

  // Guard sırası: 1) self  2) son-full-admin. Self full→cars_only kendini kilitler.
  if (targetId === gate.userId && role !== 'full') throw new Error('cannot_demote_self')

  const admin = getSupabaseAdmin()
  const target = await readTarget(admin, targetId)

  // Demote yönü (full → cars_only) full sayısını azaltır → son-admin guard.
  if (role === 'cars_only') await assertNotLastFullAdmin(admin, target)

  const { error } = await admin
    .from('profiles')
    .update({ admin_role: role })
    .eq('id', targetId)
  if (error) throw new Error(`role_update_failed: ${error.message}`)

  await logAuditEvent({
    actorId: gate.userId,
    actorEmail: gate.email,
    action: 'user.role.set',
    targetType: 'profile',
    targetId,
    details: { from: target.admin_role, to: role, target_email: target.email },
    ip: clientIp(await headers()),
  })

  revalidatePath(`/${locale}/admin/users`)
}

/**
 * Soft-disable: is_admin=false (auth.users'a DOKUNMAZ). Self yasak; hedef son
 * full admin ise yasak. Re-enable UI'da YOK — manuel SQL (list is_admin=true).
 */
export async function setAdminDisabled(formData: FormData): Promise<void> {
  const targetId = String(formData.get('targetId') ?? '')
  const locale = String(formData.get('locale') ?? 'tr')
  if (!targetId) throw new Error('invalid_request')

  const gate = await requireFullAdmin()
  if (!gate.ok) throw new Error('forbidden')

  if (targetId === gate.userId) throw new Error('cannot_disable_self')

  const admin = getSupabaseAdmin()
  const target = await readTarget(admin, targetId)
  await assertNotLastFullAdmin(admin, target) // full ise son-admin koruması

  const { error } = await admin
    .from('profiles')
    .update({ is_admin: false })
    .eq('id', targetId)
  if (error) throw new Error(`disable_failed: ${error.message}`)

  await logAuditEvent({
    actorId: gate.userId,
    actorEmail: gate.email,
    action: 'user.disable',
    targetType: 'profile',
    targetId,
    details: { prev_role: target.admin_role, target_email: target.email },
    ip: clientIp(await headers()),
  })

  revalidatePath(`/${locale}/admin/users`)
}
