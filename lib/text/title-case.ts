/**
 * Sağlayıcıdan büyük-harf gelen TÜRKÇE YER ADLARINI ("BODRUM → KOS") başlık
 * biçimine çevirir. Harf olmayan karakterler (→, ·, -) olduğu gibi kalır.
 *
 * Türkçe locale ŞART: `I`→`ı` eşlemesi olmadan "KUŞADASI" → "Kuşadasi" olur.
 *
 * ⚠️ KİŞİ ADLARINDA KULLANMA. Pasaport adları ASCII-transliterasyonlu saklanır
 * ("BENGISU"), tr-TR ise onu "Bengısu" yapar. Locale-bağımsız bir title-case de
 * çözmez: gerçekten Türkçe bir ad ("IŞIK") bu kez "Işik" olur. Keyfi adlar için
 * güvenli dönüşüm yoktur — olduğu gibi bırak (bkz. upperName / upperPassport).
 */
export const titleCaseTr = (s: string): string =>
  s.replace(/\p{L}[\p{L}'’]*/gu, (w) =>
    w.slice(0, 1).toLocaleUpperCase('tr-TR') + w.slice(1).toLocaleLowerCase('tr-TR'),
  )
