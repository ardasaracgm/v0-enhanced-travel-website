// lib/visa/docx/format.ts
// Kapı-vizesi .docx doldurma — saf biçimleme yardımcıları (TEK KAYNAK).
// Yan etkisiz, unit-test edilebilir; server-only DEĞİL.
import en from '@/messages/en.json'

// Türkçe harf → ASCII. Hem büyük hem küçük; sonra toUpperCase ASCII'yi büyütür.
const TR_FOLD: Record<string, string> = {
  ç: 'C', Ç: 'C', ğ: 'G', Ğ: 'G', ı: 'I', İ: 'I',
  ö: 'O', Ö: 'O', ş: 'S', Ş: 'S', ü: 'U', Ü: 'U',
}

/** Türkçe karakterleri ASCII'ye katlar (büyütmeden). */
export function asciiFold(s: string): string {
  return s.replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TR_FOLD[ch] ?? ch)
}

/** Resmî form için: fold → UPPER → trim. (Sıra: önce fold, sonra upper.) */
export function upperAscii(s: string | null | undefined): string {
  if (!s) return ''
  return asciiFold(s).toUpperCase().trim()
}

/** 'YYYY-MM-DD' veya ISO timestamp → 'DD.MM.YYYY'. Geçersizde ''. */
export function formatDateDDMMYYYY(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim())
  return m ? `${m[3]}.${m[2]}.${m[1]}` : ''
}

/** occupation slug → İngilizce etiket (messages/en.json tek kaynak), UPPER+ASCII. */
export function occupationEnLabel(slug: string | null | undefined): string {
  if (!slug) return ''
  const map = en.visaPage?.form?.options?.occupation as Record<string, string> | undefined
  return upperAscii(map?.[slug] ?? slug)
}
