// Kos ofisi paket teslim adresi — TEK KAYNAK. server-only DEĞİL (mail + Hub
// clipboard adası ikisi de import eder). Adres gövdesi locale-INDEPENDENT:
// Yunanca satırlar + sokak + telefonlar her dilde AYNI (kargocu okur, çevrilmez).
// Etiket/uyarı localize → render katmanında (mail T dict / Hub i18n).
import { getLandline, getWhatsAppDisplay } from '@/lib/contact'

const STREET = '4, G. Averof str (under Achilleas Hotel & Apartments)'
const CITY_LINE = 'Λιμένας Κω, Κως 85300, Ελλάδα'
const DIRECTIONS_EL = 'Στη δεξιά πλευρά της εξόδου του λιμανιού της Κω'

export interface PackageBoxAddressBlock {
  recipient: string // "FerryBee Travel IKE — {boxNo}" (kutu no YALNIZ burada)
  street: string
  cityLine: string
  directionsEl: string // ayrı alan — UI/mailde gösterilir, plainText'te YOK
  phone: string // Tel (landline)
  mobile: string // Mob (getWhatsAppDisplay('el'))
  plainText: string // kopyalanabilir blok: recipient+street+cityLine+Tel+Mob
}

export function buildPackageBoxAddressBlock(boxNo: string): PackageBoxAddressBlock {
  const recipient = `FerryBee Travel IKE — ${boxNo}`
  const phone = getLandline().display
  const mobile = getWhatsAppDisplay('el')
  // plainText = kargo formuna yapıştırılacak SADE blok. directionsEl (tarif) ve
  // wa.me link BİLİNÇLİ dışarıda (gürültü). İki telefon: düz "Tel:" / "Mob:".
  const plainText = [recipient, STREET, CITY_LINE, `Tel: ${phone}`, `Mob: ${mobile}`].join('\n')
  return {
    recipient,
    street: STREET,
    cityLine: CITY_LINE,
    directionsEl: DIRECTIONS_EL,
    phone,
    mobile,
    plainText,
  }
}
