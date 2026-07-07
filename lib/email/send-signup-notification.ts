import 'server-only'
import { getResend, FROM_FALLBACK } from './resend-client'

/**
 * Internal "new member" notice to NOTIFY_ADDRESS (the office inbox). NOT a
 * customer email — locale-independent, plain single block. Env-gated + fully
 * non-fatal: no NOTIFY_ADDRESS / no RESEND_API_KEY → silent skip; any send error
 * is swallowed. Fired from the auth callback via after(), so it never delays or
 * breaks the login redirect.
 */
export async function sendSignupNotification(email: string, signedUpAt: string | null): Promise<void> {
  const to = process.env.NOTIFY_ADDRESS?.trim()
  if (!to) return
  const resend = getResend()
  if (!resend) return

  const from = process.env.RESEND_FROM_ADDRESS || FROM_FALLBACK
  const when = signedUpAt ?? new Date().toISOString()
  try {
    await resend.emails.send({
      from,
      to: [to],
      // İç ofis bildirimi (info@) — iki-dilli tek mail: TR bloğu + ayraç + EN bloğu.
      subject: `Yeni üye kaydı / New member — ${email}`,
      text:
        `Yeni bir üye Hub'a kaydoldu.\n\nE-posta: ${email}\nKayıt zamanı (UTC): ${when}\n\n` +
        `———\n\n` +
        `A new member signed up for the Hub.\n\nEmail: ${email}\nSigned up (UTC): ${when}`,
      tags: [{ name: 'category', value: 'signup_notification' }],
    })
  } catch (err) {
    console.error('[signup-notify] send failed (non-fatal):', err instanceof Error ? err.message : String(err))
  }
}
