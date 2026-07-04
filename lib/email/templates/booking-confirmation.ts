/**
 * Booking confirmation email template.
 *
 * Plain HTML string with inline styles. Email clients (Gmail, Outlook,
 * Apple Mail, Yahoo) only support a tiny subset of CSS reliably:
 *   - inline styles only
 *   - table-based layout for complex structures
 *   - hex colors, no custom properties
 *   - no @import, no external stylesheets
 *   - no JavaScript
 *
 * This template is intentionally minimal. When we have bandwidth,
 * we'll migrate to @react-email/components for better DX and
 * automatic table/inline-style generation. For now: simple, works.
 */

import type { Locale } from '@/lib/notifications/whatsapp-link'
import { getWhatsAppDisplay, getLandline } from '@/lib/contact'

export interface BookingEmailData {
  reference: string
  customerName: string
  contactPhone: string
  contactEmail: string
  totalAmount: number
  currency: string
  locale: Locale
  items: Array<{
    type: string
    title: string
    scheduledAt?: string | null
    // Ferry legs only: RAW provider wall-clock times ("HH:MM" from
    // metadata.departure_time/arrival_time). When present they are printed
    // VERBATIM — the stored scheduledAt instant is correct, but Intl WITHOUT a
    // timeZone renders it server-local (UTC on Vercel) and shifts the printed
    // departure 2–3h off the voucher. Other item types keep formatDate(scheduledAt).
    departureTime?: string | null
    arrivalTime?: string | null
    price: number
  }>
  /**
   * Ferry reservation vouchers — PAID path only (populated after reserveFerry).
   * One entry per Dentur reservation group: round-trip → 1 voucher carrying every
   * leg's PNRs; open-jaw → one voucher per reservation. Rendered as a Dentur-style
   * block (Voucher No on top, one PNR line per passenger/leg). Omitted on pending.
   */
  ferryVouchers?: Array<{
    voucherNo: string
    route?: string
    pnrs: Array<{ pnr: number; passengerName?: string }>
  }>
  paymentWhatsAppUrl: string
  /**
   * When true, render the "payment received / confirmed" copy and OMIT the
   * WhatsApp pay button. Set by the Viva webhook on confirm. When omitted/false,
   * the existing "awaiting payment" + WhatsApp-CTA flow is used unchanged.
   */
  paid?: boolean
}

