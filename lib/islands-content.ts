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
    facts: { ferryFrom: 'bodrum', ferryTo: 'kos', region: 'Dodecanese',
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
      en: {
        intro:
          "Situated directly opposite Bodrum, on the Greek side of the strait, Kos is one of the greenest and flattest islands of the Dodecanese. This island, the birthplace of Hippocrates, the father of medicine, offers a combination of long sandy beaches, the ancient temple of Asclepius (the Asklepion) and coastal paths perfect for exploring by bike. It’s just a short ferry ride from Bodrum — ancient ruins in the morning, a crystal-clear cove in the afternoon, and a sunset in the village of Zia in the evening.",
        sections: [
          { id: 'beaches', heading: "Beaches", body: [
            "The northern coast of Kos faces Turkey and is known for its long sandy beaches. Tigaki, one of the beaches closest to Kos town, holds Blue Flag status and, with its shallow, crystal-clear waters, is ideal for families with children. A little further west, Marmari stretches for around 3 kilometres of white sand; the breezy northern climate also makes this a favourite spot for windsurfing and kitesurfing.",
            "Paradise Beach, considered the island’s signature spot, is notable for its golden sand and the bubbles created by natural gas sources on the seabed. Agios Stefanos, situated in the Kefalos Bay in the south-west, is one of Kos’s most photogenic spots, thanks to the islet of Kastri just offshore and the blue-and-white chapel on it.",
            "Most of the island’s beaches are a 20–50-minute drive from Kos town and are served by regular bus services during the summer months. The flat terrain along the coast also makes it easy to cycle from beach to beach." ] },
          { id: 'history', heading: "History and Culture", body: [
            "Kos is the island where Hippocrates, regarded as the father of medicine, was born in the 5th century BC. The Asklepion, situated approximately 4 kilometres south-west of the town, is an ancient temple of healing dedicated to him and is considered one of the earliest hospitals in history. The site, built on four terraces, is accessed via a wide staircase; from the upper terraces, one can see the town of Kos and Bodrum on the opposite shore.",
            "The Hippocrates Plane Tree, standing in the city centre right next to the Knights’ Castle, has become the stuff of legend: according to legend, Hippocrates taught his students in the shade of this tree. The present-day tree is approximately 500 years old and is believed to be a descendant of that original tree.",
            "The island offers layers upon layers of history: Neratzia (Knights’) Castle at the harbour entrance dates back to the Knights of St John; the Roman Odeon, the ancient agora and the Casa Romana in the town centre are remnants of the Roman period. They are all within walking distance of one another." ] },
          { id: 'things-to-do', heading: "What to Do", body: [
            "One of the most delightful places to visit on Kos is the village of Zia. Perched on the slopes of Mount Dikeos, the village is ideal for a late afternoon stroll, with its narrow streets, craft shops and tavernas overlooking the sunset.",
            "For a slightly different kind of seaside holiday, you could head to Therma Beach, where mineral-rich thermal waters flow directly into the sea, creating a warm natural pool. The island’s flat terrain also makes bike hire an attractive option.",
            "Kos is a good base for boat trips to the neighbouring islands. The most popular route is to the volcanic island of Nisyros, where you can walk into the active crater; Kalymnos, known for its sponge fishing, and the small island of Pserimos are also among the day-trip options." ] },
          { id: 'practical', heading: "Best Time to Visit & Getting There", body: [
            "Ferry services to Kos are at their busiest between May and October. July and August are hot and busy; June and September are ideal for more moderate weather and quieter beaches. The crossing from Bodrum takes approximately 20–60 minutes, depending on the type of ferry.",
            "Getting around the island is easy: in summer, regular bus services run between the beaches and villages, and cycling is also a practical option thanks to the flat terrain. For those wishing to explore the more remote coves and Kefalos, hiring a car is the most flexible option — you can book both the ferry and car hire in one go via TravelBeez." ] },
        ],
        faq: [
          { q: "Which port has a ferry service to Kos?", a: "The closest and most frequent ferry to Kos departs from Bodrum; the journey takes approximately 20–60 minutes, depending on the type of ferry. During the season, there may also be connections from Turgutreis." },
          { q: "Do I need a visa to visit Kos?", a: "Kos is an island in the Schengen area of Greece, and a valid visa is generally required for entry. As the rules may change from time to time, you can check the current situation and find the option that suits you best with the TravelBeez visa support team." },
          { q: "Is it possible to visit Kos on a day trip?", a: "Yes, thanks to its proximity to Bodrum, it is possible to go there in the morning and return in the evening. However, we recommend staying at least one night to have time to explore the Asklepion, the beaches and the village of Zia at your leisure." },
          { q: "What is transport like on the island of Kos?", a: "During the summer, bus routes connecting the beaches and villages are in operation; as the island is flat, cycling is also popular. For more remote coves, hiring a car is the most flexible option." },
          { q: "When is the best time to visit Kos?", a: "June and September: the weather is hot, but the beaches are quieter than in July and August, and the ferry services run regularly." },
        ],
      },
      el: {
        intro:
          "Ακριβώς απέναντι από το Μπόντρουμ, στην ελληνική πλευρά του στενού, βρίσκεται η Κως, ένα από τα πιο καταπράσινα και πιο επίπεδα νησιά των Δωδεκανήσων. Αυτό το νησί, γενέτειρα του Ιπποκράτη, του πατέρα της ιατρικής, συνδυάζει τις εκτενείς αμμώδεις παραλίες, τον αρχαίο ναό της ιατρικής, το Ασκληπιείο, και τους παραλιακούς δρόμους που μπορείτε να εξερευνήσετε με ποδήλατο. Μπορείτε να φτάσετε εκεί με ένα σύντομο ταξίδι με πλοίο από το Μπόντρουμ — το πρωί τα αρχαία ερείπια, το απόγευμα ένας κρυστάλλινος όρμος, το βράδυ το ηλιοβασίλεμα στο χωριό Ζία.",
        sections: [
          { id: 'beaches', heading: "Παραλίες", body: [
            "Η βόρεια ακτή της Κω βλέπει προς την Τουρκία και είναι γνωστή για τις εκτεταμένες αμμώδεις παραλίες της. Η Τιγάκι, μία από τις πιο κοντινές παραλίες στην πόλη της Κω, έχει βραβευτεί με Γαλάζια Σημαία και, χάρη στα ρηχά και καθαρά νερά της, είναι ιδανική για οικογένειες με παιδιά. Λίγο πιο δυτικά, η Μαρμάρι εκτείνεται σε μήκος περίπου 3 χιλιομέτρων με λευκή άμμο· ο δροσερός αέρας του βορρά καθιστά το μέρος αυτό δημοφιλές για windsurfing και kitesurfing.",
            "Η παραλία Paradise, που θεωρείται το σήμα κατατεθέν του νησιού, ξεχωρίζει για τη χρυσή άμμο της και τις φυσαλίδες που δημιουργούνται από τα κοιτάσματα φυσικού αερίου στον βυθό της θάλασσας. Ο Άγιος Στέφανος, που βρίσκεται στον κόλπο του Κεφάλου στα νοτιοδυτικά, αποτελεί μία από τις πιο φωτογενείς γωνιές της Κω, χάρη στο νησάκι Κάστρι που βρίσκεται ακριβώς απέναντι και το γαλάζιο-λευκό εκκλησάκι που στέκεται πάνω του.",
            "Οι περισσότερες παραλίες του νησιού βρίσκονται σε απόσταση 20–50 λεπτών με το αυτοκίνητο από την πόλη της Κω και συνδέονται με τακτικά δρομολόγια λεωφορείων κατά τους καλοκαιρινούς μήνες. Το επίπεδο έδαφος που εκτείνεται κατά μήκος της ακτής διευκολύνει επίσης τη μετακίνηση με ποδήλατο από παραλία σε παραλία." ] },
          { id: 'history', heading: "Ιστορία και Πολιτισμός", body: [
            "Η Κως είναι το νησί όπου γεννήθηκε τον 5ο αιώνα π.Χ. ο Ιπποκράτης, ο οποίος θεωρείται ο πατέρας της ιατρικής. Το Ασκληπιείο, που βρίσκεται περίπου 4 χιλιόμετρα νοτιοδυτικά της πόλης, είναι ένας αρχαίος ναός αφιερωμένος στον Ιπποκράτη και θεωρείται ένα από τα πρώτα νοσοκομεία της ιστορίας. Η πρόσβαση στον χώρο, ο οποίος είναι χτισμένος σε τέσσερις βεράντες, γίνεται μέσω μιας ευρείας σκάλας· από τις ανώτερες βεράντες απλώνεται θέα προς την πόλη της Κω και το Μπόντρουμ στην απέναντι ακτή.",
            "Στο κέντρο της πόλης, ακριβώς δίπλα στο Κάστρο των Ιπποτών, βρίσκεται το θρυλικό Πλατάνι του Ιπποκράτη: σύμφωνα με την παράδοση, ο Ιπποκράτης δίδασκε τους μαθητές του κάτω από τη σκιά αυτού του δέντρου. Το σημερινό πλατάνι είναι περίπου 500 ετών και πιστεύεται ότι κατάγεται από εκείνο το πρώτο δέντρο.",
            "Το νησί αποκαλύπτει την ιστορία του στρώμα προς στρώμα: το κάστρο Νεράτζια (Ιππότες) στην είσοδο του λιμανιού, που χρονολογείται από την εποχή των Ιπποτών του Αγίου Ιωάννη· το ρωμαϊκό Ωδείο στο κέντρο της πόλης, η αρχαία αγορά και η Casa Romana αποτελούν ίχνη της ρωμαϊκής εποχής. Όλα βρίσκονται σε κοντινή απόσταση μεταξύ τους." ] },
          { id: 'things-to-do', heading: "Τι να κάνετε", body: [
            "Μία από τις πιο ευχάριστες στάσεις στην Κω είναι το χωριό Ζία. Το χωριό, χτισμένο στις πλαγιές του όρους Δίκαιου, με τα στενά δρομάκια, τα καταστήματα χειροτεχνίας και τις ταβέρνες με θέα στο ηλιοβασίλεμα, είναι ιδανικό για το απόγευμα.",
            "Για να δώσετε μια διαφορετική πινελιά στις διακοπές σας στη θάλασσα, μπορείτε να επισκεφθείτε την παραλία Therma· τα πλούσια σε μεταλλικά στοιχεία ιαματικά νερά αναμειγνύονται απευθείας με τη θάλασσα, δημιουργώντας μια ζεστή φυσική πισίνα. Η επίπεδη γεωγραφία του νησιού καθιστά επίσης ελκυστική την ενοικίαση ποδηλάτου.",
            "Η Κως αποτελεί μια καλή βάση για εκδρομές με σκάφος στα γύρω νησιά. Η πιο δημοφιλής διαδρομή είναι το ηφαιστειακό νησί της Νίσυρου, όπου μπορείτε να περπατήσετε μέσα στον ενεργό κρατήρα· η Κάλυμνος, γνωστή για τη σπογγαλιεία της, και το μικρό νησί Ψερίμος συγκαταλέγονται επίσης στις επιλογές για ημερήσιες εκδρομές." ] },
          { id: 'practical', heading: "Πότε να πάτε & Πώς να φτάσετε", body: [
            "Τα δρομολόγια των πλοίων προς την Κω γνωρίζουν τη μεγαλύτερη κίνηση από τον Μάιο έως τον Οκτώβριο. Ο Ιούλιος και ο Αύγουστος είναι ζεστοί και πολυσύχναστοι μήνες· για πιο ήπιο κλίμα και πιο ήσυχες παραλίες, ο Ιούνιος και ο Σεπτέμβριος είναι οι ιδανικοί μήνες. Η διαδρομή από το Μπόντρουμ διαρκεί περίπου 20–60 λεπτά, ανάλογα με τον τύπο του πλοίου.",
            "Η μετακίνηση στο νησί είναι εύκολη: το καλοκαίρι λειτουργούν τακτικά δρομολόγια λεωφορείων που συνδέουν τις παραλίες με τα χωριά, ενώ χάρη στο επίπεδο ανάγλυφο του εδάφους, το ποδήλατο αποτελεί επίσης μια πρακτική επιλογή. Για όσους επιθυμούν να εξερευνήσουν τους πιο απομακρυσμένους όρμους και την Κεφάλου, η ενοικίαση αυτοκινήτου αποτελεί την πιο ευέλικτη λύση — μπορείτε να οργανώσετε ταυτόχρονα το ακτοπλοϊκό δρομολόγιο και την ενοικίαση αυτοκινήτου μέσω της TravelBeez." ] },
        ],
        faq: [
          { q: "Από ποιο λιμάνι υπάρχει πλοίο για την Κω;", a: "Τα πλοία που αναχωρούν από το Μπόντρουμ είναι τα πιο κοντινά και τα πιο συχνά προς την Κω· η διαδρομή διαρκεί περίπου 20–60 λεπτά, ανάλογα με τον τύπο του πλοίου. Κατά τη διάρκεια της τουριστικής περιόδου, υπάρχουν επίσης δρομολόγια από το Τουργκουτρέις." },
          { q: "Χρειάζεται βίζα για την Κω;", a: "Η Κως είναι ένα νησί της Ελλάδας που ανήκει στην περιοχή Σένγκεν και, κατά κανόνα, απαιτείται έγκυρη βίζα για την είσοδο. Δεδομένου ότι οι κανόνες ενδέχεται να αλλάζουν κατά καιρούς, μπορείτε να διευκρινίσετε την τρέχουσα κατάσταση και την επιλογή που σας ταιριάζει με την ομάδα υποστήριξης βίζας της TravelBeez." },
          { q: "Μπορεί κανείς να κάνει ημερήσια εκδρομή στο Κος;", a: "Ναι, χάρη στην εγγύτητά του με το Μπόντρουμ, είναι δυνατό να πάτε το πρωί και να επιστρέψετε το βράδυ. Ωστόσο, για να δείτε άνετα το Ασκληπιείο, τις παραλίες και το χωριό Ζία, σας προτείνουμε να μείνετε τουλάχιστον μία νύχτα." },
          { q: "Πώς είναι οι μετακινήσεις εντός του νησιού στην Κω;", a: "Το καλοκαίρι λειτουργούν λεωφορειακές γραμμές που συνδέουν τις παραλίες με τα χωριά· καθώς το νησί είναι επίπεδο, η χρήση ποδηλάτου είναι επίσης διαδεδομένη. Για τους πιο απομακρυσμένους όρμους, η ενοικίαση αυτοκινήτου αποτελεί την πιο ευέλικτη επιλογή." },
          { q: "Πότε είναι η καλύτερη εποχή για να επισκεφθεί κανείς την Κω;", a: "Ιούνιος και Σεπτέμβριος: ο καιρός είναι ζεστός, αλλά οι παραλίες είναι πιο ήσυχες σε σύγκριση με τον Ιούλιο και τον Αύγουστο, ενώ τα δρομολόγια των πλοίων είναι τακτικά." },
        ],
      },
    },
  },

  rhodes: {
    slug: 'rhodes',
    heroImage: '/island/Rodos.webp',
    facts: { ferryFrom: 'fethiye', ferryTo: 'rodos', region: 'Dodecanese',
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
      en: {
        intro:
          "Rhodes, the largest of the Dodecanese islands, is a holiday destination in its own right: the medieval City of the Knights, a UNESCO World Heritage Site, the Acropolis of Lindos to the south and long sandy beaches all come together on the same island. Reachable by ferry from Fethiye, Rhodes is one of the Aegean’s most vibrant islands for those seeking a blend of history, beaches and lively town life.",
        sections: [
          { id: 'beaches', heading: "Beaches", body: [
            "The east coast of Rhodes is known for its long sandy beaches. Tsambika, with its wide sandy stretch at the foot of the monastery, is one of the most popular beaches; just to the north, Anthony Quinn Bay takes its name from the lead actor in the film ‘Zorba’ and, with its rocky shores and crystal-clear waters, is ideal for snorkelling.",
            "Prasonisi, at the southernmost tip of the island, consists of a narrow strip of sand where the Aegean and the Mediterranean meet; depending on the season, it is sometimes a peninsula and sometimes an islet, and is a favourite spot for surfers thanks to its strong winds. The west coast is generally windier, whilst the east coast is calmer for swimming.",
            "The beach just below Lindos offers a unique experience for those wishing to swim whilst enjoying views of the acropolis. Most of the beaches can be reached by car or on the summer bus routes." ] },
          { id: 'history', heading: "History and Culture", body: [
            "The heart of Rhodes is its walled medieval Old Town — one of Europe’s best-preserved medieval centres and a UNESCO World Heritage Site. Rising at the top of Knights’ Street, the Grand Master’s Palace dates back to the era of the Knights of St John; it was used as a fortress and command centre and is now a museum.",
            "In the south of the island, the Lindos Acropolis, perched on the rocky outcrop above the village of Lindos, is one of Greece’s most impressive ancient sites, with the Temple of Athena Lindia situated at the top of a 116-metre cliff. The whitewashed village of Lindos and the cove below are usually visited together with the acropolis.",
            "Rhodes was also home to the Colossus of Rhodes, one of the Seven Wonders of the Ancient World; the giant bronze statue was destroyed in an earthquake in the 3rd century BC and no longer stands today, but it is remembered as a symbol of the island’s ancient splendour." ] },
          { id: 'things-to-do', heading: "What to Do", body: [
            "Getting lost in the cobbled streets of the Old Town is enough to fill a whole day: Knights’ Street, the inns, the gates and a walk along the ramparts. In the evenings, the town’s taverns and courtyards come to life.",
            "Set aside a full day for Lindos — the acropolis, the village and the bay all in one. As the island is quite large, it’s a pleasure to drive along the east coast (Kallithea, Faliraki, Tsambika) and visit the beaches one by one.",
            "Prasonisi is a hub for windsurfing enthusiasts; Rhodes is also worth exploring for its inland villages and natural attractions such as Seven Springs (Epta Piges)." ] },
          { id: 'practical', heading: "Best Time to Visit & Getting There", body: [
            "Ferries to Rhodes operate during the tourist season, which generally runs from April to October. Summers are hot and crowded; spring and autumn are ideal for both the weather and a comfortable visit. The crossing from Fethiye takes approximately 90 minutes to 2 hours, depending on the type of ferry.",
            "Rhodes is a large island; the Old Town is within walking distance, but it’s quite a long way to Lindos and the southern beaches. The most flexible option is to hire a car — you can book both the ferry and the car together via TravelBeez." ] },
        ],
        faq: [
          { q: "Where can I catch a ferry to Rhodes?", a: "The nearest ferry to Rhodes departs from Fethiye; the journey takes approximately 90 minutes to 2 hours, depending on the type of ferry." },
          { q: "Do you need a visa to visit Rhodes?", a: "Rhodes is an island in the Schengen area of Greece, and a valid visa is generally required for entry. As the rules may change from time to time, you can check the current situation and find out which option is right for you by contacting the TravelBeez visa support team." },
          { q: "Can you see all of Rhodes in a day?", a: "Rhodes is a large island; exploring the Old Town alone takes a whole day. We recommend at least two days to see both the Old Town and Lindos at a leisurely pace." },
          { q: "What’s the transport like in Rhodes?", a: "The Old Town is best explored on foot; hiring a car is the most flexible option for visiting Lindos and the southern beaches, although bus services also run in the summer." },
          { q: "When is the best time to visit Rhodes?", a: "May, June and September; the weather is hot, but it’s less crowded than in July and August, making it more comfortable to explore." },
        ],
      },
      el: {
        intro:
          "Η Ρόδος, το μεγαλύτερο νησί των Δωδεκανήσων, αποτελεί από μόνη της έναν προορισμό διακοπών: η μεσαιωνική «Πόλη των Ιπποτών», που προστατεύεται από τη UNESCO, η Ακρόπολη της Λίνδου στο νότο και οι εκτεταμένες αμμώδεις παραλίες συνυπάρχουν στο ίδιο νησί. Η Ρόδος, στην οποία φτάνετε με πλοίο από τη Φετιγιέ, είναι ένα από τα πιο πλούσια νησιά του Αιγαίου για όσους αναζητούν ιστορία, παραλίες και ζωντανή ζωή στην πόλη.",
        sections: [
          { id: 'beaches', heading: "Παραλίες", body: [
            "Η ανατολική ακτή της Ρόδου είναι γνωστή για τις εκτεταμένες αμμώδεις παραλίες της. Η Τσαμπίκα, με την ευρύχωρη αμμουδιά της που εκτείνεται στους πρόποδες του μοναστηριού, είναι μια από τις πιο δημοφιλείς παραλίες· ο κόλπος Άντονι Κουίν, που βρίσκεται ακριβώς βόρεια, παίρνει το όνομά του από τον πρωταγωνιστή της ταινίας «Ζορμπάς» και, με τα βραχώδη και κρυστάλλινα νερά του, είναι ιδανικός για κολύμβηση με αναπνευστήρα.",
            "Το Πρασονήσι, στο νοτιότερο άκρο του νησιού, αποτελείται από μια λεπτή αμμώδη λωρίδα όπου συναντώνται το Αιγαίο και η Μεσόγειος· ανάλογα με την εποχή, άλλοτε αποτελεί χερσόνησο και άλλοτε νησάκι, ενώ χάρη στους ισχυρούς ανέμους του αποτελεί αγαπημένο προορισμό των σέρφερ. Η δυτική ακτή είναι γενικά πιο ανεμώδης, ενώ η ανατολική ακτή είναι πιο ήρεμη για κολύμπι.",
            "Η παραλία ακριβώς κάτω από τη Λίνδο προσφέρει μια ξεχωριστή εμπειρία σε όσους επιθυμούν να κολυμπήσουν με θέα την ακρόπολη. Στις περισσότερες παραλίες μπορεί κανείς να φτάσει με αυτοκίνητο ή με τα καλοκαιρινά λεωφορεία." ] },
          { id: 'history', heading: "Ιστορία και Πολιτισμός", body: [
            "Η καρδιά της Ρόδου, η μεσαιωνική Παλιά Πόλη που περιβάλλεται από τείχη — ένα από τα καλύτερα διατηρημένα μεσαιωνικά κέντρα της Ευρώπης και Μνημείο Παγκόσμιας Κληρονομιάς της UNESCO. Το Παλάτι του Μεγάλου Μαγίστρου, που υψώνεται στην κορυφή της Οδού των Ιπποτών, χρονολογείται από την εποχή των Ιπποτών του Αγίου Ιωάννη· χρησιμοποιήθηκε ως φρούριο και κέντρο διοίκησης, ενώ σήμερα λειτουργεί ως μουσείο.",
            "Στο νότιο τμήμα του νησιού, η Ακρόπολη της Λίνδου, χτισμένη πάνω στον βράχο πάνω από το χωριό Λίνδος, αποτελεί έναν από τους πιο εντυπωσιακούς αρχαιολογικούς χώρους της Ελλάδας, με το Ναό της Αθηνάς Λίνδιας να στέκεται στην κορυφή ενός γκρεμού ύψους 116 μέτρων. Το ασβεστωμένο χωριό Λίνδος και ο κόλπος που βρίσκεται από κάτω του αποτελούν μέρος της περιήγησης μαζί με την Ακρόπολη.",
            "Η Ρόδος φιλοξένησε επίσης το Άγαλμα της Ρόδου (Κολοσσός), ένα από τα επτά θαύματα του αρχαίου κόσμου· το γιγαντιαίο χάλκινο άγαλμα κατέρρευσε κατά τη διάρκεια ενός σεισμού τον 3ο αιώνα π.Χ. και σήμερα δεν στέκεται πια όρθιο, αλλά παραμένει σύμβολο της αρχαίας μεγαλοπρέπειας του νησιού." ] },
          { id: 'things-to-do', heading: "Τι να κάνετε", body: [
            "Το να χαθείς στα πέτρινα δρομάκια της Παλιάς Πόλης είναι από μόνο του αρκετό για να γεμίσει μια ολόκληρη μέρα: η Οδός των Ιπποτών, τα πανδοχεία, οι πύλες και η βόλτα στα τείχη. Τα βράδια, οι ταβέρνες και οι αυλές της πόλης ζωντανεύουν.",
            "Αφιερώστε μια ολόκληρη μέρα στη Λίνδο — την ακρόπολη, το χωριό και τον όρμο μαζί. Καθώς το νησί είναι μεγάλο, είναι ευχάριστο να ταξιδεύετε με αυτοκίνητο κατά μήκος της ανατολικής ακτής (Καλλιθέα, Φαληράκι, Τσαμπίκα) και να επισκέπτεστε τη μία παραλία μετά την άλλη.",
            "Το Πρασονίσι αποτελεί κέντρο για τους λάτρεις της ιστιοσανίδας· η Ρόδος προσφέρεται επίσης για περιηγήσεις στα χωριά του εσωτερικού της και σε φυσικούς προορισμούς όπως το Επτά Πηγές (Epta Piges)." ] },
          { id: 'practical', heading: "Πότε να πάτε & Πώς να φτάσετε", body: [
            "Τα δρομολόγια των πλοίων προς τη Ρόδο και η τουριστική περίοδος διαρκούν συνήθως από τον Απρίλιο έως τον Οκτώβριο. Το καλοκαίρι είναι ζεστό και πολυσύχναστο, ενώ η άνοιξη και το φθινόπωρο είναι ιδανικές εποχές τόσο για τον καιρό όσο και για την άνεση των περιηγήσεων. Η διαδρομή από τη Φετιγιέ διαρκεί περίπου 90 λεπτά έως 2 ώρες, ανάλογα με τον τύπο του πλοίου.",
            "Η Ρόδος είναι ένα μεγάλο νησί· η Παλιά Πόλη είναι προσβάσιμη με τα πόδια, αλλά η απόσταση μέχρι τη Λίνδο και τις παραλίες του νότου είναι μεγάλη. Ο πιο ευέλικτος τρόπος είναι να νοικιάσετε αυτοκίνητο — μπορείτε να οργανώσετε μαζί το ακτοπλοϊκό και το αυτοκίνητο μέσω της TravelBeez." ] },
        ],
        faq: [
          { q: "Από πού φεύγει το πλοίο για τη Ρόδο;", a: "Το πλησιέστερο προς τη Ρόδο πλοίο αναχωρεί από τη Φετιγιέ· η διαδρομή διαρκεί περίπου 90 λεπτά έως 2 ώρες, ανάλογα με τον τύπο του πλοίου." },
          { q: "Χρειάζεται βίζα για τη Ρόδο;", a: "Η Ρόδος είναι ένα νησί της Ελλάδας που ανήκει στην περιοχή Σένγκεν και, κατά κανόνα, απαιτείται έγκυρη βίζα για την είσοδο. Δεδομένου ότι οι κανόνες ενδέχεται να αλλάζουν κατά καιρούς, μπορείτε να διευκρινίσετε την τρέχουσα κατάσταση και την επιλογή που σας ταιριάζει με την ομάδα υποστήριξης βίζας της TravelBeez." },
          { q: "Μπορεί κανείς να περιηγηθεί στη Ρόδο σε μία μέρα;", a: "Η Ρόδος είναι ένα μεγάλο νησί· μόνο η Παλιά Πόλη απαιτεί μια ολόκληρη μέρα. Προτείνουμε τουλάχιστον δύο ημέρες για να εξερευνήσετε άνετα την Παλιά Πόλη και τη Λίνδο." },
          { q: "Πώς είναι οι μετακινήσεις στη Ρόδο;", a: "Η Παλιά Πόλη μπορεί να εξερευνηθεί με τα πόδια· για τη Λίνδο και τις νότιες παραλίες, η ενοικίαση αυτοκινήτου αποτελεί την πιο ευέλικτη επιλογή, ενώ το καλοκαίρι λειτουργούν και λεωφορειακές γραμμές." },
          { q: "Πότε είναι η καλύτερη εποχή για να πάει κανείς στη Ρόδο;", a: "Μάιος, Ιούνιος και Σεπτέμβριος: ο καιρός είναι ζεστός, αλλά σε σύγκριση με τον Ιούλιο και τον Αύγουστο υπάρχει λιγότερος κόσμος και οι περιηγήσεις είναι πιο άνετες." },
        ],
      },
    },
  },

  samos: {
    slug: 'samos',
    heroImage: '/island/Samos.webp',
    facts: { ferryFrom: 'kusadasi', ferryTo: 'samos', region: 'North Aegean',
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
      en: {
        intro:
          "Samos (Sisam), situated opposite Kuşadası at the point where the strait between them narrows to just 1.9 kilometres, is an island that blends nature with history through its pine forests, vineyards and ancient heritage. Home to Pythagoras and Epicurus, Samos is also known for its tranquil coves and its famous Muscat wine.",
        sections: [
          { id: 'beaches', heading: "Beaches", body: [
            "The northern coast of Samos is home to some of the island’s most popular beaches. Tsamadou, near the fishing village of Kokkari, is one of the island’s most sought-after beaches, with its crystal-clear waters and the green hills behind it; Lemonakia, just to the west, offers a similar pebbly cove atmosphere.",
            "Psili Ammos, in the south, is notable for its fine sand. Most of the beaches are easily accessible by car; as the island is mountainous, the coastal roads offer scenic views." ] },
          { id: 'history', heading: "History and Culture", body: [
            "Samos was one of the most powerful city-states of antiquity and is the island where two great thinkers — the mathematician Pythagoras and the philosopher Epicurus — were born. The town of Pythagoreio on the southern coast takes its name from Pythagoras and is a UNESCO World Heritage Site; the ancient harbour breakwater, dating from the 6th century BC, is still in use today.",
            "The nearby Temple of Hera (Heraion) was one of the largest sacred sites in the ancient Greek world; of the once-mighty temple with its 155 columns, only a single column remains standing today. Together with Pythagoreio, it is listed as a UNESCO World Heritage Site.",
            "The Eupalinos Tunnel, which forms part of the same UNESCO site, is an ancient aqueduct built in the 6th century BC by tunnelling through Mount Kastro for over a kilometre, and is regarded as one of the most impressive engineering feats of its time." ] },
          { id: 'things-to-do', heading: "What to Do", body: [
            "Samos’s mountain villages are well worth exploring: villages such as Vourliotes and Ampelos are known for their views overlooking the Turkish coast and their centuries-old wine cellars. You can sample the island’s famous Muscat wine right there.",
            "Kokkari, the neoclassical capital Vathi and the green forest roads in the interior offer pleasant routes for exploring by car. For those who enjoy nature walks, the island has plenty of footpaths.",
            "Lovers of ancient heritage can visit the Pythagoreio, the Heraion and the Eupalinos Tunnel in a single day — all are on the southern coast and close to one another." ] },
          { id: 'practical', heading: "Best Time to Visit & Getting There", body: [
            "The ferry service to Samos and the tourist season generally reach their peak between June and September. Although it can be hot in summer, the island’s greenery and wooded areas provide a welcome coolness. The crossing from Kuşadası takes approximately 30–90 minutes, depending on the type of ferry and the port of arrival.",
            "The island is mountainous and has scattered settlements; hiring a car is the most practical way to get around given the distances between beaches, villages and ancient sites. You can book both the ferry and the car together via TravelBeez." ] },
        ],
        faq: [
          { q: "Which ports have ferry services to Samos?", a: "The nearest ferry to Samos departs from Kuşadası; the journey takes approximately 30–90 minutes, depending on the type of ferry and the port of arrival (Vathi or Pythagoreio)." },
          { q: "Do you need a visa to visit Samos?", a: "Samos is an island in the Schengen area of Greece, and a valid visa is generally required for entry. As the rules may change from time to time, you can check the current situation and find the option that suits you best with the TravelBeez visa support team." },
          { q: "Can you visit Samos on a day trip?", a: "Yes, thanks to its proximity to Kuşadası, a day trip is possible; however, we recommend staying at least one night to explore the ancient sites, villages and beaches at your leisure." },
          { q: "What’s the transport like on Samos?", a: "As the island is mountainous and vast, hiring a car is the most flexible option; there are also buses on some routes in the summer." },
          { q: "When is the best time to visit Samos?", a: "June and September: the weather is warm, but the beaches and villages are quieter than during the peak season." },
        ],
      },
      el: {
        intro:
          "Η Σάμος (Σίσαμος), που βρίσκεται απέναντι από το Κουσάντασι, στο σημείο όπου το στενό που τις χωρίζει στενεύει σε μόλις 1,9 χιλιόμετρα, είναι ένα νησί που συνδυάζει τη φύση με την ιστορία, χάρη στα πευκοδάση, τους αμπελώνες και την αρχαία κληρονομιά της. Η Σάμος, πατρίδα του Πυθαγόρα και του Επίκουρου, είναι επίσης γνωστή για τους ήσυχους όρμους της και το περίφημο κρασί Μουσκάτ.",
        sections: [
          { id: 'beaches', heading: "Παραλίες", body: [
            "Η βόρεια ακτή της Σάμου φιλοξενεί τις πιο δημοφιλείς παραλίες της. Η Τσαμάδου, κοντά στο ψαροχώρι Κοκκάρι, με τα κρυστάλλινα νερά της και τους καταπράσινους λόφους στο βάθος, είναι μία από τις πιο δημοφιλείς παραλίες του νησιού· η Λεμονιάκια, ακριβώς δυτικά της, προσφέρει επίσης μια παρόμοια ατμόσφαιρα με βότσαλα και όρμο.",
            "Η Ψιλή Άμμος, στο νότο, ξεχωρίζει για τη λεπτή άμμο της. Στις περισσότερες παραλίες μπορεί κανείς να φτάσει εύκολα με αυτοκίνητο· καθώς το νησί είναι ορεινό, οι παραλιακοί δρόμοι προσφέρουν υπέροχη θέα." ] },
          { id: 'history', heading: "Ιστορία και Πολιτισμός", body: [
            "Η Σάμος ήταν μία από τις ισχυρότερες πόλεις-κράτη της αρχαιότητας και είναι το νησί όπου γεννήθηκαν δύο μεγάλοι στοχαστές — ο μαθηματικός Πυθαγόρας και ο φιλόσοφος Επίκουρος. Η κωμόπολη Πυθαγορείο, στη νότια ακτή, πήρε το όνομά της από τον Πυθαγόρα και αποτελεί Μνημείο Παγκόσμιας Κληρονομιάς της UNESCO· ο αρχαίος λιμενικός μόλος που χρονολογείται από τον 6ο αιώνα π.Χ. χρησιμοποιείται ακόμη και σήμερα.",
            "Ο κοντινός Ναός της Ήρας (Ηραίον) ήταν ένας από τους μεγαλύτερους ιερούς χώρους του αρχαίου ελληνικού κόσμου· από τον τεράστιο ναό που κάποτε είχε 155 κίονες, σήμερα έχει απομείνει μόνο ένας κίονας. Μαζί με το Πυθαγορείο, περιλαμβάνεται στον κατάλογο της UNESCO.",
            "Η σήραγγα του Ευπάλινου, που αποτελεί μέρος της ίδιας περιοχής της UNESCO, είναι ένα αρχαίο υδραγωγείο που κατασκευάστηκε τον 6ο αιώνα π.Χ. διαπερνώντας το όρος Κάστρο σε μήκος άνω του ενός χιλιομέτρου και θεωρείται ένα από τα πιο εντυπωσιακά επιτεύγματα της μηχανικής της εποχής." ] },
          { id: 'things-to-do', heading: "Τι να κάνετε", body: [
            "Τα ορεινά χωριά της Σάμου αξίζουν να τα εξερευνήσετε: χωριά όπως οι Βουρλιώτες και ο Άμπελος είναι γνωστά για τη θέα προς τις ακτές της Τουρκίας και τα αιωνόβια κελάρια κρασιού τους. Μπορείτε να δοκιμάσετε το περίφημο κρασί Μουσκάτ του νησιού απευθείας στην πηγή.",
            "Το Κοκκάρι, η νεοκλασική πρωτεύουσα Βάθι και οι καταπράσινοι δασικοί δρόμοι στο εσωτερικό του νησιού προσφέρουν ευχάριστες διαδρομές για περιήγηση με αυτοκίνητο. Για όσους αγαπούν τις πεζοπορίες στη φύση, το νησί διαθέτει πολλά μονοπάτια.",
            "Όσοι ενδιαφέρονται για την αρχαία κληρονομιά μπορούν να επισκεφθούν το Πυθαγόρειο, το Ηραίο και τη Σήραγγα του Ευπάλινου σε μία μέρα — όλα βρίσκονται στη νότια ακτή και είναι κοντά το ένα στο άλλο." ] },
          { id: 'practical', heading: "Πότε να πάτε & Πώς να φτάσετε", body: [
            "Η Σάμος γνωρίζει τη μεγαλύτερη τουριστική κίνηση κατά τη διάρκεια της τουριστικής περιόδου, που διαρκεί συνήθως από τον Ιούνιο έως τον Σεπτέμβριο. Αν και το καλοκαίρι είναι ζεστό, το πράσινο και τα δασώδη τμήματα του νησιού προσφέρουν δροσιά. Η διαδρομή από το Κουσάντασι διαρκεί περίπου 30–90 λεπτά, ανάλογα με τον τύπο του πλοίου και το λιμάνι προορισμού.",
            "Το νησί είναι ορεινό και οι οικισμοί του είναι διάσπαρτοι· η ενοικίαση αυτοκινήτου είναι ο πιο πρακτικός τρόπος για να καλύψετε τις αποστάσεις μεταξύ παραλιών, χωριών και αρχαιολογικών χώρων. Μπορείτε να κανονίσετε ταυτόχρονα το ακτοπλοϊκό και το αυτοκίνητο μέσω της TravelBeez." ] },
        ],
        faq: [
          { q: "Από πού φεύγουν τα πλοία για τη Σάμο;", a: "Το πλησιέστερο προς τη Σάμο πλοίο αναχωρεί από το Κουσάντασι· η διαδρομή διαρκεί περίπου 30–90 λεπτά, ανάλογα με τον τύπο του πλοίου και τον λιμένα προορισμού (Βάθι ή Πυθαγόρειο)." },
          { q: "Χρειάζεται βίζα για τη Σάμο;", a: "Η Σάμος είναι ένα νησί της Ελλάδας που ανήκει στην περιοχή Σένγκεν και, κατά κανόνα, απαιτείται έγκυρη βίζα για την είσοδο. Δεδομένου ότι οι κανόνες ενδέχεται να αλλάζουν κατά καιρούς, μπορείτε να διευκρινίσετε την τρέχουσα κατάσταση και την επιλογή που σας ταιριάζει με την ομάδα υποστήριξης βίζας της TravelBeez." },
          { q: "Μπορεί κανείς να κάνει ημερήσια εκδρομή στη Σάμο;", a: "Ναι, χάρη στην εγγύτητά του με το Κουσάντασι, είναι δυνατή μια ημερήσια εκδρομή· ωστόσο, για να εξερευνήσετε άνετα τους αρχαιολογικούς χώρους, τα χωριά και τις παραλίες, σας προτείνουμε να μείνετε τουλάχιστον μία νύχτα." },
          { q: "Πώς είναι οι μετακινήσεις στη Σάμο;", a: "Δεδομένου ότι το νησί είναι ορεινό και εκτεταμένο, η ενοικίαση αυτοκινήτου αποτελεί την πιο ευέλικτη επιλογή· το καλοκαίρι, σε ορισμένες διαδρομές, υπάρχουν και λεωφορεία." },
          { q: "Πότε είναι η καλύτερη εποχή για να πάει κανείς στη Σάμο;", a: "Ιούνιος και Σεπτέμβριος: ο καιρός είναι ζεστός, αλλά οι παραλίες και τα χωριά είναι πιο ήσυχα σε σύγκριση με την υψηλή περίοδο." },
        ],
      },
    },
  },

  leros: {
    slug: 'leros',
    heroImage: '/island/Leros.webp',
    facts: { ferryFrom: 'turgutreis', ferryTo: 'leros', region: 'Dodecanese',
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
      en: {
        intro:
          "Situated in the heart of the Dodecanese, between Patmos and Kalymnos, Leros is a peaceful and authentic island, far removed from mass tourism. With its Italian-era architecture, sheltered coves and fishing villages, Leros offers a unique destination for those seeking a tranquil Aegean experience.",
        sections: [
          { id: 'beaches', heading: "Beaches and Coves", body: [
            "Leros is known for its sheltered coves. The beaches of Vromolithos and Agios Georgios, situated around Pandeli Bay, stand out for their crystal-clear waters and tranquil atmosphere; Alinda, to the north, is one of the island’s longest sandy beaches.",
            "As most of the coves are shallow and sheltered from the wind, they are ideal for swimming. The fishing village of Pandeli, with its tavernas and cafés right by the beach, makes for a pleasant stop in the late afternoon." ] },
          { id: 'history', heading: "History and Culture", body: [
            "The most distinctive feature of Leros is its Italian-era architecture. The Italians, who occupied the Dodecanese in 1912, chose Lakki, the island’s largest natural harbour, as their main naval base in the eastern Mediterranean and built a modern town here in the 1930s, naming it ‘Portolago’.",
            "With its wide boulevards and geometric public buildings, Lakki is regarded as the purest and largest example of the Italian Rationalist architectural movement in Greece. Far fewer people live in the town today than the 30,000 originally planned for it; this lends it a distinctive, tranquil atmosphere.",
            "Pandeli Castle, perched on the hill above Platanos, offers a 360-degree view of the bays of Agia Marina and Pandeli, the neighbouring islands and the Aegean Sea." ] },
          { id: 'things-to-do', heading: "What to Do", body: [
            "The highlights of a visit to Leros are its architecture and scenery: strolling amongst the rationalist buildings of Lakki, climbing up to Pandeli Castle to watch the sunset, and seeing the traditional windmills.",
            "The neoclassical charm of Agia Marina and Platanos, with their seaside cafés and fishing piers, makes for a delightful way to spend the day. Villages such as Blefoutis and Xirokampos reveal the island’s tranquil, authentic side.",
            "As the island is small, it is easy to travel from cove to cove; short boat trips to the nearby small islands can also be taken." ] },
          { id: 'practical', heading: "Best Time to Visit & Getting There", body: [
            "Ferries to Leros operate mainly during the summer months. The island’s tranquil character becomes even more pronounced outside the peak season (June and September). The crossing from Turgutreis takes approximately 45–60 minutes, depending on the type of ferry.",
            "Although the island is compact, a car or scooter is a practical way to get around between the villages and coves. You can book your ferry and car hire together via TravelBeez." ] },
        ],
        faq: [
          { q: "Where can I catch a ferry to Leros?", a: "There is a ferry service to Leros via Turgutreis; the journey takes approximately 45–60 minutes, depending on the type of ferry." },
          { q: "Do I need a visa to visit Leros?", a: "Leros is an island in the Schengen area of Greece, and a valid visa is generally required for entry. As the rules may change from time to time, you can check the current situation and find the option that suits you best with the TravelBeez visa support team." },
          { q: "Can you visit Leros on a day trip?", a: "The short journey time makes a day trip possible; however, we recommend staying at least one night to fully experience the island’s tranquil atmosphere and its villages." },
          { q: "What’s the transport like on Leros?", a: "The island is small; a car or scooter is the most practical option for travelling between villages and coves." },
          { q: "Who is Leros suitable for?", a: "Away from the crowds, Leros is the ideal destination for those seeking a peaceful and authentic Aegean experience, as well as an interest in architecture and history." },
        ],
      },
      el: {
        intro:
          "Η Λέρος, που βρίσκεται στο κέντρο των Δωδεκανήσων, ανάμεσα στην Πάτμο και την Κάλυμνο, είναι ένα ήσυχο και αυθεντικό νησί, μακριά από τον μαζικό τουρισμό. Με την αρχιτεκτονική της ιταλικής περιόδου, τους προστατευμένους όρμους και τα ψαροχώρια της, η Λέρος αποτελεί έναν ξεχωριστό προορισμό για όσους αναζητούν μια γαλήνια εμπειρία στο Αιγαίο.",
        sections: [
          { id: 'beaches', heading: "Παραλίες και όρμοι", body: [
            "Η Λέρος είναι γνωστή για τους προστατευμένους όρμους της. Οι παραλίες Βρωμολίθος και Άγιος Γεώργιος, γύρω από τον κόλπο του Πανδέλη, ξεχωρίζουν για τα κρυστάλλινα νερά και την ήρεμη ατμόσφαιρά τους, ενώ η Αλίνδα, στα βόρεια, είναι μία από τις μεγαλύτερες αμμουδιές του νησιού.",
            "Καθώς οι περισσότερες παραλίες είναι ρηχές και προστατευμένες από τον άνεμο, είναι ιδανικές για κολύμπι. Το ψαροχώρι Πανδέλι, με τις ταβέρνες και τα καφέ του δίπλα στην παραλία, αποτελεί μια ευχάριστη στάση για το απόγευμα." ] },
          { id: 'history', heading: "Ιστορία και Πολιτισμός", body: [
            "Το πιο χαρακτηριστικό στοιχείο της Λέρου είναι η αρχιτεκτονική της ιταλικής περιόδου. Οι Ιταλοί, που κατέλαβαν τα Δωδεκάνησα το 1912, επέλεξαν το Λάκκι, το μεγαλύτερο φυσικό λιμάνι του νησιού, ως κύρια ναυτική βάση τους στην ανατολική Μεσόγειο και, τη δεκαετία του 1930, έχτισαν εδώ μια σύγχρονη πόλη με το όνομα «Πορτολάγκο».",
            "Με τις ευρείες λεωφόρους και τα γεωμετρικά δημόσια κτίριά του, το Λάκκι θεωρείται το πιο καθαρό και μεγαλύτερο παράδειγμα του ιταλικού ρασιοναλιστικού αρχιτεκτονικού ρεύματος στην Ελλάδα. Στην πόλη, η οποία είχε σχεδιαστεί για 30.000 κατοίκους, σήμερα ζουν πολύ λιγότεροι άνθρωποι, γεγονός που της προσδίδει μια ιδιαίτερη, ήρεμη ατμόσφαιρα.",
            "Το Κάστρο του Πανδέλη, που υψώνεται στο λόφο πάνω από τον Πλάτανο, προσφέρει πανοραμική θέα 360 μοιρών στους κόλπους της Αγίας Μαρίνας και του Πανδέλη, στα γειτονικά νησιά και στο Αιγαίο." ] },
          { id: 'things-to-do', heading: "Τι να κάνετε", body: [
            "Στη Λέρο, η περιήγηση επικεντρώνεται στην αρχιτεκτονική και το τοπίο: να περπατήσετε ανάμεσα στα ρασιοναλιστικά κτίρια του Λάκκι, να ανεβείτε στο Κάστρο του Πανδέλη για να απολαύσετε το ηλιοβασίλεμα και να δείτε τους παραδοσιακούς ανεμόμυλους.",
            "Το νεοκλασικό περιβάλλον της Αγίας Μαρίνας και του Πλατάνου, με τα παραθαλάσσια καφέ και τις ψαροαποβάθρες, προσφέρει μια ευχάριστη εμπειρία κατά τη διάρκεια της ημέρας. Χωριά όπως το Μπλεφούτις και ο Ξυρόκαμπος αναδεικνύουν την ήσυχη, αυθεντική πλευρά του νησιού.",
            "Επειδή το νησί είναι μικρό, η περιήγηση από κόλπο σε κόλπο είναι εύκολη· μπορεί κανείς επίσης να κάνει σύντομες εκδρομές με σκάφος στα γύρω μικρά νησιά." ] },
          { id: 'practical', heading: "Πότε να πάτε & Πώς να φτάσετε", body: [
            "Τα δρομολόγια των πλοίων προς τη Λέρο και η τουριστική περίοδος συγκεντρώνονται γενικά στους καλοκαιρινούς μήνες. Ο ήρεμος χαρακτήρας του νησιού γίνεται ακόμη πιο εμφανής εκτός της υψηλής περιόδου (Ιούνιος, Σεπτέμβριος). Η διαδρομή από το Τουργουτρέις διαρκεί περίπου 45–60 λεπτά, ανάλογα με τον τύπο του πλοίου.",
            "Αν και το νησί είναι μικρό, το αυτοκίνητο ή το σκούτερ είναι πρακτικά μέσα μεταφοράς για τις μετακινήσεις μεταξύ των χωριών και των κολπίσκων. Μπορείτε να οργανώσετε ταυτόχρονα το ακτοπλοϊκό δρομολόγιο και την ενοικίαση αυτοκινήτου μέσω της TravelBeez." ] },
        ],
        faq: [
          { q: "Από πού φεύγει το πλοίο για τη Λέρο;", a: "Υπάρχει ακτοπλοϊκή σύνδεση με τη Λέρο μέσω του Τουργουτρέις· η διαδρομή διαρκεί περίπου 45–60 λεπτά, ανάλογα με τον τύπο του πλοίου." },
          { q: "Χρειάζεται βίζα για τη Λέρο;", a: "Η Λέρος είναι ένα νησί της Ελλάδας που ανήκει στην περιοχή Σένγκεν και, κατά κανόνα, απαιτείται έγκυρη βίζα για την είσοδο. Δεδομένου ότι οι κανόνες ενδέχεται να αλλάζουν κατά καιρούς, μπορείτε να διευκρινίσετε την τρέχουσα κατάσταση και την επιλογή που σας ταιριάζει με την ομάδα υποστήριξης βίζας της TravelBeez." },
          { q: "Μπορεί κανείς να κάνει ημερήσια εκδρομή στη Λέρο;", a: "Η σύντομη διάρκεια της διαδρομής καθιστά δυνατή μια ημερήσια εκδρομή· ωστόσο, για να απολαύσετε όπως πρέπει την ήρεμη ατμόσφαιρα του νησιού και τα χωριά του, σας προτείνουμε να μείνετε τουλάχιστον μία νύχτα." },
          { q: "Πώς είναι οι μετακινήσεις στη Λέρο;", a: "Το νησί είναι μικρό· για τις μετακινήσεις μεταξύ χωριών και όρμων, το αυτοκίνητο ή το σκούτερ είναι η πιο πρακτική επιλογή." },
          { q: "Σε ποιους απευθύνεται η Λέρος;", a: "Η Λέρος αποτελεί τον ιδανικό προορισμό για όσους αναζητούν μια ήσυχη και αυθεντική εμπειρία στον Αιγαίο, μακριά από τα πλήθη, καθώς και για όσους ενδιαφέρονται για την αρχιτεκτονική και την ιστορία." },
        ],
      },
    },
  },

  patmos: {
    slug: 'patmos',
    heroImage: '/island/Patmos.webp',
    facts: { ferryFrom: 'kusadasi', ferryTo: 'patmos', region: 'Dodecanese',
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
      en: {
        intro:
          "Patmos, considered sacred by Christians, is the island where Saint John is believed to have written his Gospel and the Book of Revelation (Apocalypse). With its UNESCO-protected monastery, the Cave of the Apocalypse and the whitewashed village of Chora, Patmos is both a centre of pilgrimage and a destination for those seeking tranquillity.",
        sections: [
          { id: 'beaches', heading: "Beaches", body: [
            "Patmos’s most iconic beach is Psili Ammos, situated in a secluded cove in the south-west; it is known for its fine golden sand and turquoise waters, and is usually reached by water taxis departing from Skala or by a short walk.",
            "Grikos is the island’s longest beach; with its sand, clear water and facilities, it is ideal for families. The beach right next to the harbour town of Skala, whilst shallow and convenient, can get crowded during the high season." ] },
          { id: 'history', heading: "History and Culture", body: [
            "The heart of Patmos is the Monastery of St John, situated at the island’s highest point; founded in 1088, the monastery, with its towers and battlements, resembles a fortress and houses valuable manuscripts and icons.",
            "The Cave of the Apocalypse, situated on the road between Chora and Skala, is, according to tradition, the place where Saint John received his revelations. The monastery, the cave and the historic centre of Chora were jointly designated as a UNESCO World Heritage Site in 1999.",
            "Chora, situated around the monastery, is one of the Aegean’s most beautifully preserved medieval towns, with its whitewashed cube-shaped houses, narrow stone streets impassable to vehicles, and views of the sea from every corner." ] },
          { id: 'things-to-do', heading: "What to Do", body: [
            "The island’s spiritual itinerary is clear: first the Cave of the Apocalypse, then St John’s Monastery on the hilltop. During the visit, care is taken to observe the etiquette of this sacred site regarding dress and silence.",
            "Walking through Chora’s cobbled streets and wandering amongst the courtyards and monastery walls is an experience in itself. Skala harbour, meanwhile, is the island’s liveliest spot: cafés, fishing boats and the departure point for water taxis.",
            "For those who love exploring by sea, boat or water taxi tours to secluded coves such as Psili Ammos are the most enjoyable way to discover the island’s tranquil coastline." ] },
          { id: 'practical', heading: "Best Time to Visit & Getting There", body: [
            "Ferries to Patmos operate mainly during the summer months, particularly between June and September. The island’s peaceful atmosphere is even more pronounced outside the peak season. The crossing from Kuşadası takes approximately 2 hours and 15 minutes, depending on the type of ferry.",
            "The island is small; you can use a car, scooter or water taxi to get between Skala, Chora and the beaches. You can book both the ferry and car hire together via TravelBeez." ] },
        ],
        faq: [
          { q: "Where can I catch a ferry to Patmos?", a: "Patmos can be reached via services from Kuşadası; the crossing takes approximately 2 hours and 15 minutes, depending on the type of ferry." },
          { q: "Do you need a visa to visit Patmos?", a: "Patmos is an island in the Schengen area of Greece, and a valid visa is generally required for entry. As the rules may change from time to time, you can check the current situation and find the option that suits you best with the TravelBeez visa support team." },
          { q: "Is it possible to visit Patmos on a day trip?", a: "Although a day trip is possible, we recommend staying at least one night to explore the monastery, the cave and Chora at your leisure and to soak up the island’s tranquillity." },
          { q: "What should you bear in mind when visiting the monastery and the cave?", a: "These are sacred places; visitors are expected to wear appropriate clothing that covers the shoulders and knees and to remain silent. Visiting hours may vary depending on the season." },
          { q: "When is the best time to visit Patmos?", a: "June and September; the weather is pleasant, and there are fewer crowds than during the peak season." },
        ],
      },
      el: {
        intro:
          "Η Πάτμος, που θεωρείται ιερή για τον Χριστιανισμό, είναι το νησί όπου πιστεύεται ότι ο Άγιος Ιωάννης συνέγραψε το Ευαγγέλιο και την Αποκάλυψη. Με το μοναστήρι της που βρίσκεται υπό την προστασία της UNESCO, το Σπήλαιο της Αποκάλυψης και το ασβεστωμένο χωριό Χώρα, η Πάτμος αποτελεί τόσο κέντρο προσκυνήματος όσο και προορισμό για όσους αναζητούν ηρεμία και γαλήνη.",
        sections: [
          { id: 'beaches', heading: "Παραλίες", body: [
            "Η πιο εμβληματική παραλία της Πάτμου είναι η Ψιλή Άμμος, που βρίσκεται σε έναν ερημικό όρμο στα νοτιοδυτικά· είναι γνωστή για τη λεπτή χρυσή άμμο και τα τυρκουάζ νερά της, και συνήθως προσεγγίζεται με θαλάσσια ταξί που αναχωρούν από τη Σκάλα ή με ένα σύντομο περίπατο.",
            "Η παραλία Γκρίκος είναι η μεγαλύτερη του νησιού· με την άμμο, τα κρυστάλλινα νερά και τις παροχές της, είναι ιδανική για οικογένειες. Η παραλία που βρίσκεται ακριβώς δίπλα στο λιμανάκι της Σκάλας, αν και ρηχή και βολική, μπορεί να είναι πολυσύχναστη κατά την υψηλή περίοδο." ] },
          { id: 'history', heading: "Ιστορία και Πολιτισμός", body: [
            "Η καρδιά της Πάτμου είναι το Μοναστήρι του Αγίου Ιωάννη, που βρίσκεται στο υψηλότερο σημείο του νησιού. Το μοναστήρι, που ιδρύθηκε το 1088, μοιάζει σχεδόν με φρούριο με τους πύργους και τις πολεμίστρες του, ενώ φιλοξενεί πολύτιμα χειρόγραφα και εικόνες.",
            "Το Σπήλαιο της Αποκάλυψης, που βρίσκεται στο δρόμο μεταξύ Χώρας και Σκάλας, είναι, σύμφωνα με την παράδοση, ο τόπος όπου ο Άγιος Ιωάννης έλαβε τις αποκαλύψεις του. Το μοναστήρι, το σπήλαιο και το ιστορικό κέντρο της Χώρας ανακηρύχθηκαν από κοινού Μνημείο Παγκόσμιας Κληρονομιάς της UNESCO το 1999.",
            "Η Χώρα, που εκτείνεται γύρω από το μοναστήρι, με τα λευκά, ασβεστωμένα κυβόσχημα σπίτια της, τα στενά πέτρινα δρομάκια όπου δεν μπορούν να περάσουν αυτοκίνητα και τις θέες προς τη θάλασσα που ανοίγονται από κάθε γωνιά της, είναι ένα από τα πιο όμορφα και καλοδιατηρημένα μεσαιωνικά χωριά του Αιγαίου." ] },
          { id: 'things-to-do', heading: "Τι να κάνετε", body: [
            "Η πνευματική διαδρομή του νησιού είναι σαφής: πρώτα το Σπήλαιο της Αποκάλυψης, και στη συνέχεια το Μοναστήρι του Αγίου Ιωάννη στην κορυφή. Κατά τη διάρκεια της επίσκεψης, τηρούνται οι κανόνες συμπεριφοράς που ισχύουν στους ιερούς χώρους όσον αφορά την ενδυμασία και τη σιωπή.",
            "Το να περπατάς στα πέτρινα δρομάκια της Χώρας, να περιπλανιέσαι ανάμεσα στις αυλές και τα τείχη των μοναστηριών, είναι από μόνο του μια μοναδική εμπειρία. Το λιμάνι της Σκάλας, από την άλλη, είναι η ζωντανή πλευρά του νησιού: καφετέριες, ψαρόβαρκες και σημείο αναχώρησης των θαλάσσιων ταξί.",
            "Για όσους αγαπούν τις θαλάσσιες εξορμήσεις, οι εκδρομές με σκάφος ή θαλάσσιο ταξί σε ερημικούς όρμους όπως η Ψιλή Άμμος αποτελούν τον πιο απολαυστικό τρόπο για να εξερευνήσουν τις ήσυχες ακτές του νησιού." ] },
          { id: 'practical', heading: "Πότε να πάτε & Πώς να φτάσετε", body: [
            "Τα δρομολόγια προς την Πάτμο πραγματοποιούνται κυρίως τους καλοκαιρινούς μήνες, ειδικά από τον Ιούνιο έως τον Σεπτέμβριο. Η γαλήνια ατμόσφαιρα του νησιού είναι ακόμη πιο έντονη εκτός της υψηλής περιόδου. Η διαδρομή από το Κουσάντασι διαρκεί περίπου 2 ώρες και 15 λεπτά, ανάλογα με τον τύπο του πλοίου.",
            "Το νησί είναι μικρό· για τις μετακινήσεις μεταξύ Σκάλα, Χώρα και των παραλιών χρησιμοποιούνται αυτοκίνητα, σκούτερ ή θαλάσσια ταξί. Μπορείτε να κανονίσετε ταυτόχρονα το ακτοπλοϊκό εισιτήριο και την ενοικίαση αυτοκινήτου μέσω της TravelBeez." ] },
        ],
        faq: [
          { q: "Από πού φεύγει το πλοίο για την Πάτμο;", a: "Η Πάτμος είναι προσβάσιμη με δρομολόγια που συνδέονται με το Κουσάντασι· η διαδρομή διαρκεί περίπου 2 ώρες και 15 λεπτά, ανάλογα με τον τύπο του πλοίου." },
          { q: "Χρειάζεται βίζα για την Πάτμο;", a: "Η Πάτμος είναι ένα νησί της Ελλάδας που ανήκει στην περιοχή Σένγκεν και, κατά κανόνα, απαιτείται έγκυρη βίζα για την είσοδο. Δεδομένου ότι οι κανόνες ενδέχεται να αλλάζουν κατά καιρούς, μπορείτε να διευκρινίσετε την τρέχουσα κατάσταση και την επιλογή που σας ταιριάζει με την ομάδα υποστήριξης βίζας της TravelBeez." },
          { q: "Μπορεί κανείς να κάνει ημερήσια εκδρομή στην Πάτμο;", a: "Αν και είναι δυνατή μια ημερήσια εκδρομή, σας προτείνουμε να μείνετε τουλάχιστον μία νύχτα, για να περιηγηθείτε με ηρεμία στο μοναστήρι, το σπήλαιο και τη Χώρα και να απολαύσετε την ηρεμία του νησιού." },
          { q: "Τι πρέπει να προσέξουμε κατά την επίσκεψη στο μοναστήρι και στο σπήλαιο;", a: "Πρόκειται για ιερούς χώρους· απαιτείται η τήρηση σιωπής και η χρήση κατάλληλης ενδυμασίας που να καλύπτει τους ώμους και τα γόνατα. Οι ώρες επίσκεψης ενδέχεται να διαφέρουν ανάλογα με την εποχή." },
          { q: "Πότε είναι η καλύτερη εποχή για να επισκεφθεί κανείς την Πάτμο;", a: "Ιούνιος και Σεπτέμβριος: ο καιρός είναι καλός, ενώ ο κόσμος είναι λιγότερος σε σύγκριση με την υψηλή περίοδο." },
        ],
      },
    },
  },
}

export const ISLAND_SLUGS = Object.keys(ISLANDS)  // generateStaticParams kaynağı
