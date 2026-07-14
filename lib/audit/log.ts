import 'server-only'
import { getSupabaseAdmin } from '@/lib/supabase-server'

type AuditEvent = {
  /** Aktor auth.users id'si. Bilinmiyorsa (basarisiz login) atlanabilir. */
  actorId?: string | null
  /** Aktor email snapshot'i (denormalize — kullanici silinse de kalir). */
  actorEmail?: string | null
  /** 'admin.login.success' | 'admin.login.failure' | 'admin.logout' (K1); K2: 'payment.confirm' vb. */
  action: string
  /** Hedef nesne tipi: 'trip' | 'car' | 'visa' | 'profile' ... (login'de yok). */
  targetType?: string | null
  /** Hedef nesne id'si (text — degisik id sekilleri). */
  targetId?: string | null
  /** Serbest baglam: { negotiated_rate: 0, reason: '...' } vb. */
  details?: Record<string, unknown>
  ip?: string | null
}

/**
 * Admin denetim izine (admin_audit_log) tek satir yazar.
 *
 * NON-FATAL: insert hatasi YUTULUR (console.error + return). Login/logout ve K2
 * yazma-action'lari, audit insert'i hata verse bile ASLA kirilmaz
 * (availability > log-completeness). Tamper-proofness silinemezlikte (append-only
 * trigger + RLS + revoke, bkz. 032), her insert'in garantisinde degil.
 *
 * Tek merkez: K1 login/logout + K2 tum admin yazma islemleri bunu kullanir.
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('admin_audit_log').insert({
      actor_id: event.actorId ?? null,
      actor_email: event.actorEmail ?? null,
      action: event.action,
      target_type: event.targetType ?? null,
      target_id: event.targetId ?? null,
      details: event.details ?? {},
      ip: event.ip ?? null,
    })
    if (error) {
      console.error('[audit] insert failed:', event.action, error.message)
    }
  } catch (err) {
    console.error('[audit] insert threw:', event.action, err)
  }
}
