/**
 * Email sender — Resend.
 *
 * Fails gracefully if RESEND_API_KEY isn't set: logs a warning and
 * returns `{ sent: false }` without throwing. This lets booking
 * creation succeed even before the Resend account is set up.
 *
 * Setup (when you're ready):
 *   1. Sign up at https://resend.com (free tier: 3,000/month)
 *   2. Add and verify your domain (travelbeez.gr) in Resend Dashboard
 *   3. Add DNS records (SPF, DKIM) — Resend provides exact values
 *   4. Generate an API key
 *   5. Vercel → Settings → Environment Variables:
 *        RESEND_API_KEY        = re_...
 *        RESEND_FROM_ADDRESS   = bookings@travelbeez.gr
 *   6. Redeploy
 *
 * Until step 6, email sending will be skipped silently. Booking
 * flow still works — customer sees the confirmation page and
 * WhatsApp button, just no email.
 */

import 'server-only'
import { Resend } from 'resend'
import {
  renderBookingConfirmationEmail,
  type BookingEmailData,
} from './templates/booking-confirmation'

const FROM_FALLBACK = 'TravelBeez <onboarding@resend.dev>' // Resend's test domain

let resendInstance: Resend | null = null

function getResend(): Resend | null {
  if (resendInstance) return resendInstance
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  resendInstance = new Resend(apiKey)
  return resendInstance
}

export interface SendResult {
  sent: boolean
  id?: string
  error?: string
  skipReason?: string
}

export async function sendBookingConfirmation(
  to: string,
  data: BookingEmailData
): Promise<SendResult> {
  const resend = getResend()

  if (!resend) {
    console.warn(
      '[email] RESEND_API_KEY not set — booking confirmation email skipped'
    )
    return { sent: false, skipReason: 'RESEND_API_KEY missing' }
  }

  const from = process.env.RESEND_FROM_ADDRESS || FROM_FALLBACK
  const { subject, html, text } = renderBookingConfirmationEmail(data)

  try {
    const result = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
      text,
      tags: [
        { name: 'category', value: 'booking_confirmation' },
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
    console.error('[email] sendBookingConfirmation threw:', msg)
    return { sent: false, error: msg }
  }
}
