import 'server-only'

import fs from 'node:fs'
import path from 'node:path'
import PDFDocument from 'pdfkit'
import type { FerryVoucherData } from './voucher-data'

// DejaVu = Latin-Extended (Türkçe ğ/ş/İ/ı) + Yunanca. pdfkit built-in Helvetica'sı
// (WinAnsi) bunları basamaz → TTF gömüyoruz. Vercel serverless trace'ine
// next.config outputFileTracingIncludes ile dahil (vize docx ile aynı numara).
const FONT_DIR = path.join(process.cwd(), 'lib/ferry/fonts')
const LOGO = path.join(process.cwd(), 'public/travelbeez-logo.png') // 684×206 RGBA

const BRAND = '#1e40af'
const INK = '#0f172a'
const MUTED = '#64748b'
const LINE = '#e2e8f0'

export async function buildFerryVoucherPdf(data: FerryVoucherData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 48 })
  doc.registerFont('body', fs.readFileSync(path.join(FONT_DIR, 'DejaVuSans.ttf')))
  doc.registerFont('bold', fs.readFileSync(path.join(FONT_DIR, 'DejaVuSans-Bold.ttf')))
  doc.font('body') // built-in Helvetica.afm'e HİÇ düşme

  const chunks: Buffer[] = []
  doc.on('data', (c) => chunks.push(c as Buffer))
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))))

  // ---- Header: logo (non-fatal) + agency + başlık ----
  try {
    doc.image(LOGO, 48, 44, { width: 148 }) // 684×206 → ~148×44.6
  } catch (e) {
    console.error('[ferry voucher] logo embed skipped:', e)
    doc.font('bold').fontSize(22).fillColor(BRAND).text('TravelBeez', 48, 48)
  }
  doc.font('body').fontSize(9).fillColor(MUTED).text('FerryBee Travel IKE · Kos, Greece', 48, 96)
  doc.font('bold').fontSize(15).fillColor(INK).text('Feribot Fişi / Ferry Voucher', 48, 116)
  doc.font('body').fontSize(9).fillColor(MUTED).text(`Rezervasyon / Reference: ${data.reference}`, 48, 138)
  doc.moveTo(48, 158).lineTo(547, 158).strokeColor(LINE).lineWidth(1).stroke()
  doc.y = 178

  // ---- Rezervasyonlar (round-trip → 1 kayıt 2 bacak; open-jaw → kayıt başına 1) ----
  for (const r of data.reservations) {
    const operator = r.legs[0]?.operator
    doc.font('bold').fontSize(11).fillColor(INK)
      .text(`Voucher No: ${r.voucherNo ?? '—'}${operator ? `   ·   ${operator}` : ''}`)
    doc.moveDown(0.5)

    for (const leg of r.legs) {
      // leg.departureTime = HAM wall-clock string (getMyFerryReservations'tan) —
      // Intl/zoned'a ASLA sokulmaz → Vercel-UTC kayması yok.
      const time = [leg.departureTime, leg.arrivalTime].filter(Boolean).join(' – ')
      doc.font('bold').fontSize(11).fillColor(BRAND).text(leg.route)
      doc.font('body').fontSize(9).fillColor(MUTED)
        .text([leg.date, time].filter(Boolean).join('   ·   '))
      doc.moveDown(0.25)
      for (const p of leg.pnrs) {
        doc.font('body').fontSize(10).fillColor(INK)
          .text(`PNR ${p.pnr}${p.passengerName ? `      ${p.passengerName}` : ''}`, { indent: 14 })
      }
      doc.moveDown(0.7)
    }
    doc.moveDown(0.5)
  }

  // ---- Footer (iletişim; şartlar metni Commit 2'de) ----
  doc.font('body').fontSize(8).fillColor(MUTED)
    .text('TravelBeez · wa.me/905421450457 · +30 224 2220 224 · Kos Port, Kos 85300, Greece',
      48, 790, { width: 499, align: 'center' })

  doc.end()
  return done
}
