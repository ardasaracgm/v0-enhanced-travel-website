import 'server-only'
import { getResend, FROM_FALLBACK } from './resend-client'

/**
 * Bilingual (TR+EN) internal notice to NOTIFY_ADDRESS (the office inbox) — the
 * SINGLE source for every office notification (signup, contact, future
 * inquiries). Not a customer email: one mail carries a TR block, a separator,
 * then an EN block, so the bilingual office reads both.
 *
 * Env-gated + fully non-fatal: no NOTIFY_ADDRESS / no RESEND_API_KEY → silent
 * skip; any send error is swallowed. A mail failure must NEVER break the calling
 * flow (signup redirect, contact insert, …).
 *
 * `subject` is passed through verbatim (caller composes it bilingual).
 * `replyTo` lets the office reply straight to the customer (e.g. contact form).
 */
export async function sendOfficeNotification({
  subject,
  trBlock,
  enBlock,
  replyTo,
  category = 'office_notification',
}: {
  subject: string
  trBlock: string
  enBlock: string
  replyTo?: string
  category?: string
}): Promise<void> {
  const to = process.env.NOTIFY_ADDRESS?.trim()
  if (!to) return
  const resend = getResend()
  if (!resend) return

  const from = process.env.RESEND_FROM_ADDRESS || FROM_FALLBACK
  try {
    await resend.emails.send({
      from,
      to: [to],
      ...(replyTo ? { replyTo } : {}),
      subject,
      text: `${trBlock}\n\n———\n\n${enBlock}`,
      tags: [{ name: 'category', value: category }],
    })
  } catch (err) {
    console.error('[office-notify] send failed (non-fatal):', err instanceof Error ? err.message : String(err))
  }
}
