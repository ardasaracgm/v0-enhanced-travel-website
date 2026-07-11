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
const RELS_XML = 'word/_rels/document.xml.rels'
const CONTENT_TYPES = '[Content_Types].xml'

// The PHOTO box is a plain empty table cell captioned with this Greek label
// ("PHOTOGRAPH"). It carries no form-field / content-control anchor, so we key
// off the caption text — unique in the template (guarded below).
const PHOTO_ANCHOR = 'ΦΩΤΟΓΡΑΦΙΑ'
const PHOTO_REL_ID = 'rIdVisaPhoto'
// Standard biometric photo is 35×45 mm. EMU = 36000 per mm. The uploaded image
// is embedded as-is and stretched to this fixed box (Word scales it); a badly
// cropped photo may distort slightly — acceptable until upload enforces a crop.
const PHOTO_CX_EMU = 35 * 36000 // 1_260_000
const PHOTO_CY_EMU = 45 * 36000 // 1_620_000

export interface VisaPhoto {
  bytes: Buffer
  mime: 'image/png' | 'image/jpeg'
}

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

/** The DrawingML run for an inline picture sized to the biometric box. */
function photoParagraphXml(): string {
  const a = 'http://schemas.openxmlformats.org/drawingml/2006/main'
  const picNs = 'http://schemas.openxmlformats.org/drawingml/2006/picture'
  return (
    '<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/>' +
    '<w:jc w:val="center"/></w:pPr><w:r><w:drawing>' +
    `<wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${PHOTO_CX_EMU}" cy="${PHOTO_CY_EMU}"/>` +
    '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
    '<wp:docPr id="9001" name="VisaPhoto"/>' +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="${a}" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic xmlns:a="${a}"><a:graphicData uri="${picNs}">` +
    `<pic:pic xmlns:pic="${picNs}"><pic:nvPicPr>` +
    '<pic:cNvPr id="9001" name="VisaPhoto"/>' +
    '<pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr>' +
    '</pic:nvPicPr><pic:blipFill>' +
    `<a:blip r:embed="${PHOTO_REL_ID}" cstate="print"/>` +
    '<a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
    '<pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/>' +
    `<a:ext cx="${PHOTO_CX_EMU}" cy="${PHOTO_CY_EMU}"/></a:xfrm>` +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
    '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'
  )
}

/**
 * Embed the applicant photo into the PHOTO cell. Wires the three OOXML parts an
 * inline image needs: the media bytes (word/media/…), a relationship in the
 * document rels, and a <w:drawing> run in the cell. Content-Types already has a
 * png Default (decorative header art); jpeg needs one added.
 *
 * Throws on template drift (photo caption not found exactly once) — same
 * fail-loud stance as assertAnchorsUnique; a moved caption is a real bug.
 */
function embedPhoto(zip: PizZip, xml: string, photo: VisaPhoto): string {
  const ext = photo.mime === 'image/png' ? 'png' : 'jpg'
  const target = `media/visa-photo.${ext}`
  zip.file(`word/${target}`, photo.bytes)

  if (ext === 'jpg') {
    const ctFile = zip.file(CONTENT_TYPES)
    if (!ctFile) throw new Error('docx template: [Content_Types].xml not found')
    let ct = ctFile.asText()
    if (!ct.includes('Extension="jpg"')) {
      ct = ct.replace('</Types>', '<Default Extension="jpg" ContentType="image/jpeg"/></Types>')
      zip.file(CONTENT_TYPES, ct)
    }
  }

  const relsFile = zip.file(RELS_XML)
  if (!relsFile) throw new Error('docx template: document.xml.rels not found')
  let rels = relsFile.asText()
  if (!rels.includes(`Id="${PHOTO_REL_ID}"`)) {
    rels = rels.replace(
      '</Relationships>',
      `<Relationship Id="${PHOTO_REL_ID}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${target}"/></Relationships>`,
    )
    zip.file(RELS_XML, rels)
  }

  const count = xml.split(PHOTO_ANCHOR).length - 1
  if (count !== 1) {
    throw new Error(`docx template: photo caption ${PHOTO_ANCHOR} must occur once — found ${count}`)
  }
  const tcEnd = xml.indexOf('</w:tc>', xml.indexOf(PHOTO_ANCHOR))
  if (tcEnd < 0) throw new Error('docx template: photo cell end (</w:tc>) not found')
  return xml.slice(0, tcEnd) + photoParagraphXml() + xml.slice(tcEnd)
}

export async function fillVisaDocx(app: VisaDocxRow, photo?: VisaPhoto): Promise<Buffer> {
  const zip = new PizZip(await readFile(TEMPLATE_PATH))
  const file = zip.file(DOC_XML)
  if (!file) throw new Error('docx template: word/document.xml not found')
  let xml = file.asText()

  const { text, checks } = buildVisaDocxFields(app)
  assertAnchorsUnique(xml, [...Object.keys(text), ...Object.keys(checks)])
  for (const [name, value] of Object.entries(text)) xml = setTextField(xml, name, value)
  for (const [name, on] of Object.entries(checks)) if (on) xml = setCheckbox(xml, name)

  if (photo) xml = embedPhoto(zip, xml, photo)

  zip.file(DOC_XML, xml)
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' })
}
