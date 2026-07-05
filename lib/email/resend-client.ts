import 'server-only'
import { Resend } from 'resend'

/** Resend's test domain — used until RESEND_FROM_ADDRESS is verified. */
export const FROM_FALLBACK = 'TravelBeez <onboarding@resend.dev>'

let resendInstance: Resend | null = null

/**
 * Lazy Resend singleton. Returns null when RESEND_API_KEY is unset, so every
 * caller (booking confirmation, companion invite, …) can skip sending
 * gracefully rather than throw — mail is never allowed to fail a flow.
 */
export function getResend(): Resend | null {
  if (resendInstance) return resendInstance
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  resendInstance = new Resend(apiKey)
  return resendInstance
}
