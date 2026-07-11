// Ferry voucher terms — TR + EN aynı belgede (locale-bağımsız sabit), Dentur
// voucher'ıyla BİREBİR (kullanıcı: "değişiklik yok"). Değerler Dentur voucher'ından:
// check-in 30 dk, açık bilet 12 ay, aynı-gün 21:00 iadesi. Bilerek sabit constant
// (companion-invite footer deseni) — voucher iki dili aynı anda basar.
export const FERRY_VOUCHER_TERMS = {
  title: { tr: 'Koşullar', en: 'Terms & Conditions' },
  clauses: [
    {
      tr: 'Yolcular, kalkıştan 30 dakika önce check-in için limanda hazır bulunmalıdır.',
      en: 'Passengers must be at the port for check-in 30 minutes before departure.',
    },
    {
      tr: 'Sefere gelmeyen yolculara ücret iadesi yapılmaz. Olumsuz hava koşulları veya teknik arıza nedeniyle iptal edilen seferlerde ücret iadesi yapılır. İade yalnızca bileti düzenleyen acente tarafından yapılır. Aynı gün seferler için saat 21:00’e kadar tam iade yapılır.',
      en: 'No refund is given to passengers who do not show up. Refunds are given for voyages cancelled due to adverse weather or technical failure. Refunds are made only by the agency that issued the ticket. Full refund is available until 21:00 for same-day voyages.',
    },
    {
      tr: 'Gemi ve yolcular sigortalıdır. Patlayıcı, yanıcı ve yasaklı maddelerin taşınması yasaktır. Yaş kategorileri: bebek 0-6 yaş, çocuk 7-12 yaş.',
      en: 'The vessel and passengers are insured. Carrying explosive, flammable or prohibited materials is forbidden. Age categories: infant 0-6 years, child 7-12 years.',
    },
    {
      tr: 'Açık biletler 12 ay geçerlidir. Açık bilet tutarı yeni bilet fiyatından düşülür; fazla ise iade edilmez, düşük ise fark tahsil edilir. Biletler, kalkışa 12 saat kalaya kadar açık bilete çevrilebilir.',
      en: 'Open tickets are valid for 12 months. The open-ticket amount is deducted from the new ticket price; any excess is non-refundable, any shortfall is collected. Tickets may be converted to open tickets up to 12 hours before departure.',
    },
    {
      tr: 'Kalkışa 12 saatten az kalan, indirimli ve açık biletle alınmış biletler açık bilete çevrilemez.',
      en: 'Tickets within 12 hours of departure, discounted tickets, and tickets purchased with an open ticket cannot be converted to open tickets.',
    },
    {
      tr: 'Saat 21:00’den sonra, check-in tamamlanmış, indirimli, açık bilete çevrilmiş ve açık biletle alınmış biletler iade edilmez.',
      en: 'Tickets after 21:00, with completed check-in, discounted, converted to an open ticket, or purchased with an open ticket, are non-refundable.',
    },
    {
      tr: 'Mesafeli satış sözleşmesi ve tüm koşullar için: travelbeez.gr',
      en: 'Distance sales agreement and full terms: travelbeez.gr',
    },
  ],
} as const