const T: Record<Locale, Record<string, string>> = {
  en: {
    subject: 'Your TravelBeez booking confirmation',
    headline: 'Booking received',
    greeting: 'Hi',
    intro:
      'Thank you for choosing TravelBeez. Your booking has been received and is awaiting payment confirmation.',
    refLabel: 'Booking Reference',
    itemsHeading: 'Your Trip',
    voucherHeading: 'Ferry Tickets',
    voucherNoLabel: 'Voucher No',
    totalLabel: 'Total',
    paymentHeading: 'Next Step: Confirm Payment',
    paymentBody:
      'Tap the button below to complete your payment via WhatsApp. We will send you a secure payment link and confirm your booking immediately.',
    paymentCta: 'Confirm Payment on WhatsApp',
    paidIntro:
      "Thank you for choosing TravelBeez. We've received your payment and your booking is now confirmed.",
    paidHeading: 'Payment Received — Booking Confirmed',
    paidBody:
      'Your payment has been received and your booking is confirmed. We look forward to welcoming you — no further action is needed.',
    hubHeading: 'Manage your booking online',
    hubBody:
      'Sign in to your TravelBeez Hub to track this booking, your visa and more — no password needed.',
    hubCta: 'Go to my Hub',
    footer:
      'TravelBeez · FerryBee Travel IKE · Kos Port, Greece · Licensed by the Greek Ministry of Tourism (MH.T.E.)',
    contactLine: `Questions? WhatsApp ${getWhatsAppDisplay('en')} or call ${getLandline().display}`,
  },
  tr: {
    subject: 'TravelBeez rezervasyon onayınız',
    headline: 'Rezervasyonunuz alındı',
    greeting: 'Merhaba',
    intro:
      "TravelBeez'i tercih ettiğiniz için teşekkür ederiz. Rezervasyonunuz alındı, ödeme onayı bekleniyor.",
    refLabel: 'Rezervasyon Referansı',
    itemsHeading: 'Yolculuğunuz',
    voucherHeading: 'Feribot Biletleri',
    voucherNoLabel: 'Voucher No',
    totalLabel: 'Toplam',
    paymentHeading: 'Sonraki Adım: Ödeme Onayı',
    paymentBody:
      "Aşağıdaki butona basarak WhatsApp üzerinden ödemenizi tamamlayın. Size güvenli bir ödeme linki gönderir ve rezervasyonunuzu anında onaylarız.",
    paymentCta: "WhatsApp'tan Ödemeyi Onayla",
    paidIntro:
      "TravelBeez'i tercih ettiğiniz için teşekkür ederiz. Ödemeniz alındı ve rezervasyonunuz onaylandı.",
    paidHeading: 'Ödeme Alındı — Rezervasyon Onaylandı',
    paidBody:
      'Ödemeniz alındı ve rezervasyonunuz onaylandı. Sizi ağırlamayı dört gözle bekliyoruz — başka bir işlem yapmanıza gerek yoktur.',
    hubHeading: 'Rezervasyonunuzu çevrimiçi yönetin',
    hubBody:
      'Bu rezervasyonu, vize başvurunuzu ve daha fazlasını takip etmek için TravelBeez Hub hesabınıza giriş yapın — şifre gerekmez.',
    hubCta: "Hub'a Git",
    footer:
      'TravelBeez · FerryBee Travel IKE · Kos Limanı, Yunanistan · Yunan Turizm Bakanlığı (MH.T.E.) lisanslı',
    contactLine: `Sorularınız? WhatsApp ${getWhatsAppDisplay('tr')} veya telefon ${getLandline().display}`,
  },
  el: {
    subject: 'Επιβεβαίωση κράτησης TravelBeez',
    headline: 'Η κράτηση καταχωρήθηκε',
    greeting: 'Γεια σας',
    intro:
      'Σας ευχαριστούμε που επιλέξατε την TravelBeez. Η κράτησή σας καταχωρήθηκε και εκκρεμεί η επιβεβαίωση πληρωμής.',
    refLabel: 'Κωδικός Κράτησης',
    itemsHeading: 'Το Ταξίδι σας',
    voucherHeading: 'Εισιτήρια Πλοίων',
    voucherNoLabel: 'Voucher No',
    totalLabel: 'Σύνολο',
    paymentHeading: 'Επόμενο Βήμα: Επιβεβαίωση Πληρωμής',
    paymentBody:
      'Πατήστε το παρακάτω κουμπί για να ολοκληρώσετε την πληρωμή μέσω WhatsApp. Θα σας στείλουμε έναν ασφαλή σύνδεσμο πληρωμής και θα επιβεβαιώσουμε την κράτηση άμεσα.',
    paymentCta: 'Επιβεβαίωση Πληρωμής στο WhatsApp',
    paidIntro:
      'Σας ευχαριστούμε που επιλέξατε την TravelBeez. Λάβαμε την πληρωμή σας και η κράτησή σας επιβεβαιώθηκε.',
    paidHeading: 'Η Πληρωμή Ελήφθη — Κράτηση Επιβεβαιωμένη',
    paidBody:
      'Η πληρωμή σας ελήφθη και η κράτησή σας επιβεβαιώθηκε. Ανυπομονούμε να σας υποδεχτούμε — δεν απαιτείται καμία περαιτέρω ενέργεια.',
    hubHeading: 'Διαχειριστείτε την κράτησή σας online',
    hubBody:
      'Συνδεθείτε στο TravelBeez Hub για να παρακολουθείτε αυτή την κράτηση, τη βίζα σας και άλλα — χωρίς κωδικό.',
    hubCta: 'Μετάβαση στο Hub',
    footer:
      'TravelBeez · FerryBee Travel ΙΚΕ · Λιμένας Κω, Ελλάδα · Αδειοδοτημένο από το Υπουργείο Τουρισμού (Μ.Η.Τ.Ε.)',
    contactLine: `Ερωτήσεις; WhatsApp ${getWhatsAppDisplay('el')} ή τηλ. ${getLandline().display}`,
  },
}

