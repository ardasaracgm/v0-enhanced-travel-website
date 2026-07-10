// lib/visa/docx/fill-visa-docx.ts
// Kapı-vizesi .docx üretimi — şablonu DB satırıyla doldurup Buffer döndürür.
// Ada-anchorlu, tek-yön string taraması; pizzip ile zip aç/yaz. Server-only.
import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import PizZip from 'pizzip'

import { buildVisaDocxFields, type VisaDocxRow } from './field-map'

const TEMPLATE_PATH = path.join(process.cwd(), 'lib/visa/docx/templates/kapi-vizesi-form.docx')
const DOC_XML = 'word/document.xml'

/** XML metin-içerik kaçışı (& < >). */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * FORMTEXT doldur. ANCHOR = bu alanın begin-fldChar ffData adı: <w:name w:val="NAME"/>.
 * ffData her zaman alanın `separate`/`end`'inden ÖNCE gelir (yapısal garanti; 29
 * alanın TAMAMINDA a<sep<end ve sep<sonraki-alan test edildi) → bookmarkStart sıra
 * belirsizliği yok. trailing `"/>` prefix-çakışmasını keser (Κείμενο1 ≠ Κείμενο10).
 *
 * separate→end PENCERESİ içinde: İLK <w:t>'ye değer, KALAN placeholder <w:t>'leri
 * boşalt (alanlar 5 adet ` ` run taşıyor → aksi halde değerden sonra en-space
 * kuyruğu kalır). Regex yalnız bu dar pencerede çalışır, global değil.
 *
 * Boş değer → DOKUNMA: şablonun orijinal placeholder'ı korunur (form alanı görsel
 * olarak büzüşmez; memur elle doldurabilir). Sabit dolu alanlar (GREECE/TURKEY)
 * truthy olduğundan etkilenmez.
 */
function setTextField(xml: string, name: string, value: string): string {
  if (!value) return xml
  const a = xml.indexOf(`w:val="${name}"/>`)
  if (a < 0) return xml
  const sep = xml.indexOf('w:fldCharType="separate"', a)
  if (sep < 0) return xml
  const end = xml.indexOf('w:fldCharType="end"', sep)
  if (end < 0) return xml

  const region = xml.slice(sep, end)            // yalnız BU alanın değer penceresi
  let first = true
  const filled = region.replace(/(<w:t[^>]*>)[\s\S]*?(<\/w:t>)/g, (_m, open, close) => {
    if (first) { first = false; return open + esc(value) + close }
    return open + close                          // kalan placeholder run'ları boşalt
  })
  return xml.slice(0, sep) + filled + xml.slice(end)
}

/**
 * FORMCHECKBOX işaretle. ffData'da <w:name w:val="NAME"/> sonrası ilk
 * <w:checked w:val="0"/> → "1". Her ffData'da tek `checked`; 7 checkbox'ta
 * a<checked0<sonraki-alan test edildi.
 */
function setCheckbox(xml: string, name: string): string {
  const a = xml.indexOf(`w:val="${name}"/>`)
  if (a < 0) return xml
  const off = xml.indexOf('<w:checked w:val="0"/>', a)
  if (off < 0) return xml
  return xml.slice(0, off) + '<w:checked w:val="1"/>' + xml.slice(off + '<w:checked w:val="0"/>'.length)
}

/**
 * Both setters resolve an anchor with indexOf — the FIRST match. That is only
 * correct while every mapped name is unique in the template. It once was not:
 * two FORMTEXT fields were named Κείμενο14, one in box 12 ("Other travel
 * document — please specify") and the intended one in box 16 ("Issued by"), so
 * issuing_authority printed into box 12 and box 16 stayed blank — silently, on
 * a form that goes to a consulate.
 *
 * Fail loudly instead. Unmapped duplicates (Κείμενο9, Κείμενο19) are left alone;
 * they are never written, so they cannot mis-target anything.
 */
function assertAnchorsUnique(xml: string, names: string[]): void {
  const offenders = names
    .map((name) => ({ name, count: xml.split(`w:val="${name}"/>`).length - 1 }))
    .filter((a) => a.count !== 1)
  if (offenders.length) {
    const detail = offenders.map((o) => `${o.name}×${o.count}`).join(', ')
    throw new Error(`docx template: mapped anchor must occur exactly once — ${detail}`)
  }
}

export async function fillVisaDocx(app: VisaDocxRow): Promise<Buffer> {
  const zip = new PizZip(await readFile(TEMPLATE_PATH))
  const file = zip.file(DOC_XML)
  if (!file) throw new Error('docx template: word/document.xml not found')
  let xml = file.asText()

  const { text, checks } = buildVisaDocxFields(app)
  assertAnchorsUnique(xml, [...Object.keys(text), ...Object.keys(checks)])
  for (const [name, value] of Object.entries(text)) xml = setTextField(xml, name, value)
  for (const [name, on] of Object.entries(checks)) if (on) xml = setCheckbox(xml, name)

  zip.file(DOC_XML, xml)
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' })
}
