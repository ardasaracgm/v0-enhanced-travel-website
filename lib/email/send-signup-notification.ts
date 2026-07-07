import 'server-only'
import { sendOfficeNotification } from './send-office-notification'

/**
 * Internal "new member" notice to the office inbox — bilingual (TR+EN) via the
 * shared sendOfficeNotification helper (env-gated + non-fatal; single source).
 * Fired from the auth callback via after(), so it never delays or breaks the
 * login redirect.
 */
export async function sendSignupNotification(email: string, signedUpAt: string | null): Promise<void> {
  const when = signedUpAt ?? new Date().toISOString()
  await sendOfficeNotification({
    subject: `Yeni üye kaydı / New member — ${email}`,
    trBlock: `Yeni bir üye Hub'a kaydoldu.\n\nE-posta: ${email}\nKayıt zamanı (UTC): ${when}`,
    enBlock: `A new member signed up for the Hub.\n\nEmail: ${email}\nSigned up (UTC): ${when}`,
    category: 'signup_notification',
  })
}