export function renderBookingConfirmationEmail(data: BookingEmailData): {
  subject: string
  html: string
  text: string
} {
  const t = T[data.locale]

  // Paid path (Viva webhook confirm) swaps three strings and drops the WhatsApp
  // button. When paid is falsy, every value below resolves to the original key,
  // so the existing "awaiting payment" flow is byte-for-byte unchanged.
  const paid       = data.paid === true
  const introText  = paid ? t.paidIntro    : t.intro
  const payHeading = paid ? t.paidHeading   : t.paymentHeading
  const payBody    = paid ? t.paidBody      : t.paymentBody

  // Hub linki SABİT canonical domain — NEXT_PUBLIC_SITE_URL'e bağlanmaz
  // (preview deploy'larda alpha vercel domaini riski; mail dış müşteriye gider).
  // /login sayfasına gider (magic-link DEĞİL); ?email ile alanı önceden doldurur.
  const hubUrl = `https://www.travelbeez.gr/${data.locale}/login?email=${encodeURIComponent(data.contactEmail)}`

  const itemsRows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
          <div style="font-weight:600;color:#0f172a;font-size:14px;">${escape(item.title)}</div>
          ${
            item.departureTime
              ? `<div style="color:#64748b;font-size:13px;margin-top:2px;">${formatFerryWhen(item, data.locale)}</div>`
              : item.scheduledAt
              ? `<div style="color:#64748b;font-size:13px;margin-top:2px;">${formatDate(item.scheduledAt, data.locale)}</div>`
              : ''
          }
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;text-align:right;color:#0f172a;font-weight:600;font-size:14px;">
          ${item.price.toFixed(2)} ${escape(data.currency)}
        </td>
      </tr>`
    )
    .join('')

  // Ferry voucher block (paid path) — mirrors the Dentur voucher: Voucher No
  // header + one PNR line per passenger/leg. Round-trip → one block (N PNRs);
  // open-jaw → one block per reservation. Empty/absent on the pending path.
  const ferryVoucherBlock =
    data.ferryVouchers && data.ferryVouchers.length
      ? `
        <tr><td style="padding:0 32px 8px 32px;">
          <h2 style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;">${escape(t.voucherHeading)}</h2>
          ${data.ferryVouchers
            .map(
              (v) => `
          <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:10px;">
            <div style="font-size:13px;color:#64748b;">${escape(t.voucherNoLabel)}: <span style="font-family:monospace;font-weight:700;color:#0f172a;">${escape(v.voucherNo)}</span>${v.route ? ` <span style="color:#94a3b8;">· ${escape(v.route)}</span>` : ''}</div>
            <div style="margin-top:6px;">
              ${v.pnrs
                .map(
                  (p) =>
                    `<div style="font-size:13px;color:#334155;padding:2px 0;">PNR <span style="font-family:monospace;font-weight:600;color:#0f172a;">${p.pnr}</span>${p.passengerName ? ` · ${escape(p.passengerName)}` : ''}</div>`,
                )
                .join('')}
            </div>
          </div>`,
            )
            .join('')}
        </td></tr>`
      : ''

  const html = `<!DOCTYPE html>
<html lang="${data.locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escape(t.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">

        <!-- Header -->
        <tr><td style="padding:32px 32px 16px 32px;text-align:center;">
          <div style="display:inline-block;height:40px;width:40px;line-height:40px;background:#2563eb;color:#fff;border-radius:50%;font-weight:700;font-size:20px;text-align:center;">B</div>
          <div style="margin-top:8px;font-size:20px;font-weight:700;color:#0f172a;">Travel<span style="color:#2563eb;">Beez</span></div>
        </td></tr>

        <!-- Headline -->
        <tr><td style="padding:0 32px 8px 32px;">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#0f172a;">${escape(t.headline)}</h1>
        </td></tr>

        <!-- Greeting + Intro -->
        <tr><td style="padding:8px 32px 24px 32px;">
          <p style="margin:0 0 12px 0;color:#334155;font-size:15px;line-height:1.5;">${escape(t.greeting)} <strong>${escape(data.customerName)}</strong>,</p>
          <p style="margin:0;color:#334155;font-size:15px;line-height:1.5;">${escape(introText)}</p>
        </td></tr>

        <!-- Reference -->
        <tr><td style="padding:0 32px 24px 32px;">
          <div style="background:#f1f5f9;border-radius:8px;padding:16px;">
            <div style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${escape(t.refLabel)}</div>
            <div style="margin-top:4px;font-family:monospace;font-size:18px;font-weight:700;color:#0f172a;">${escape(data.reference)}</div>
          </div>
        </td></tr>

        <!-- Items -->
        <tr><td style="padding:0 32px 8px 32px;">
          <h2 style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;">${escape(t.itemsHeading)}</h2>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${itemsRows}
            <tr>
              <td style="padding:16px 0 0 0;font-weight:700;color:#0f172a;font-size:16px;">${escape(t.totalLabel)}</td>
              <td style="padding:16px 0 0 0;text-align:right;font-weight:700;color:#2563eb;font-size:18px;">${data.totalAmount.toFixed(2)} ${escape(data.currency)}</td>
            </tr>
          </table>
        </td></tr>
        ${ferryVoucherBlock}

        <!-- Payment CTA (unpaid) / confirmation (paid) -->
        <tr><td style="padding:32px 32px 24px 32px;">
          <div style="background:#ecfdf5;border:1px solid #d1fae5;border-radius:8px;padding:20px;text-align:center;">
            <h3 style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#065f46;">${escape(payHeading)}</h3>
            <p style="margin:0 0 16px 0;color:#047857;font-size:14px;line-height:1.5;">${escape(payBody)}</p>
            ${paid ? '' : `<a href="${escape(data.paymentWhatsAppUrl)}" style="display:inline-block;background:#25d366;color:#ffffff;font-weight:600;font-size:15px;padding:12px 24px;border-radius:8px;text-decoration:none;">
              ${escape(t.paymentCta)}
            </a>`}
          </div>
        </td></tr>

        <!-- Hub access CTA (always — paid + pending) -->
        <tr><td style="padding:0 32px 24px 32px;">
          <div style="background:#eff6ff;border:1px solid #dbeafe;border-radius:8px;padding:20px;text-align:center;">
            <h3 style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#1e3a8a;">${escape(t.hubHeading)}</h3>
            <p style="margin:0 0 16px 0;color:#1d4ed8;font-size:14px;line-height:1.5;">${escape(t.hubBody)}</p>
            <a href="${escape(hubUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;font-weight:600;font-size:15px;padding:12px 24px;border-radius:8px;text-decoration:none;">
              ${escape(t.hubCta)}
            </a>
          </div>
        </td></tr>

        <!-- Contact line -->
        <tr><td style="padding:0 32px 24px 32px;text-align:center;">
          <p style="margin:0;color:#64748b;font-size:13px;">${escape(t.contactLine)}</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 32px;border-top:1px solid #e5e7eb;background:#f8fafc;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.5;">${escape(t.footer)}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  // Plain-text fallback for clients that don't render HTML
  const text = [
    t.headline.toUpperCase(),
    '',
    `${t.greeting} ${data.customerName},`,
    '',
    introText,
    '',
    `${t.refLabel}: ${data.reference}`,
    '',
    `${t.itemsHeading}:`,
    ...data.items.map((i) => {
      const when = i.departureTime
        ? formatFerryWhen(i, data.locale)
        : i.scheduledAt
        ? formatDate(i.scheduledAt, data.locale)
        : ''
      return `  - ${i.title}${when ? ' (' + when + ')' : ''}: ${i.price.toFixed(2)} ${data.currency}`
    }),
    '',
    `${t.totalLabel}: ${data.totalAmount.toFixed(2)} ${data.currency}`,
    ...(data.ferryVouchers && data.ferryVouchers.length
      ? [
          '',
          `${t.voucherHeading}:`,
          ...data.ferryVouchers.flatMap((v) => [
            `  ${t.voucherNoLabel}: ${v.voucherNo}${v.route ? ' · ' + v.route : ''}`,
            ...v.pnrs.map(
              (p) => `    PNR ${p.pnr}${p.passengerName ? ' · ' + p.passengerName : ''}`,
            ),
          ]),
        ]
      : []),
    '',
    payHeading,
    payBody,
    ...(paid ? [] : [data.paymentWhatsAppUrl]),
    '',
    t.hubHeading,
    t.hubBody,
    hubUrl,
    '',
    t.contactLine,
    '',
    t.footer,
  ].join('\n')

  return { subject: t.subject, html, text }
}

