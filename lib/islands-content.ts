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
      ferryDuration: '20–60 dk', areaKm2: 290, population: 37000 }, // ✓ verified 2026-07 (web) — ferryDuration İDO canlı seferiyle güncellenebilir
    prose: {
      tr: {
        intro:
          "Bodrum'un tam karşısında, boğazın Yunanistan yakasında yükselen Kos, Onikiadalar'ın en yeşil ve en düz adalarından biri. Tıbbın babası Hipokrat'ın doğduğu bu ada; uzun kum plajlarını, antik sağlık tapınağı Asklepion'u ve bisikletle keşfedilen sahil yollarını bir arada sunar. Bodrum'dan feribotla kısa bir geçişle ulaşırsınız — sabah antik kalıntılar, öğleden sonra berrak bir koy, akşam Zia köyünde gün batımı.",
        sections: [
          { id: 'beaches', heading: 'Plajlar', body: [
            "Kos'un kuzey kıyısı Türkiye'ye bakar ve uzun kum plajlarıyla bilinir. Kos şehrine en yakın plajlardan Tigaki, Mavi Bayrak sahibi, sığ ve berrak suyuyla çocuklu aileler için idealdir. Biraz batıdaki Marmari, yaklaşık 3 kilometrelik beyaz kumuyla uzanır; kuzeyin esintili havası burayı rüzgâr ve uçurtma sörfü için de gözde yapar.",
            "Adanın imzası sayılan Paradise plajı, altın kumu ve deniz tabanındaki doğal gaz kaynaklarının yarattığı kabarcıklarla dikkat çeker. Güneybatıdaki Kefalos körfezinde yer alan Agios Stefanos ise hemen açığındaki Kastri adacığı ve üzerindeki mavi-beyaz şapeliyle Kos'un en fotojenik köşelerinden.",
            "Adanın çoğu plajı Kos şehrinden 20–50 dakikalık sürüş mesafesinde ve yaz aylarında düzenli otobüs hatlarıyla bağlı. Sahil boyunca uzanan düz arazi, plajdan plaja bisikletle geçmeyi de kolaylaştırır." ] },
          { id: 'history', heading: 'Tarih ve Kültür', body: [
            "Kos, tıbbın babası kabul edilen Hipokrat'ın MÖ 5. yüzyılda doğduğu adadır. Şehrin yaklaşık 4 kilometre güneybatısındaki Asklepion, ona ithaf edilmiş antik bir sağlık tapınağı ve tarihin ilk hastanelerinden sayılır. Dört teras üzerine kurulu alana geniş bir merdivenle çıkılır; üst teraslardan Kos şehri ve karşı kıyıdaki Bodrum görünür.",
            "Şehir merkezinde, Şövalyeler Kalesi'nin hemen yanında duran Hipokrat Çınarı efsaneleşmiştir: rivayete göre Hipokrat öğrencilerine bu ağacın gölgesinde ders vermiş. Bugünkü çınarın yaklaşık 500 yaşında ve o ilk ağacın soyundan geldiğine inanılır.",
            "Ada katman katman tarih sunar: liman girişindeki Neratzia (Şövalyeler) Kalesi Saint John Şövalyeleri'nden kalma; şehir merkezindeki Roma Odeon'u, antik agora ve Casa Romana ise Roma döneminin izleridir. Hepsi birbirine yürüme mesafesinde." ] },
          { id: 'things-to-do', heading: 'Ne Yapılır', body: [
            "Kos'un en keyifli duraklarından biri Zia köyü. Dikeos Dağı'nın yamaçlarına kurulu köy; dar sokakları, el sanatları dükkânları ve gün batımına bakan tavernalarıyla akşamüstü için ideal.",
            "Deniz tatiline farklı bir dokunuş için Therma plajına gidebilirsiniz; mineralce zengin termal sular doğrudan denize karışarak sıcak bir doğal havuz oluşturur. Adanın düz coğrafyası bisiklet kiralamayı da cazip kılar.",
            "Kos, çevre adalara tekne turları için iyi bir üs. En popüler rota, aktif krateri içine yürüyebildiğiniz volkanik Nisyros adası; süngerciliğiyle bilinen Kalymnos ve küçük Pserimos da günübirlik seçenekler arasında." ] },
          { id: 'practical', heading: 'Ne Zaman Gidilir & Ulaşım', body: [
            "Kos'a feribot seferleri Mayıs–Ekim arası en yoğun dönemini yaşar. Temmuz ve Ağustos sıcak ve hareketli geçer; daha dengeli bir hava ve daha sakin plajlar için Haziran ve Eylül idealdir. Bodrum'dan geçiş, feribot tipine göre yaklaşık 20–60 dakika sürer.",
            "Adada ulaşım kolaydır: yazın plajları ve köyleri bağlayan düzenli otobüs hatları işler, düz arazi sayesinde bisiklet de pratik bir seçenektir. Daha uzak koyları ve Kefalos'u keşfetmek isteyenler için araç kiralamak en esnek yol — feribot ve araç kiralamayı TravelBeez üzerinden tek seferde planlayabilirsiniz." ] },
        ],
        faq: [
          { q: "Kos'a hangi limandan feribot var?", a: "Kos'a en yakın ve en sık feribot Bodrum'dan kalkar; sefer, feribot tipine göre yaklaşık 20–60 dakika sürer. Sezonda Turgutreis'ten de bağlantı bulunabilir." },
          { q: "Kos için vize gerekiyor mu?", a: "Kos, Yunanistan'ın Schengen bölgesindeki bir adasıdır ve giriş için genellikle geçerli bir vize gerekir. Kurallar dönemsel olarak değişebildiğinden, güncel durumu ve size uygun seçeneği TravelBeez vize destek ekibiyle netleştirebilirsiniz." },
          { q: "Kos günübirlik gezilebilir mi?", a: "Evet, Bodrum'a yakınlığı sayesinde sabah gidip akşam dönmek mümkün. Ancak Asklepion, plajlar ve Zia köyünü rahatça görmek için en az bir gece kalmanızı öneririz." },
          { q: "Kos'ta ada içi ulaşım nasıl?", a: "Yazın plajları ve köyleri bağlayan otobüs hatları işler; ada düz olduğu için bisiklet de yaygın. Daha uzak koylar için araç kiralamak en esnek seçenektir." },
          { q: "Kos'a gitmek için en iyi zaman ne zaman?", a: "Haziran ve Eylül; hava sıcaktır ama plajlar Temmuz-Ağustos'a kıyasla daha sakin, feribot seferleri de düzenli." },
        ],
      },
      en: EMPTY, el: EMPTY,
    },
  },

  rhodes: {
    slug: 'rhodes',
    heroImage: '/island/Rodos.webp',
    facts: { ferryFrom: 'fethiye', ferryTo: 'rodos', region: 'Onikiadalar',
      ferryDuration: '90 dk–2 sa', areaKm2: 1401, population: 125000 }, // ✓ verified 2026-07 (web) — ferryDuration İDO canlı seferiyle güncellenebilir
    prose: {
      tr: {
        intro:
          "Onikiadalar'ın en büyüğü Rodos, tek başına bir tatil rotası: UNESCO korumasındaki ortaçağ Şövalyeler Şehri, güneydeki Lindos Akropolü ve uzun kum plajları aynı adada buluşur. Fethiye'den feribotla ulaştığınız Rodos; tarih, plaj ve canlı kasaba hayatını bir arada arayanlar için Ege'nin en dolu adalarından.",
        sections: [
          { id: 'beaches', heading: 'Plajlar', body: [
            "Rodos'un doğu kıyısı uzun kum plajlarıyla bilinir. Tsambika, üzerindeki manastırın eteğinde uzanan geniş kumuyla en popüler plajlardan; hemen kuzeydeki Anthony Quinn Koyu ise adını 'Zorba' filminin başrol oyuncusundan alır ve kayalık, berrak sularıyla şnorkel için idealdir.",
            "Adanın en güney ucundaki Prasonisi, Ege ile Akdeniz'in buluştuğu ince bir kum dilinden oluşur; mevsime göre kâh yarımada kâh adacık olur ve güçlü rüzgârıyla sörfçülerin gözdesidir. Batı kıyısı genelde daha rüzgârlı, doğu kıyısı yüzmek için daha sakindir.",
            "Lindos'un hemen altındaki kumsal, akropol manzarası eşliğinde yüzmek isteyenlere ayrı bir deneyim sunar. Plajların çoğu araç veya yaz otobüs hatlarıyla ulaşılabilir." ] },
          { id: 'history', heading: 'Tarih ve Kültür', body: [
            "Rodos'un kalbi, surlarla çevrili ortaçağ Eski Şehri — Avrupa'nın en iyi korunmuş ortaçağ merkezlerinden ve UNESCO Dünya Mirası. Şövalyeler Sokağı'nın tepesinde yükselen Büyük Üstat Sarayı, Saint John Şövalyeleri döneminden kalma; kale ve komuta merkezi olarak kullanılmış, bugün müzedir.",
            "Adanın güneyinde, Lindos köyünün üzerindeki kayalığa kurulu Lindos Akropolü, 116 metrelik uçurumun tepesindeki Athena Lindia Tapınağı'yla Yunanistan'ın en etkileyici antik alanlarından. Beyaz badanalı Lindos köyü ve altındaki koy akropolle birlikte gezilir.",
            "Rodos, antik dünyanın yedi harikasından Rodos Heykeli'ne (Kolossos) de ev sahipliği yapmıştı; dev bronz heykel MÖ 3. yüzyılda bir depremde yıkıldı ve bugün ayakta değil, ama adanın antik ihtişamının simgesi olarak anılır." ] },
          { id: 'things-to-do', heading: 'Ne Yapılır', body: [
            "Eski Şehir'in taş sokaklarında kaybolmak başlı başına bir gün doldurur: Şövalyeler Sokağı, hanlar, kapılar ve sur yürüyüşü. Akşamları kasaba tavernaları ve avlular canlanır.",
            "Lindos'a bir tam gün ayırın — akropol, köy ve koy birlikte. Ada büyük olduğundan doğu kıyısı boyunca (Kallithea, Faliraki, Tsambika) araçla ilerleyip plaj-plaj gezmek keyiflidir.",
            "Rüzgâr sörfü meraklıları için Prasonisi bir merkez; Rodos ayrıca iç kesimdeki köyler ve Yedi Pınar (Epta Piges) gibi doğa duraklarıyla da gezilir." ] },
          { id: 'practical', heading: 'Ne Zaman Gidilir & Ulaşım', body: [
            "Rodos'a feribot ve turistik sezon genelde Nisan–Ekim arasıdır. Yaz sıcak ve kalabalık; ilkbahar ve sonbahar hem hava hem gezme konforu için idealdir. Fethiye'den geçiş, feribot tipine göre yaklaşık 90 dakika–2 saat sürer.",
            "Rodos büyük bir ada; Eski Şehir yürünür ama Lindos ve güney plajları için mesafe uzundur. En esnek yol araç kiralamaktır — feribot ve aracı TravelBeez üzerinden birlikte planlayabilirsiniz." ] },
        ],
        faq: [
          { q: "Rodos'a nereden feribot var?", a: "Rodos'a en yakın feribot Fethiye'den kalkar; sefer, feribot tipine göre yaklaşık 90 dakika–2 saat sürer." },
          { q: "Rodos için vize gerekiyor mu?", a: "Rodos, Yunanistan'ın Schengen bölgesindeki bir adasıdır ve giriş için genellikle geçerli bir vize gerekir. Kurallar dönemsel olarak değişebildiğinden, güncel durumu ve size uygun seçeneği TravelBeez vize destek ekibiyle netleştirebilirsiniz." },
          { q: "Rodos bir günde gezilir mi?", a: "Rodos büyük bir adadır; sadece Eski Şehir bile bir gün alır. Eski Şehir ile Lindos'u rahatça görmek için en az iki gün öneririz." },
          { q: "Rodos'ta ulaşım nasıl?", a: "Eski Şehir yürünerek gezilir; Lindos ve güney plajları için araç kiralamak en esnek seçenektir, yazın otobüs hatları da işler." },
          { q: "Rodos'a gitmek için en iyi zaman ne zaman?", a: "Mayıs, Haziran ve Eylül; hava sıcaktır ama Temmuz-Ağustos'a kıyasla daha az kalabalık, gezmek daha konforludur." },
        ],
      },
      en: EMPTY, el: EMPTY,
    },
  },

  samos: {
    slug: 'samos',
    heroImage: '/island/Samos.webp',
    facts: { ferryFrom: 'kusadasi', ferryTo: 'samos', region: 'Kuzey Ege',
      ferryDuration: '30–90 dk', areaKm2: 478, population: 33000 }, // ✓ verified 2026-07 (web) — ferryDuration İDO canlı seferiyle güncellenebilir
    prose: {
      tr: {
        intro:
          "Kuşadası'nın karşısında, aradaki boğazın yalnızca 1,9 kilometreye indiği noktada duran Samos (Sisam); çam ormanları, üzüm bağları ve antik mirasıyla doğa ile tarihi birleştiren bir ada. Pisagor ve Epikuros'un memleketi olan Samos, sakin koyları ve meşhur Muscat şarabıyla da bilinir.",
        sections: [
          { id: 'beaches', heading: 'Plajlar', body: [
            "Samos'un kuzey kıyısı en sevilen plajlarını barındırır. Kokkari balıkçı köyünün yakınındaki Tsamadou, berrak suyu ve arkasındaki yeşil tepeleriyle adanın en gözde plajlarından; hemen batısındaki Lemonakia da benzer bir çakıl-koy atmosferi sunar.",
            "Güneydeki Psili Ammos ise ince kumuyla öne çıkar. Plajların çoğu araçla kolayca ulaşılır; ada dağlık olduğundan kıyı yolları manzaralıdır." ] },
          { id: 'history', heading: 'Tarih ve Kültür', body: [
            "Samos, antik çağın en güçlü şehir devletlerinden biriydi ve iki büyük düşünürün — matematikçi Pisagor ile filozof Epikuros'un — doğduğu adadır. Güney kıyısındaki Pythagoreio kasabası adını Pisagor'dan alır ve UNESCO Dünya Mirası'dır; MÖ 6. yüzyıldan kalma antik liman mendireği bugün hâlâ kullanımdadır.",
            "Yakındaki Hera Tapınağı (Heraion), antik Yunan dünyasının en büyük kutsal alanlarındandı; bir zamanlar 155 sütunlu dev tapınaktan bugün ayakta tek bir sütun kalmıştır. Pythagoreio ile birlikte UNESCO listesindedir.",
            "Aynı UNESCO alanının parçası olan Eupalinos Tüneli, MÖ 6. yüzyılda Kastro Dağı'nı bir kilometreden fazla delerek yapılmış antik bir su kemeri ve dönemin en etkileyici mühendislik başarılarından sayılır." ] },
          { id: 'things-to-do', heading: 'Ne Yapılır', body: [
            "Samos'un dağ köyleri keşfe değer: Vourliotes ve Ampelos gibi köyler, Türkiye kıyısına bakan manzaraları ve asırlık şarap mahzenleriyle bilinir. Adanın meşhur Muscat şarabını yerinde tadabilirsiniz.",
            "Kokkari, neoklasik başkent Vathi ve iç kesimdeki yeşil orman yolları araçla gezmek için keyifli rotalar sunar. Doğa yürüyüşü sevenler için ada bol patikalıdır.",
            "Antik miras meraklıları Pythagoreio, Heraion ve Eupalinos Tüneli üçlüsünü bir günde birleştirebilir — hepsi güney kıyısında ve birbirine yakındır." ] },
          { id: 'practical', heading: 'Ne Zaman Gidilir & Ulaşım', body: [
            "Samos'a feribot ve turistik sezon genelde Haziran–Eylül arası en canlı dönemini yaşar. Yaz sıcak olsa da adanın yeşili ve orman kesimleri serinlik sağlar. Kuşadası'ndan geçiş, feribot tipine ve varış limanına göre yaklaşık 30–90 dakika sürer.",
            "Ada dağlık ve dağınık yerleşimli; plajlar, köyler ve antik alanlar arası mesafe için araç kiralamak en pratik yoldur. Feribot ve aracı TravelBeez üzerinden birlikte ayarlayabilirsiniz." ] },
        ],
        faq: [
          { q: "Samos'a nereden feribot var?", a: "Samos'a en yakın feribot Kuşadası'ndan kalkar; sefer, feribot tipine ve varış limanına (Vathi veya Pythagoreio) göre yaklaşık 30–90 dakika sürer." },
          { q: "Samos için vize gerekiyor mu?", a: "Samos, Yunanistan'ın Schengen bölgesindeki bir adasıdır ve giriş için genellikle geçerli bir vize gerekir. Kurallar dönemsel olarak değişebildiğinden, güncel durumu ve size uygun seçeneği TravelBeez vize destek ekibiyle netleştirebilirsiniz." },
          { q: "Samos günübirlik gezilebilir mi?", a: "Evet, Kuşadası'na yakınlığı sayesinde günübirlik mümkün; ancak antik alanları, köyleri ve plajları rahatça görmek için en az bir gece öneririz." },
          { q: "Samos'ta ulaşım nasıl?", a: "Ada dağlık ve geniş olduğundan araç kiralamak en esnek seçenektir; yazın bazı hatlarda otobüs de bulunur." },
          { q: "Samos'a gitmek için en iyi zaman ne zaman?", a: "Haziran ve Eylül; hava sıcak ama plajlar ve köyler yüksek sezona göre daha sakindir." },
        ],
      },
      en: EMPTY, el: EMPTY,
    },
  },

  leros: {
    slug: 'leros',
    heroImage: '/island/Leros.webp',
    facts: { ferryFrom: 'turgutreis', ferryTo: 'leros', region: 'Onikiadalar',
      ferryDuration: '45–60 dk', areaKm2: 74, population: 8000 }, // ✓ verified 2026-07 (web) — ferryDuration İDO canlı seferiyle güncellenebilir
    prose: {
      tr: {
        intro:
          "Onikiadalar'ın ortasında, Patmos ile Kalymnos arasında yer alan Leros; kitle turizminden uzak, sakin ve otantik bir ada. İtalyan dönemi mimarisi, korunaklı koyları ve balıkçı köyleriyle Leros, huzurlu bir Ege deneyimi arayanlar için farklı bir durak.",
        sections: [
          { id: 'beaches', heading: 'Plajlar ve Koylar', body: [
            "Leros korunaklı koylarıyla bilinir. Pandeli körfezi çevresindeki Vromolithos ve Agios Georgios plajları berrak suları ve sakin atmosferiyle öne çıkar; kuzeydeki Alinda ise adanın en uzun kumsallarından.",
            "Koyların çoğu sığ ve rüzgâra kapalı olduğundan yüzmek için elverişlidir. Balıkçı köyü Pandeli, plajın yanında tavernaları ve kafeleriyle akşamüstü için keyifli bir duraktır." ] },
          { id: 'history', heading: 'Tarih ve Kültür', body: [
            "Leros'un en belirgin özelliği İtalyan dönemi mimarisidir. 1912'de Onikiadalar'ı işgal eden İtalyanlar, adanın en büyük doğal limanı Lakki'yi doğu Akdeniz'deki başlıca deniz üssü seçti ve 1930'larda burada 'Portolago' adıyla modern bir kent inşa etti.",
            "Geniş bulvarları ve geometrik kamu binalarıyla Lakki, İtalyan Rasyonalist mimari akımının Yunanistan'daki en saf ve en büyük örneği kabul edilir. 30 bin kişilik planlanan kentte bugün çok daha az insan yaşar; bu da ona kendine özgü, sakin bir hava verir.",
            "Platanos'un üzerindeki tepede yükselen Pandeli Kalesi; Agia Marina ve Pandeli körfezlerine, komşu adalara ve Ege'ye 360 derecelik bir manzara sunar." ] },
          { id: 'things-to-do', heading: 'Ne Yapılır', body: [
            "Leros'ta gezinin merkezi mimari ve manzaradır: Lakki'nin rasyonalist yapıları arasında yürümek, Pandeli Kalesi'ne çıkıp gün batımını izlemek, geleneksel yel değirmenlerini görmek.",
            "Agia Marina ve Platanos'un neoklasik dokusu, kıyı kafeleri ve balıkçı iskeleleri gündüz için keyiflidir. Blefoutis ve Xirokampos gibi köyler adanın sakin, otantik yüzünü gösterir.",
            "Ada küçük olduğundan koydan koya gezmek kolaydır; tekneyle çevredeki küçük adalara kısa turlar da yapılabilir." ] },
          { id: 'practical', heading: 'Ne Zaman Gidilir & Ulaşım', body: [
            "Leros'a feribot ve sezon genelde yaz aylarında yoğunlaşır. Adanın sakin karakteri, yüksek sezon dışında (Haziran, Eylül) daha da belirginleşir. Turgutreis'ten geçiş, feribot tipine göre yaklaşık 45–60 dakika sürer.",
            "Ada kompakt olsa da köyler ve koylar arası ulaşım için araç veya scooter pratiktir. Feribot ve araç kiralamayı TravelBeez üzerinden birlikte planlayabilirsiniz." ] },
        ],
        faq: [
          { q: "Leros'a nereden feribot var?", a: "Leros'a Turgutreis üzerinden feribot bağlantısı bulunur; sefer, feribot tipine göre yaklaşık 45–60 dakika sürer." },
          { q: "Leros için vize gerekiyor mu?", a: "Leros, Yunanistan'ın Schengen bölgesindeki bir adasıdır ve giriş için genellikle geçerli bir vize gerekir. Kurallar dönemsel olarak değişebildiğinden, güncel durumu ve size uygun seçeneği TravelBeez vize destek ekibiyle netleştirebilirsiniz." },
          { q: "Leros günübirlik gezilebilir mi?", a: "Kısa geçiş süresi günübirliği mümkün kılar; ancak adanın sakin atmosferini ve köylerini hakkıyla yaşamak için en az bir gece öneririz." },
          { q: "Leros'ta ulaşım nasıl?", a: "Ada küçüktür; köyler ve koylar arası için araç veya scooter en pratik seçenektir." },
          { q: "Leros kimler için uygun?", a: "Kalabalıktan uzak, sakin ve otantik bir Ege deneyimi ile mimari ve tarih ilgisi arayanlar için Leros ideal bir duraktır." },
        ],
      },
      en: EMPTY, el: EMPTY,
    },
  },

  patmos: {
    slug: 'patmos',
    heroImage: '/island/Patmos.webp',
    facts: { ferryFrom: 'kusadasi', ferryTo: 'patmos', region: 'Onikiadalar',
      ferryDuration: '~2 sa 15 dk', areaKm2: 34, population: 3300 }, // ✓ verified 2026-07 (web) — ferryDuration İDO canlı seferiyle güncellenebilir
    prose: {
      tr: {
        intro:
          "Hristiyanlık için kutsal sayılan Patmos, Aziz Yuhanna'nın İncil'ini ve Vahiy'i (Apokalips) yazdığına inanılan ada. UNESCO korumasındaki manastırı, Kıyamet Mağarası ve beyaz badanalı Chora köyüyle Patmos; hem bir hac merkezi hem de sakinliğiyle huzur arayanların rotası.",
        sections: [
          { id: 'beaches', heading: 'Plajlar', body: [
            "Patmos'un en simgesel plajı, güneybatıdaki ıssız bir koyda yer alan Psili Ammos'tur; ince altın kumu ve turkuaz suyuyla bilinir, genellikle Skala'dan kalkan deniz taksileriyle ya da kısa bir yürüyüşle ulaşılır.",
            "Adanın en uzun plajı Grikos; kumu, berrak suyu ve olanaklarıyla aileler için elverişlidir. Liman kasabası Skala'nın hemen yanındaki plaj ise sığ ve pratik olsa da yüksek sezonda kalabalık olabilir." ] },
          { id: 'history', heading: 'Tarih ve Kültür', body: [
            "Patmos'un kalbi, adanın en yüksek noktasındaki Aziz Yuhanna Manastırı'dır; 1088'de kurulan manastır, kuleleri ve mazgallarıyla adeta bir kaleyi andırır, içinde değerli el yazmaları ve ikonalar barındırır.",
            "Chora ile Skala arasındaki yolda yer alan Kıyamet Mağarası, geleneğe göre Aziz Yuhanna'nın vahiylerini aldığı yerdir. Manastır, mağara ve Chora'nın tarihi merkezi 1999'da birlikte UNESCO Dünya Mirası ilan edilmiştir.",
            "Manastırın çevresine kurulu Chora; beyaz badanalı küp evleri, araçların giremediği dar taş sokakları ve her köşesinden denize açılan manzaralarıyla Ege'nin en güzel korunmuş ortaçağ kasabalarından biridir." ] },
          { id: 'things-to-do', heading: 'Ne Yapılır', body: [
            "Adanın manevi rotası nettir: önce Kıyamet Mağarası, ardından tepedeki Aziz Yuhanna Manastırı. Ziyaret sırasında kıyafet ve sessizlik konusunda kutsal mekân adabına özen gösterilir.",
            "Chora'nın taş sokaklarında yürümek, avlular ve manastır surları arasında gezinmek başlı başına bir deneyimdir. Skala limanı ise adanın canlı yüzü: kafeler, balıkçı tekneleri ve deniz taksisi kalkış noktası.",
            "Denizden gezmeyi sevenler için Psili Ammos gibi ıssız koylara tekne veya deniz taksisi turları, adanın sakin kıyılarını keşfetmenin en keyifli yoludur." ] },
          { id: 'practical', heading: 'Ne Zaman Gidilir & Ulaşım', body: [
            "Patmos'a feribot ve sezon genelde yaz aylarında, özellikle Haziran–Eylül arasında yoğunlaşır. Adanın huzurlu havası yüksek sezon dışında daha da belirgindir. Kuşadası'ndan geçiş, feribot tipine göre yaklaşık 2 saat 15 dakika sürer.",
            "Ada küçüktür; Skala, Chora ve plajlar arası için araç, scooter veya deniz taksisi kullanılır. Feribot ve araç kiralamayı TravelBeez üzerinden birlikte ayarlayabilirsiniz." ] },
        ],
        faq: [
          { q: "Patmos'a nereden feribot var?", a: "Patmos'a Kuşadası bağlantılı seferlerle ulaşılır; geçiş, feribot tipine göre yaklaşık 2 saat 15 dakika sürer." },
          { q: "Patmos için vize gerekiyor mu?", a: "Patmos, Yunanistan'ın Schengen bölgesindeki bir adasıdır ve giriş için genellikle geçerli bir vize gerekir. Kurallar dönemsel olarak değişebildiğinden, güncel durumu ve size uygun seçeneği TravelBeez vize destek ekibiyle netleştirebilirsiniz." },
          { q: "Patmos günübirlik gezilebilir mi?", a: "Günübirlik mümkün olsa da manastır, mağara ve Chora'yı sakince gezmek ve adanın huzurunu yaşamak için en az bir gece öneririz." },
          { q: "Manastır ve mağarayı ziyaret ederken nelere dikkat edilmeli?", a: "Kutsal mekânlardır; omuz ve dizleri örten uygun kıyafet ile sessizlik beklenir. Ziyaret saatleri mevsime göre değişebilir." },
          { q: "Patmos'a gitmek için en iyi zaman ne zaman?", a: "Haziran ve Eylül; hava uygun, kalabalık yüksek sezona göre daha azdır." },
        ],
      },
      en: EMPTY, el: EMPTY,
    },
  },
}

export const ISLAND_SLUGS = Object.keys(ISLANDS)  // generateStaticParams kaynağı
