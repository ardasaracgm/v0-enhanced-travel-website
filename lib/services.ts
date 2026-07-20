// lib/services.ts
//
// Tek kaynak: hangi servis route'u CANLI, hangisi "yakında". Header nav,
// anasayfa services grid ve iki footer href + disabled bilgisini buradan okur;
// böylece link-aktivasyon kararı tek yerde durur. Her yüzey kendi label/ikon
// render'ını korur (etiketler üç i18n namespace'ine dağılı; grid'in ayrıca
// ikon + açıklaması var) — yalnızca routing kararı merkezîleşir.

export type ServiceKey =
  | "ferry"
  | "carRental"
  | "insurance"
  | "transfer"
  | "visa"
  | "tours"
  | "events"
  | "packagePickup"
  | "contact";

export interface ServiceRoute {
  href: string;
  /** true → tıklanamaz "Yakında" olarak render (common.comingSoon). */
  disabled: boolean;
  /** true → header nav'da hiç gösterme (yakında ama gizli). Diğer yüzeyler
   *  (grid/footer) isterse yok sayabilir; şimdilik yalnız header okur. */
  hidden?: boolean;
}

export const SERVICE_ROUTES: Record<ServiceKey, ServiceRoute> = {
  ferry:         { href: "/ferry",          disabled: false },
  carRental:     { href: "/car-rental",     disabled: false },
  insurance:     { href: "/insurance",      disabled: false },
  transfer:      { href: "/transfer",       disabled: false },
  visa:          { href: "/visa",           disabled: false },
  tours:         { href: "/tours",          disabled: true, hidden: true },
  events:        { href: "/events",         disabled: true, hidden: true },
  packagePickup: { href: "/package-pickup", disabled: false },
  contact:       { href: "/contact",        disabled: false },
};
