// Ada tanıtım sayfaları içeriği — TEK KAYNAK.
// Kural: locale-nötr yapı + somut veri (facts) + locale-keyed prose. Tailwind YOK (lib).
// Kaynak dil TR; EN/EL prose boş iskelet → ayrı DeepL içerik turu dolduracak.
// generateMetadata / JSON-LD / sitemap Diff-2+; bu dosya salt veri.

export type Locale = 'tr' | 'en' | 'el'

/** Somut, DOĞRULANACAK veri — structured-data & ferry CTA kaynağı. locale-nötr. */
export interface IslandFacts {
  ferryFrom: string          // TR port slug (ports.ts kanonik) — prefill 'from'. ZORUNLU
  ferryTo: string            // GR ada port slug — prefill 'to'. ZORUNLU (rhodes→'rodos')
  region: string             // idari bölge — structured-data addressRegion
  ferryDuration: string      // ⚠️ VERIFY
  crossingDistance?: string  // ⚠️ VERIFY (deniz mili/km)
  areaKm2?: number           // ⚠️ VERIFY
  population?: number        // ⚠️ VERIFY
}

export interface IslandSection {
  id: string                 // locale-NÖTR sabit anchor: 'beaches'|'history'|'when-to-visit'
  heading: string
  body: string[]             // her eleman bir <p>
}

export interface IslandFaqItem {
  q: string                  // JSON-LD FAQPage.mainEntity.name (Diff-2)
  a: string                  // JSON-LD FAQPage.acceptedAnswer.text
}

/** Çevrilebilir uzun gövde — dil başına ayrı saklanır (TR kaynak, EN/EL DeepL sonra). */
export interface IslandProse {
  intro: string
  sections: IslandSection[]
  faq: IslandFaqItem[]
}

export interface IslandContent {
  slug: string               // route param = popularIslands i18n key
  heroImage: string          // '/island/<Cap>.webp' (mevcut)
  gallery?: string[]         // görsel kademesi doldurur
  facts: IslandFacts         // ⚠️ VERIFY blok — doğrulama turu buraya bakar
  prose: Record<Locale, IslandProse>  // tr dolu, en/el boş → DeepL turu
}

// EN/EL prose boş iskelet (DeepL turu doldurur) — DRY.
const EMPTY: IslandProse = { intro: '', sections: [], faq: [] }

