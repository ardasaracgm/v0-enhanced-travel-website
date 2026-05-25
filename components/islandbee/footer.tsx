import Link from 'next/link'
import { Ship, Car, Compass, FileText, Phone, Mail, MapPin, BadgeCheck, Clock, Package } from 'lucide-react'

export function Footer() {
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
              <span className="text-xl font-bold">Travel<span className="text-primary">Beez</span></span>
            </div>
            <p className="text-background/70 text-sm mb-4 leading-relaxed">
              Your trusted partner for Greek island travel. Licensed travel agency with physical office at Kos Port.
            </p>
            <div className="flex flex-col gap-3 text-sm text-background/70 mb-5">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-background font-medium">G Averos 4, Kos, Greece</span>
                  <p className="text-xs text-background/60">Under Achilleas Hotel & Apartments</p>
                  <p className="text-xs text-primary">First shop at Kos Port exit</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <span>+30 22420 50008</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#25D366]" />
                <span>WhatsApp: +30 22420 50008</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span>info@travelbeez.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>Open daily 08:00 - 20:00</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-background/60">
              <BadgeCheck className="h-4 w-4 text-primary" />
              <span>Greek Tourism License: MH.T.E. 1471E60000074600</span>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Ship className="h-4 w-4 text-primary" />
              Services
            </h3>
            <ul className="space-y-2.5 text-sm text-background/70">
              <li><Link href="/ferry" className="hover:text-primary transition-colors">Ferry Tickets</Link></li>
              <li><Link href="/car-rental" className="hover:text-primary transition-colors">Car Rental</Link></li>
              <li><Link href="/tours" className="hover:text-primary transition-colors">Island Tours</Link></li>
              <li><Link href="/visa" className="hover:text-primary transition-colors">Visa Support</Link></li>
              <li><Link href="/package-pickup" className="hover:text-primary transition-colors">Package Pickup</Link></li>
            </ul>
          </div>

          {/* Islands */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              Islands
            </h3>
            <ul className="space-y-2.5 text-sm text-background/70">
              <li><Link href="#" className="hover:text-primary transition-colors">Kos Island</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Rhodes Island</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Samos Island</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Leros Island</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Patmos Island</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Support
            </h3>
            <ul className="space-y-2.5 text-sm text-background/70">
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Cancellation Policy</Link></li>
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
            <p>&copy; {new Date().getFullYear()} FerryBee Travel IKE - operating as TravelBeez. All rights reserved.</p>
            <p className="text-xs mt-1">Greek Tourism License: MH.T.E. 1471E60000074600</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-background/50">
            <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <div className="flex items-center gap-3">
              <span>Payments:</span>
              <span>Visa</span>
              <span>Mastercard</span>
              <span>TROY</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