// Tiny HTML-escape helper (no external dep needed)
function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDate(isoString: string, locale: Locale): string {
  try {
    const d = new Date(isoString)
    return new Intl.DateTimeFormat(localeToBcp47(locale), {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return isoString
  }
}

function localeToBcp47(locale: Locale): string {
  return locale === 'el' ? 'el-GR' : locale === 'tr' ? 'tr-TR' : 'en-GB'
}

// Ferry legs: date + RAW provider wall-clock times, shown verbatim. NEVER runs
// Intl on the instant (that would drop the zoned scheduledAt to server-local /
// UTC and shift the printed departure off the voucher). The date is the local
// calendar date the zoned instant already carries (sliced, no TZ conversion).
function formatFerryWhen(
  item: BookingEmailData['items'][number],
  locale: Locale,
): string {
  const datePart = item.scheduledAt ? formatDateOnly(item.scheduledAt.slice(0, 10), locale) : ''
  const times = [item.departureTime, item.arrivalTime].filter(Boolean).join(' – ')
  return [datePart, times].filter(Boolean).join(' · ')
}

// "2026-01-15" → localized date. Parsed at noon UTC so the calendar date is
// stable in every viewer/server timezone (a date-only value has no instant).
function formatDateOnly(ymd: string, locale: Locale): string {
  try {
    const d = new Date(`${ymd}T12:00:00Z`)
    return new Intl.DateTimeFormat(localeToBcp47(locale), {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(d)
  } catch {
    return ymd
  }
}
