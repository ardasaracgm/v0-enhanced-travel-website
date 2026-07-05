import 'server-only'
import { getResend, FROM_FALLBACK } from './resend-client'
import {
  renderCompanionInviteEmail,
  type CompanionInviteData,
} from './templates/companion-invite'
import type { SendResult } from './send-confirmation'

/**
 * Companion invite / consent-request email. Same graceful contract as
 * sendBookingConfirmation: no RESEND_API_KEY → { sent:false } (never throws).
 * The actual trigger lives in Parça 3b (owner adds a companion in the Hub);
 * this is the ready-to-call infrastructure.
 */
export async function sendCompanionInvite(
  to: string,
  data: CompanionInviteData
): Promise<SendResult> {
  const resend = getResend()
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — companion invite skipped')
    return { sent: false, skipReason: 'RESEND_API_KEY missing' }
  }

  const from = process.env.RESEND_FROM_ADDRESS || FROM_FALLBACK
  const { subject, html, text } = renderCompanionInviteEmail(data)

  try {
    const result = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
      text,
      tags: [
        { name: 'category', value: 'companion_invite' },
        { name: 'locale', value: data.locale },
      ],
    })
    if (result.error) {
      console.error('[email] Resend returned error:', result.error)
      return { sent: false, error: result.error.message }
    }
    return { sent: true, id: result.data?.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[email] sendCompanionInvite threw:', msg)
    return { sent: false, error: msg }
  }
}
