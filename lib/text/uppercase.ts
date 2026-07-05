/**
 * Uppercasing helpers shared by the passenger/companion forms (ferry, insurance,
 * hub companion save) so manual entry and prefill store the same shape.
 *
 * Names use Turkish locale casing so ş→Ş, ç→Ç, ğ→Ğ, ö→Ö, ü→Ü and the dotted/
 * dotless i are preserved correctly (i→İ, ı→I). Passport numbers are plain Latin
 * + digits, so a locale-independent uppercase is correct there.
 */
export const upperName = (s: string): string => s.toLocaleUpperCase('tr-TR')
export const upperPassport = (s: string): string => s.toUpperCase()
