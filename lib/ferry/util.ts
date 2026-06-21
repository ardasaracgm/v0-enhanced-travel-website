/**
 * Canonical port slug — SINGLE source. Both the search action's query slugging
 * and the Dentur adapter's port resolution use THIS exact function, so they can
 * never drift (a divergent copy would silently produce dentur_unknown_departure).
 * Pure/isomorphic: no 'server-only', safe anywhere.
 *
 * Türkçe folding: Dentur region adları Türkçe büyük harf ("TURGUTREİS", "KUŞADASI").
 * JS toLowerCase() İ'yi BOZAR (İ → "i" + U+0307 combining dot), bu da eşleşmeyi kırar.
 * Bu yüzden Türkçe harfleri lowercase'den ÖNCE explicit ASCII'ye map'liyoruz (İ→i,
 * I→i, ş→s, ç→c, ğ→g, ö→o, ü→u, ı→i; deterministik, locale-bağımsız — toLowerCase
 * bug'ından kaçınır), sonra lowercase, sonra boşluk → tire. Hem app input'u hem
 * Dentur adı aynı folding'den geçtiği için eşleşme fold(app) === fold(dentur) olur
 * (turgutreis/kusadasi açılır). ASCII adlar (bodrum/kos) folding'den etkilenmez.
 * NOT: "rhodes"≠"rodos" ve "marmaris" (Dentur'da yok) bu folding'le ÇÖZÜLMEZ —
 * ayrı iş (isim-alias / canlı katalog).
 */
const TR_FOLD: Record<string, string> = {
  'İ': 'i', 'I': 'i', 'Ş': 's', 'Ç': 'c', 'Ğ': 'g', 'Ö': 'o', 'Ü': 'u',
  'ı': 'i', 'ş': 's', 'ç': 'c', 'ğ': 'g', 'ö': 'o', 'ü': 'u',
}
export const slug = (s: string) =>
  s.trim()
    .replace(/[İIŞÇĞÖÜışçğöü]/g, (ch) => TR_FOLD[ch]) // Türkçe-map (lowercase'den ÖNCE)
    .toLowerCase()                                     // kalan ASCII büyük→küçük
    .replace(/\s+/g, '-')                              // boşluk → tire
