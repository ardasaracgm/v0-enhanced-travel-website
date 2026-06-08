// lib/visa/docx/field-map.ts
// Kapı-vizesi .docx — bookmark → değer eşlemesi (TEK doğruluk kaynağı).
// Saf: VisaApplication satırı → { text, checks }. Doldurma mekaniği fill-visa-docx.ts'te.
//
// KASITLI BOŞ (kaynak yok / faz-2'ye park):
//   Κείμενο9  (item10 minor guardian — metadata.guardian, çok-alan join → park)
//   Κείμενο18 (item20 employer       — metadata.employer, çok-alan join → park)
//   Κείμενο26 (item26 prev-Schengen "until" — tek tarih var, "from"=25)
//   Κείμενο35–40 (item32 firma+contact — 5→4 belirsiz dağıtım → park)
//   Κείμενο52 (item36/bottom "yer" — başvuran kendi ilinde imzalar → boş)
//   Κείμενο41–50, 27/28/29, 22, 24 vb. — official-use / AB-aile / finansman
// Statik glif kutular (doc_type/purpose/entries) form-field DEĞİL → bu lib kapsamı dışı.
import { upperAscii, formatDateDDMMYYYY, occupationEnLabel } from './format'

// select('*') satırı — lib/supabase.ts interface'i eksik (009/010 ek kolonlar +
// metadata sponsor ağacı yok), o yüzden gereken alanları burada tanımlıyoruz.
export interface VisaDocxRow {
  last_name: string
  previous_last_name?: string | null
  first_name: string
  father_name: string
  mother_name: string
  birth_date: string
  birth_place: string
  birth_country?: string | null
  nationality?: string | null
  previous_nationality?: string | null
  gender: 'male' | 'female'
  marital_status: 'single' | 'married' | 'separated' | 'divorced' | 'widowed'
  id_number: string
  doc_number: string
  doc_issue_date: string
  doc_expiry_date: string
  issuing_authority: string
  residence_address: string
  phone: string
  occupation: string
  stay_duration: number
  schengen_entry_date: string
  schengen_exit_date: string
  created_at: string
  metadata?: {
    previous_schengen_visa_date?: string | null
    sponsor?: {
      inviter_or_hotel_name?: string | null
      accommodation_address?: string | null
      accommodation_phone?: string | null
    } | null
  } | null
}

export interface VisaDocxFields {
  text: Record<string, string>      // bookmark → metin (FORMTEXT)
  checks: Record<string, boolean>   // bookmark → işaretli? (FORMCHECKBOX)
}

export function buildVisaDocxFields(app: VisaDocxRow): VisaDocxFields {
  const m = app.metadata ?? {}
  const sponsor = m.sponsor ?? {}

  const text: Record<string, string> = {
    // Kişisel
    'Κείμενο1': upperAscii(app.last_name),
    'Κείμενο2': upperAscii(app.previous_last_name),
    'Κείμενο3': upperAscii(app.first_name),
    'Κείμενο54': upperAscii(app.father_name),
    'Κείμενο55': upperAscii(app.mother_name),
    'Κείμενο4': formatDateDDMMYYYY(app.birth_date),
    'Κείμενο5': upperAscii(app.birth_place),
    // Örnek-form kuralı: 6 ve 7 SABİT İngilizce (memur "TURKEY"/"TURKISH"
    // bekler). Kolon Türkçe ("Türkiye"/"Türk") dolu gelse de ASCII fold
    // TURKIYE üretip fallback'i atlıyordu — bu yüzden sabit tutuyoruz.
    'Κείμενο6': 'TURKEY',
    'Κείμενο7': 'TURKISH',
    'Κείμενο8': upperAscii(app.previous_nationality),
    // Belge
    'Κείμενο10': upperAscii(app.id_number),
    'Κείμενο11': upperAscii(app.doc_number),
    'Κείμενο12': formatDateDDMMYYYY(app.doc_issue_date),
    'Κείμενο13': formatDateDDMMYYYY(app.doc_expiry_date),
    'Κείμενο14': upperAscii(app.issuing_authority),
    // İletişim (adres email'siz; telefon ayrı alan)
    'Κείμενο15': upperAscii(app.residence_address),
    'Κείμενο16': (app.phone ?? '').trim(),
    'Κείμενο17': occupationEnLabel(app.occupation),
    // Seyahat
    'Κείμενο20': 'GREECE',
    'Κείμενο21': 'GREECE',
    'Κείμενο23': app.stay_duration != null ? String(app.stay_duration) : '',
    'Κείμενο25': formatDateDDMMYYYY(m.previous_schengen_visa_date),
    'Κείμενο30': formatDateDDMMYYYY(app.schengen_entry_date),
    'Κείμενο31': formatDateDDMMYYYY(app.schengen_exit_date),
    // Konaklama (sponsor — yalnız tek-değer alanlar)
    'Κείμενο32': upperAscii(sponsor.inviter_or_hotel_name),
    'Κείμενο33': upperAscii(sponsor.accommodation_address),
    'Κείμενο34': (sponsor.accommodation_phone ?? '').trim(),
    // İmza blokları: yer (52) BOŞ, tarih (51 üst + 53 alt) = created_at
    'Κείμενο51': formatDateDDMMYYYY(app.created_at),
    'Κείμενο53': formatDateDDMMYYYY(app.created_at),
  }

  const g = app.gender
  const s = app.marital_status
  const checks: Record<string, boolean> = {
    Check1: g === 'male',
    Check2: g === 'female',
    Check3: s === 'single',
    Check4: s === 'married',
    Check5: s === 'separated',
    Check6: s === 'divorced',
    Check7: s === 'widowed',
  }

  return { text, checks }
}
