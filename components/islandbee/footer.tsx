import { Link } from '@/i18n/routing'
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
import { useTranslations } from 'next-intl'

export function Footer() {
  const t = useTranslations('footer')
  const tHeader = useTranslations('header')
  const year = new Date().getFullYear()

  return (
    <footer className="w-full bg-foreground text-background">
      <div className="container px-4 md:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 mb-10">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-5">
              <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">B</span>
              </div>
              <span className="text-xl font-bold">
                Travel<span className="text-primary">Beez</span>
              </span>
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
                href="tel:+302242050009"
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Phone className="h-4 w-4 text-primary" />
                <span>+30 22420 5009</span>
              </a>

              <a
                href="https://wa.me/302242050008"
                target="_blank"
                rel="noopener"
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                <span>WhatsApp: +30 22420 5008</span>
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
              <li><Link href="/ferry" className="hover:text-primary transition-colors">{tHeader('ferryTickets')}</Link></li>
              <li><Link href="/car-rental" className="hover:text-primary transition-colors">{tHeader('carRental')}</Link></li>
              <li><Link href="/tours" className="hover:text-primary transition-colors">{tHeader('tours')}</Link></li>
              <li><Link href="/visa" className="hover:text-primary transition-colors">{tHeader('visaSupport')}</Link></li>
              <li><Link href="/package-pickup" className="hover:text-primary transition-colors">{tHeader('packagePickup')}</Link></li>
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
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3178.8!2d27.0917!3d36.8933!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzbCsDUzJzM1LjkiTiAyN8KwMDUnMzAuMSJF!5e0!3m2!1sen!2sgr!4v1699999999999!5m2!1sen!2sgr"
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
