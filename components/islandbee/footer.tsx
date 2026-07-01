import { Link } from '@/i18n/routing'
import Image from 'next/image'
import { SERVICE_ROUTES, type ServiceKey } from '@/lib/services'
import {
  Ship,
  Compass,
  FileText,
  Phone,
  Mail,
  MapPin,
  BadgeCheck,
  Clock,
  MessageCircle,
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { buildWhatsAppLink, getWhatsAppDisplay, getLandline } from '@/lib/contact'

export function Footer() {
  const t = useTranslations('footer')
  const tHeader = useTranslations('header')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const landline = getLandline()
  const year = new Date().getFullYear()

  // Servis kolonu — header/grid ile aynı tek kaynak. Etiketler header
  // namespace'inden (tHeader). Canlı: ferry/araç/transfer/sigorta/vize;
  // "yakında": tur/paket.
  const serviceLinks: { key: ServiceKey; labelKey: string }[] = [
    { key: 'ferry', labelKey: 'ferryTickets' },
    { key: 'carRental', labelKey: 'carRental' },
    { key: 'transfer', labelKey: 'transfer' },
    { key: 'insurance', labelKey: 'insurance' },
    { key: 'visa', labelKey: 'visaSupport' },
    { key: 'tours', labelKey: 'tours' },
    { key: 'packagePickup', labelKey: 'packagePickup' },
  ]

  return (
    <footer className="w-full bg-foreground text-background">
      <div className="container px-4 md:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 mb-10">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-5">
              <Image
                src="/travelbeez-icon.webp"
                alt=""
                width={512}
                height={512}
                className="h-9 w-auto"
              />
              <span className="text-xl font-bold text-background">TravelBeez</span>
            </div>

            <p className="text-background/70 text-sm mb-4 leading-relaxed">
              {t('tagline')}
            </p>

            <div className="flex flex-col gap-3 text-sm text-background/70 mb-5">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-background font-medium">{t('addressLine1')}</span>
                  <p className="text-xs text-background/60">G. Averos 4, under Achilleas Hotel & Apartments</p>
                  <p className="text-xs text-primary">First shop at Kos Port exit</p>
                </div>
              </div>

              <a
                href={landline.href}
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Phone className="h-4 w-4 text-primary" />
                <span>{landline.display}</span>
              </a>

              <a
                href={buildWhatsAppLink(locale)}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                <span>WhatsApp: {getWhatsAppDisplay(locale)}</span>
              </a>

              <a
                href="mailto:info@travelbeez.gr"
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4 text-primary" />
                <span>info@travelbeez.gr</span>
              </a>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>{t('openHours')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-background/60">
              <BadgeCheck className="h-4 w-4 text-primary" />
              <span>{t('licenseLine')}</span>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Ship className="h-4 w-4 text-primary" />
              {t('services')}
            </h3>
            <ul className="space-y-2.5 text-sm text-background/70">
              {serviceLinks.map((item) => {
                const { href, disabled } = SERVICE_ROUTES[item.key]
                if (disabled) {
                  return (
                    <li key={item.key}>
                      <span
                        aria-disabled="true"
                        className="flex items-center gap-1.5 text-background/40 cursor-not-allowed"
                      >
                        {tHeader(item.labelKey)}
                        <span className="rounded-full bg-background/10 px-1.5 py-0.5 text-[10px] font-medium text-background/60">
                          {tCommon('comingSoon')}
                        </span>
                      </span>
                    </li>
                  )
                }
                return (
                  <li key={item.key}>
                    <Link href={href} className="hover:text-primary transition-colors">
                      {tHeader(item.labelKey)}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Islands */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              Islands
            </h3>
            <ul className="space-y-2.5 text-sm text-background/70">
              <li>Kos</li>
              <li>Rhodes</li>
              <li>Samos</li>
              <li>Leros</li>
              <li>Patmos</li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {t('support')}
            </h3>
            <ul className="space-y-2.5 text-sm text-background/70">
              <li><Link href="/contact" className="hover:text-primary transition-colors">{t('contactSection')}</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">{t('terms')}</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">{t('privacy')}</Link></li>
            </ul>
          </div>
        </div>

        {/* Google Maps Embed */}
        <div className="mb-8 rounded-xl overflow-hidden border border-background/10">
          <iframe
            src="https://www.google.com/maps?q=36.897895,27.287188&z=17&output=embed"
            width="100%"
            height="200"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="TravelBeez Kos Office Location"
            className="grayscale hover:grayscale-0 transition-all duration-300"
          />
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-background/50 text-center md:text-left">
            <p>&copy; {year} {t('operatingAs')}. {t('rightsReserved')}.</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-background/50">
            <Link href="/terms" className="hover:text-primary transition-colors">
              {t('terms')}
            </Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">
              {t('privacy')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
