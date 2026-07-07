'use server'

import { submitContactRequest, type Locale } from '@/lib/supabase'
import { sendOfficeNotification } from '@/lib/email/send-office-notification'

/**
 * Server action for the contact form. Inserts the message (server context, still
 * RLS-enforced anon-insert policy) then fires a bilingual office notice.
 *
 * The insert result is authoritative: if it fails the user sees an error. The
 * office notice is non-fatal (helper swallows send errors) — a mail failure must
 * NOT flip a successful insert into an error. So we notify only after success
 * and never await its outcome into the return value.
 */
export async function submitContactRequestAction(input: {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  locale?: Locale
}): Promise<{ success: boolean; error?: string }> {
  const result = await submitContactRequest(input)
  if (!result.success) return result

  await sendOfficeNotification({
    subject: `Yeni iletişim mesajı / New contact — ${input.email}`,
    replyTo: input.email,
    trBlock:
      `Yeni bir iletişim mesajı alındı.\n\n` +
      `Ad: ${input.name}\nE-posta: ${input.email}\nTelefon: ${input.phone || '—'}\n` +
      `Konu: ${input.subject}\nMesaj:\n${input.message}`,
    enBlock:
      `A new contact message was received.\n\n` +
      `Name: ${input.name}\nEmail: ${input.email}\nPhone: ${input.phone || '—'}\n` +
      `Subject: ${input.subject}\nMessage:\n${input.message}`,
    category: 'contact_request',
  })

  return result
}
