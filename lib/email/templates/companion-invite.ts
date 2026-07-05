import type { Locale } from '@/lib/notifications/whatsapp-link'

export interface CompanionInviteData {
  /** Account owner who added this companion (shown as "X added you"). */
  ownerName: string
  /** Companion's own first name — greeting. */
  companionName: string
  /** Raw consent token — the page URL is built here (canonical domain). */
  consentToken: string
  locale: Locale
}

// `{owner}` in `intro` is substituted with data.ownerName at render time (kept a
// plain string so this stays a pure Record<Locale, Record<string,string>>, like
// the booking-confirmation template).
//
// Single-button design: the email carries ONE link (to the consent page) — no
// GET decline link, so email prefetch/scanners can't accidentally revoke. The
// approve/decline choice lives on the page as two POST buttons.
const T: Record<Locale, Record<string, string>> = {
  tr: {
    subject: 'TravelBeez — seyahat arkadaşı onayınız isteniyor',
    greeting: 'Merhaba',
    intro:
      '{owner}, sizi TravelBeez hesabında bir "seyahat arkadaşı" olarak ekledi. Bu, gelecekteki rezervasyonlarda yolcu bilgilerinizin (ad, doğum tarihi, pasaport) sizin adınıza kullanılabilmesi anlamına gelir.',
    consentBody:
      'Onaylamak veya reddetmek için aşağıdaki bağlantıyı açın. Kararınızı istediğiniz zaman aynı bağlantıdan değiştirebilirsiniz.',
    reviewCta: 'Daveti görüntüle',
    declineNote:
      'Bu kişiyi tanımıyorsanız açılan sayfadan reddedebilirsiniz — onayınız olmadan bilgileriniz kullanılmaz.',
    signupPrompt: 'Kendi yolculuklarınızı takip etmek ister misiniz?',
    signupCta: 'Üye olun',
    footer: 'TravelBeez · FerryBee Travel IKE · Kos Limanı, Yunanistan',
  },
  en: {
    subject: 'TravelBeez — your travel-companion consent is requested',
    greeting: 'Hi',
    intro:
      '{owner} added you as a "travel companion" on their TravelBeez account. This lets your passenger details (name, date of birth, passport) be used on their bookings on your behalf.',
    consentBody:
      'Open the link below to give or decline your consent. You can change your decision at any time from the same link.',
    reviewCta: 'View request',
    declineNote:
      "If you don't recognise this person, you can decline on the page that opens — your details are never used without your consent.",
    signupPrompt: 'Want to track your own trips?',
    signupCta: 'Sign up',
    footer: 'TravelBeez · FerryBee Travel IKE · Kos Port, Greece',
  },
  el: {
    subject: 'TravelBeez — απαιτείται η συγκατάθεσή σας ως συνταξιδιώτη',
    greeting: 'Γεια σας',
    intro:
      'Ο/Η {owner} σας πρόσθεσε ως «συνταξιδιώτη» στον λογαριασμό TravelBeez. Έτσι τα στοιχεία επιβάτη σας (όνομα, ημ. γέννησης, διαβατήριο) μπορούν να χρησιμοποιηθούν στις κρατήσεις του/της εκ μέρους σας.',
    consentBody:
      'Ανοίξτε τον παρακάτω σύνδεσμο για να δώσετε ή να απορρίψετε τη συγκατάθεσή σας. Μπορείτε να αλλάξετε την απόφασή σας ανά πάσα στιγμή από τον ίδιο σύνδεσμο.',
    reviewCta: 'Προβολή αιτήματος',
    declineNote:
      'Αν δεν αναγνωρίζετε αυτό το άτομο, μπορείτε να το απορρίψετε από τη σελίδα που ανοίγει — τα στοιχεία σας δεν χρησιμοποιούνται χωρίς τη συγκατάθεσή σας.',
    signupPrompt: 'Θέλετε να παρακολουθείτε τα δικά σας ταξίδια;',
    signupCta: 'Εγγραφείτε',
    footer: 'TravelBeez · FerryBee Travel ΙΚΕ · Λιμένας Κω, Ελλάδα',
  },
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderCompanionInviteEmail(data: CompanionInviteData): {
  subject: string
  html: string
  text: string
} {
  const t = T[data.locale]
  // Consent link — SABİT canonical domain (booking template ile aynı konvansiyon).
  const url = `https://www.travelbeez.gr/${data.locale}/companion/consent/${data.consentToken}`
  const loginUrl = `https://www.travelbeez.gr/${data.locale}/login`
  const intro = t.intro.replace('{owner}', data.ownerName)

  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
  <h1 style="font-size:20px;margin:0 0 16px;">${escape(t.greeting)} ${escape(data.companionName)},</h1>
  <p style="font-size:15px;line-height:1.6;">${escape(intro)}</p>
  <p style="font-size:15px;line-height:1.6;">${escape(t.consentBody)}</p>
  <p style="margin:24px 0;">
    <a href="${escape(url)}" style="display:inline-block;background:#2563eb;color:#ffffff;font-weight:600;font-size:15px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      ${escape(t.reviewCta)}
    </a>
  </p>
  <p style="font-size:13px;line-height:1.6;color:#64748b;">${escape(t.declineNote)}</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
  <p style="font-size:13px;line-height:1.6;color:#64748b;">${escape(t.signupPrompt)} <a href="${escape(loginUrl)}" style="color:#2563eb;text-decoration:underline;">${escape(t.signupCta)}</a></p>
  <p style="font-size:12px;color:#94a3b8;">${escape(t.footer)}</p>
</div>`

  const text =
    `${t.greeting} ${data.companionName},\n\n${intro}\n\n${t.consentBody}\n\n` +
    `${t.reviewCta}: ${url}\n\n${t.declineNote}\n\n` +
    `${t.signupPrompt} ${t.signupCta}: ${loginUrl}\n\n${t.footer}`

  return { subject: t.subject, html, text }
}