export const ISLANDS: Record<string, IslandContent> = {
  kos: {
    slug: 'kos',
    heroImage: '/island/Kos.webp',
    facts: { ferryFrom: 'bodrum', ferryTo: 'kos', region: 'Onikiadalar',
      ferryDuration: '20–60 dk', areaKm2: 290, population: 33000 }, // ⚠️ VERIFY
    prose: {
      tr: {
        intro:
          "Bodrum'un tam karşısında yükselen Kos, Onikiadalar'ın en yeşil ve en düz adalarından biri. Uzun kum plajları, bisikletle keşfedilen sahil yolları ve antik Asklepion'uyla Türk gezginlerin favori ilk durağı — Bodrum'dan kısa bir feribot geçişiyle ulaşırsınız.",
        sections: [
          { id: 'beaches', heading: 'Plajlar', body: [
            "Tigaki ve Marmari; uzun, sığ ve çocuklu aileler için ideal, sakin plajlar.",
            "Adanın güneyindeki Paradise ve Agios Stefanos koyları daha canlı bir atmosfer sunar." ] },
          { id: 'history', heading: 'Tarih ve Kültür', body: [
            "Kos, tıbbın babası Hipokrat'ın doğduğu ada; antik Asklepion sağlık tapınağı bugün en çok gezilen alan.",
            "Şehir merkezindeki Kos Kalesi ve Roma dönemi kalıntıları yürüyerek gezilebilir." ] },
          { id: 'when-to-visit', heading: 'Ne Zaman Gidilir', body: [
            "Feribot seferleri Mayıs–Ekim arası en yoğun; Haziran ve Eylül sıcaklık ve kalabalık açısından en dengeli dönem." ] },
        ],
        faq: [
          { q: "Kos'a hangi limandan feribot var?", a: "Bodrum'dan düzenli feribot seferleriyle Kos'a ulaşabilirsiniz." },
          { q: "Günübirlik gidilebilir mi?", a: "Evet, sabah gidip akşam dönmek mümkün; adayı hakkıyla gezmek için en az bir gece öneririz." },
        ],
      },
      en: EMPTY, el: EMPTY,
    },
  },

  rhodes: {
    slug: 'rhodes',
    heroImage: '/island/Rodos.webp',
    facts: { ferryFrom: 'fethiye', ferryTo: 'rodos', region: 'Onikiadalar',
      ferryDuration: '~90 dk', areaKm2: 1401, population: 115000 }, // ⚠️ VERIFY
    prose: {
      tr: {
        intro:
          "Onikiadalar'ın en büyüğü Rodos, UNESCO korumasındaki ortaçağ Şövalyeler Şehri, geniş plajları ve zengin tarihiyle başlı başına bir tatil rotası. Fethiye'den feribotla ulaşılır.",
        sections: [
          { id: 'history', heading: 'Şövalyeler Şehri', body: [
            "Surlarla çevrili eski şehir, Büyük Üstat Sarayı ve ünlü Şövalyeler Sokağı ile Avrupa'nın en iyi korunmuş ortaçağ merkezlerinden.",
            "Lindos Akropolü, adanın güneyinde beyaz köyün üzerinde yükselen bir başka mutlak durak." ] },
          { id: 'beaches', heading: 'Plajlar', body: [
            "Doğu kıyısı uzun kum plajları, batı kıyısı ise rüzgâr sörfü için ideal koşullar sunar." ] },
          { id: 'when-to-visit', heading: 'Ne Zaman Gidilir', body: [
            "Nisan–Ekim arası açık; ilkbahar ve sonbahar gezmek için en konforlu dönem." ] },
        ],
        faq: [
          { q: "Rodos'a nereden feribot kalkar?", a: "Fethiye'den Rodos'a feribot seferleri düzenlenir." },
          { q: "Bir günde gezilir mi?", a: "Rodos büyük bir ada; eski şehir ve Lindos için en az iki gün öneririz." },
        ],
      },
      en: EMPTY, el: EMPTY,
    },
  },

  samos: {
    slug: 'samos',
    heroImage: '/island/Samos.webp',
    facts: { ferryFrom: 'kusadasi', ferryTo: 'samos', region: 'Kuzey Ege',
      ferryDuration: '~75 dk', areaKm2: 478, population: 33000 }, // ⚠️ VERIFY
    prose: {
      tr: {
        intro:
          "Kuşadası'nın hemen karşısındaki Samos (Sisam), çam ormanları, üzüm bağları ve sakin koylarıyla doğa ağırlıklı bir ada. Pisagor ve Epikuros'un memleketi.",
        sections: [
          { id: 'nature', heading: 'Doğa ve Köyler', body: [
            "Yeşil iç kesimler, dağ köyleri ve şelaleler; adayı Ege'nin en yemyeşil adalarından biri yapar." ] },
          { id: 'beaches', heading: 'Plajlar', body: [
            "Tsamadou ve Lemonakia çakıl koyları berrak suyuyla öne çıkar." ] },
          { id: 'when-to-visit', heading: 'Ne Zaman Gidilir', body: [
            "Haziran–Eylül arası feribot ve hava en uygun dönem." ] },
        ],
        faq: [
          { q: "Samos'a feribot nereden?", a: "Kuşadası'ndan Samos'a feribot seferleri vardır." },
        ],
      },
      en: EMPTY, el: EMPTY,
    },
  },

  leros: {
    slug: 'leros',
    heroImage: '/island/Leros.webp',
    facts: { ferryFrom: 'turgutreis', ferryTo: 'leros', region: 'Onikiadalar',
      ferryDuration: '~2 sa', areaKm2: 74, population: 8000 }, // ⚠️ VERIFY
    prose: {
      tr: {
        intro:
          "Turizmin henüz sakin kaldığı Leros, İtalyan mimarisi, korunaklı koyları ve otantik Yunan atmosferiyle huzur arayanların adası.",
        sections: [
          { id: 'villages', heading: 'Köyler ve Mimari', body: [
            "Lakki kasabası, adadaki nadir Art Deco / İtalyan rasyonalist mimari örnekleriyle dikkat çeker." ] },
          { id: 'beaches', heading: 'Koylar', body: [
            "Korunaklı sığ koylar, tekne turları ve sakin yüzme için idealdir." ] },
        ],
        faq: [
          { q: "Leros'a nasıl gidilir?", a: "Turgutreis üzerinden feribot bağlantısı bulunur." },
        ],
      },
      en: EMPTY, el: EMPTY,
    },
  },

  patmos: {
    slug: 'patmos',
    heroImage: '/island/Patmos.webp',
    facts: { ferryFrom: 'kusadasi', ferryTo: 'patmos', region: 'Onikiadalar',
      ferryDuration: '~3 sa', areaKm2: 34, population: 3000 }, // ⚠️ VERIFY
    prose: {
      tr: {
        intro:
          "Hristiyanlık için kutsal sayılan Patmos, Aziz Yuhanna'nın Vahiy'i yazdığı mağarası ve UNESCO korumasındaki manastırıyla hem hac hem huzur rotası.",
        sections: [
          { id: 'history', heading: 'Manastır ve Mağara', body: [
            "Aziz Yuhanna Manastırı ve Kıyamet Mağarası, UNESCO Dünya Mirası listesinde." ] },
          { id: 'beaches', heading: 'Plajlar', body: [
            "Psili Ammos ve Grikos, adanın en sevilen sakin plajları." ] },
        ],
        faq: [
          { q: "Patmos'a feribot var mı?", a: "Kuşadası bağlantılı seferlerle ulaşılabilir." },
        ],
      },
      en: EMPTY, el: EMPTY,
    },
  },
}

export const ISLAND_SLUGS = Object.keys(ISLANDS)  // generateStaticParams kaynağı
